import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export const EMAIL_VERIFICATION_REDIRECT =
  "com.gurudevelopers.vibes://verify-email";
// email_confirmed_at can be auto-confirmed by Supabase without proving ownership.
export const isEmailOwnershipVerified = (
  user?: Pick<User, "email" | "app_metadata"> | null
) =>
  Boolean(
    user?.email &&
      user.app_metadata?.vibes_verified_email === user.email &&
      user.app_metadata?.vibes_email_verified_at
  );

export const sendEmailVerification = async (email: string) => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: EMAIL_VERIFICATION_REDIRECT,
    },
  });
  if (error) throw error;
};

// Dedupe the one-time token across React effects / navigation remounts.
let currentVerification: { token: string; promise: Promise<void> } | undefined;
export const verifyEmailOwnership = (token: string): Promise<void> => {
  if (currentVerification?.token === token) return currentVerification.promise;
  const promise = (async () => {
    const { data, error } = await supabase.functions.invoke(
      "verify-email-ownership",
      { body: { token_hash: token } }
    );
    if (error || !data?.session)
      throw new Error(
        "El enlace venció o no pudimos verificarlo. Pedí uno nuevo desde tu perfil."
      );
    const { error: sessionError } = await supabase.auth.setSession(
      data.session
    );
    if (sessionError) throw sessionError;
  })();
  currentVerification = { token, promise };
  return promise;
};
