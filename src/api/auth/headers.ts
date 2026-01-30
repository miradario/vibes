import { getAccessToken } from "./tokenProvider";

export type AuthHeaders = Record<string, string>;

const getAnonKey = (): string => {
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_ANON_KEY");
  }
  return key;
};

export const buildAuthHeaders = async (): Promise<AuthHeaders> => {
  const apikey = getAnonKey();
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return { apikey };
  }

  return {
    apikey,
    Authorization: `Bearer ${accessToken}`,
  };
};
