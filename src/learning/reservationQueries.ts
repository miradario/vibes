import { useQuery } from "@tanstack/react-query";
import { useAuthSession } from "../auth/auth.queries";
import { useClasesEnabled } from "../featureFlags/useClasesEnabled";
import { supabase } from "../lib/supabase";
import type { ReservationRequest } from "./reservations";
export function useReservationRequests() {
  const { data: session } = useAuthSession();
  const enabled = useClasesEnabled();
  return useQuery({
    queryKey: ["learning", session?.user.id, "reservations"],
    enabled: enabled && !!session?.user.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("learning_reservation_requests").select("*").eq("user_id", session!.user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as ReservationRequest[];
    },
    staleTime: 15000,
  });
}
