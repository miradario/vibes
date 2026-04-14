import { supabase } from "../lib/supabase";
import { recoverInvalidRefreshToken } from "./session.recovery";

const isSessionExpired = (expiresAt?: number | null): boolean => {
  if (!expiresAt) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return expiresAt <= nowSeconds;
};

export const bootstrapAuthSession = async (): Promise<void> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      await recoverInvalidRefreshToken(error);
      return;
    }

    const session = data.session;
    if (session && isSessionExpired(session.expires_at)) {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        await recoverInvalidRefreshToken(refreshError);
      }
    }
  } catch (error) {
    console.warn("Auth bootstrap skipped due to network/configuration error.", error);
  }
};

export const verifyPersistedSession = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      await recoverInvalidRefreshToken(error);
      return false;
    }

    return Boolean(data.session);
  } catch (error) {
    await recoverInvalidRefreshToken(error);
    return false;
  }
};
