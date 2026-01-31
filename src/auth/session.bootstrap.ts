import { supabase } from "../lib/supabase";

const isSessionExpired = (expiresAt?: number | null): boolean => {
  if (!expiresAt) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return expiresAt <= nowSeconds;
};

export const bootstrapAuthSession = async (): Promise<void> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) return;

  const session = data.session;
  if (session && isSessionExpired(session.expires_at)) {
    await supabase.auth.refreshSession();
  }
};

export const verifyPersistedSession = async (): Promise<boolean> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) return false;
  return Boolean(data.session);
};
