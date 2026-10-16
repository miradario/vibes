import { supabase } from "../lib/supabase";
import { withBootTimeout } from "../lib/startupBoot";

export const isAccountAlreadyRegistered = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const { code, message } = error as { code?: string; message?: string };
  return code === "user_already_exists" || code === "email_exists" ||
    /already registered|already exists|user already/i.test(message ?? "");
};

/** Supabase can return an obfuscated user for an already-confirmed address. */
export const isObfuscatedExistingSignup = (result: {
  session?: unknown;
  user?: { identities?: unknown[] } | null;
}) => !result.session && Boolean(result.user && Array.isArray(result.user.identities) && result.user.identities.length === 0);

/** Read only the authenticated account's profile; never look up somebody else's email. */
export const hasRegisteredProfile = async (userId: string) => {
  const { data, error } = await withBootTimeout(
    Promise.resolve(supabase.from("profiles").select("id").eq("id", userId).maybeSingle()),
    8000, "No pudimos verificar tu cuenta. Volvé a intentar."
  );
  if (error) throw error;
  return Boolean(data?.id);
};
