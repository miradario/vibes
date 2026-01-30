import { supabase } from "../../lib/supabase";

export type AccessToken = string | null;

export const getAccessToken = async (): Promise<AccessToken> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return null;
  }
  return data.session?.access_token ?? null;
};
