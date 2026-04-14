import { supabase } from "../../lib/supabase";
import { recoverInvalidRefreshToken } from "../../auth/session.recovery";

export type AccessToken = string | null;

export const getAccessToken = async (): Promise<AccessToken> => {
  const auth = supabase.auth as any;

  // Supabase JS v2
  if (typeof auth.getSession === "function") {
    try {
      const { data, error } = await auth.getSession();
      if (error) {
        await recoverInvalidRefreshToken(error);
        return null;
      }

      return data?.session?.access_token ?? null;
    } catch (error) {
      await recoverInvalidRefreshToken(error);
      return null;
    }
  }

  // Fallback for older clients/typings
  if (typeof auth.session === "function") {
    try {
      const session = auth.session();
      return session?.access_token ?? null;
    } catch {
      return null;
    }
  }

  return null;
};
