import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { useAuthSession } from "../auth/auth.queries";
import { useSesionesEnabled } from "../featureFlags/useSesionesEnabled";
import { supabase } from "../lib/supabase";
import { withBootTimeout } from "../lib/startupBoot";
import { dayStartISO, isPaymentHold, sessionDay, sessionReturnUrl, type SessionPaymentMethod } from "./sessions";
import {
  bookSession, cancelSession, setSessionPaymentMethod, loadOrganizerAvailability, loadOrganizerContact, loadServicePricing, loadStudentSessions,
  requestCheckoutUrl, reserveSession, respondToSession, type RpcClient,
} from "./sessionsApi";

const client: RpcClient = { rpc: (name, args) => supabase.rpc(name, args) };
// Web portal that serves /api/portal/appointment-checkout (vibes-web).
export const PORTAL_URL = process.env.EXPO_PUBLIC_PORTAL_URL || "https://vibes.gurudevelopers.dev";

export const sessionKeys = {
  all: ["sessions"] as const,
  mine: (userId?: string) => ["sessions", "mine", userId ?? "anonymous"] as const,
  organizer: (organizerId: string) => ["sessions", "organizer", organizerId] as const,
  contact: (organizerId: string) => ["sessions", "contact", organizerId] as const,
  pricing: (organizerId: string) => ["sessions", "pricing", organizerId] as const,
};

export function useStudentSessions() {
  const { data: session } = useAuthSession();
  const enabled = useSesionesEnabled();
  return useQuery({
    queryKey: sessionKeys.mine(session?.user.id),
    enabled: enabled && !!session?.user.id,
    queryFn: () => withBootTimeout(loadStudentSessions(client), 15000, "student sessions"),
    staleTime: 15000,
    retry: 1,
    // While a Mercado Pago hold waits for the webhook, poll so it flips to confirmed (or released).
    refetchInterval: (query) => (query.state.data?.sessions.some(isPaymentHold) ? 5000 : false),
  });
}

export function useOrganizerAvailability(organizerId: string | undefined) {
  const { data: session } = useAuthSession();
  const enabled = useSesionesEnabled();
  return useQuery({
    queryKey: sessionKeys.organizer(organizerId ?? ""),
    enabled: enabled && !!organizerId && !!session?.user.id,
    queryFn: () => withBootTimeout(loadOrganizerAvailability(client, organizerId!, dayStartISO(sessionDay(Date.now()))), 15000, "organizer availability"),
    staleTime: 15000,
    retry: 1,
  });
}

export function useOrganizerContact(organizerId: string | undefined) {
  const { data: session } = useAuthSession();
  const enabled = useSesionesEnabled();
  return useQuery({
    queryKey: sessionKeys.contact(organizerId ?? ""),
    enabled: enabled && !!organizerId && !!session?.user.id,
    queryFn: () => loadOrganizerContact(client, organizerId!),
    staleTime: 5 * 60000,
    retry: false,
  });
}

export function useServicePricing(organizerId: string | undefined) {
  const { data: session } = useAuthSession();
  const enabled = useSesionesEnabled();
  return useQuery({
    queryKey: sessionKeys.pricing(organizerId ?? ""),
    enabled: enabled && !!organizerId && !!session?.user.id,
    queryFn: () => withBootTimeout(loadServicePricing(client, organizerId!), 15000, "service pricing"),
    staleTime: 15000,
    retry: 1,
  });
}

type SessionAction =
  | { action: "reserve"; organizerId: string; availabilityId: string; startsAt: string; duration: number }
  | { action: "book"; availabilityId: string; startsAt: string; duration: number; paymentMethod: SessionPaymentMethod | null }
  | { action: "set_payment_method"; id: string; paymentMethod: SessionPaymentMethod }
  | { action: "cancel"; id: string }
  | { action: "accept"; id: string }
  | { action: "decline"; id: string };

export function useSessionMutation() {
  const queryClient = useQueryClient();
  const enabled = useSesionesEnabled();
  return useMutation({
    mutationFn: async (input: SessionAction) => {
      if (!enabled) throw new Error("LEARNING_DISABLED");
      const run = () => {
        switch (input.action) {
          case "reserve": return reserveSession(client, input.organizerId, input.availabilityId, input.startsAt, input.duration);
          case "book": return bookSession(client, input.availabilityId, input.startsAt, input.duration, input.paymentMethod);
          case "set_payment_method": return setSessionPaymentMethod(client, input.id, input.paymentMethod);
          case "cancel": return cancelSession(client, input.id);
          default: return respondToSession(client, input.id, input.action);
        }
      };
      return await withBootTimeout(Promise.resolve(run()), 15000, "session action");
    },
    retry: false,
    onSettled: () => queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
  });
}

/** Opens the Mercado Pago web checkout (facilitator's account) and refreshes the session when it closes. */
export function useSessionCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, bookingId }: { orderId: string; bookingId: string }) => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Iniciá sesión nuevamente para continuar con el pago.");
      const url = await requestCheckoutUrl(fetch, PORTAL_URL, token, orderId);
      // Mercado Pago's back_urls point at com.gurudevelopers.vibes://session/<id>: the auth session
      // closes on that redirect and the student is back on the session detail. If the portal still
      // returns to the web, the student closes the browser and we refresh the same way.
      await WebBrowser.openAuthSessionAsync(url, sessionReturnUrl(bookingId));
    },
    retry: false,
    // The payment is credited by the webhook; the return URL never marks it as paid.
    onSettled: () => queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
  });
}

export type Professional = {
  id: string;
  kind: "teacher" | "place";
  name: string;
  description: string;
  specialties: string[];
  image_url: string | null;
  location: string;
  modality: string;
  published: boolean;
  approved?: boolean;
};

/** All published and approved learning profiles, with or without availability. */
export function useProfessionals() {
  const { data: session } = useAuthSession();
  const enabled = useSesionesEnabled();
  return useQuery({
    queryKey: ["sessions", "professionals", session?.user.id ?? "anonymous"] as const,
    enabled: enabled && !!session?.user.id,
    queryFn: async () => {
      const { data, error } = await withBootTimeout(
        Promise.resolve(supabase.from("learning_profiles").select("id,kind,name,description,specialties,image_url,location,modality,published,approved").eq("published", true).eq("approved", true).order("name").limit(500)),
        15000,
        "professionals"
      );
      if (error) throw error;
      return (data ?? []) as Professional[];
    },
    staleTime: 60000,
    retry: 1,
  });
}
