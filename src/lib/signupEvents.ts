import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { isSupabaseConfigured, supabase } from "./supabase";

// Signup funnel tracking (public.signup_events, read by the backoffice
// "Análisis › Registro" tab). Fire-and-forget: never throws, never blocks UI.
// No PII: only event names, step ids and coarse props.

export type SignupEventName =
  | "welcome_viewed"
  | "signup_started"
  | "age_confirmed"
  | "signup_method_selected"
  | "account_created"
  | "signup_failed"
  | "onboarding_step_viewed"
  | "onboarding_step_completed"
  | "onboarding_completed"
  | "onboarding_failed"
  | "first_home_viewed";

export type SignupMethod = "email" | "google" | "apple";

type SignupEventInput = {
  step?: string;
  stepIndex?: number;
  props?: Record<string, string | number | boolean | null>;
};

const INSTALL_ID_KEY = "vibes.analytics.installId";
let installIdPromise: Promise<string> | null = null;

export const getInstallId = () => {
  if (!installIdPromise) {
    installIdPromise = (async () => {
      try {
        const existing = await AsyncStorage.getItem(INSTALL_ID_KEY);
        if (existing) return existing;
      } catch {
        // fall through and generate a new one
      }
      const created = Crypto.randomUUID();
      try {
        await AsyncStorage.setItem(INSTALL_ID_KEY, created);
      } catch {
        // keep it in memory for this session
      }
      return created;
    })();
  }
  return installIdPromise;
};

const send = async (event: SignupEventName, input: SignupEventInput, userIdOverride?: string) => {
  if (!isSupabaseConfigured) return;
  try {
    const installId = await getInstallId();
    let userId = userIdOverride ?? null;
    if (!userId) {
      const { data } = await supabase.auth.getSession();
      userId = data.session?.user?.id ?? null;
    }
    await supabase.from("signup_events").insert({
      install_id: installId,
      user_id: userId,
      event,
      step: input.step ?? null,
      step_index: input.stepIndex ?? null,
      props: input.props ?? {},
      platform: Platform.OS,
      app_version: Application.nativeApplicationVersion ?? null,
    });
  } catch {
    // Silent: analytics must never affect the app.
  }
};

export const trackSignupEvent = (event: SignupEventName, input: SignupEventInput = {}) => {
  void send(event, input);
};

// Links the anonymous install to the new account (one row, no updates).
export const trackAccountCreated = (userId: string, method: SignupMethod) => {
  void send("account_created", { props: { method } }, userId);
};

// Short, PII-free error code (never the raw message, which may contain an email).
export const signupErrorCode = (error: unknown) => {
  const e = error as { code?: unknown; status?: unknown; name?: unknown } | null;
  const raw = e?.code ?? e?.status ?? e?.name ?? "unknown";
  return String(raw).replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 40) || "unknown";
};
