import type { Session } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "../lib/supabase";
import { recoverInvalidRefreshToken } from "./session.recovery";

type AuthChangeEvent = string;

const OAUTH_REDIRECT_URL = (() => {
  const configuredRedirect = process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URL?.trim();
  if (configuredRedirect) return configuredRedirect;

  return Linking.createURL("auth-callback", {
    scheme: "com.miradario.vibe",
  });
})();

WebBrowser.maybeCompleteAuthSession();

export const signInWithPassword = async (email: string, password: string) => {
  const auth = supabase.auth as any;
  if (typeof auth.signInWithPassword === "function") {
    return auth.signInWithPassword({ email, password });
  }
  return auth.signIn({ email, password });
};

export const signUp = async (email: string, password: string) => {
  const auth = supabase.auth as any;
  if (typeof auth.signUp === "function") {
    return auth.signUp({ email, password });
  }
  return auth.signIn({ email, password });
};

export const signInWithGoogle = async (): Promise<Session | null> => {
  const auth = supabase.auth as any;
  const { data, error } = await auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: OAUTH_REDIRECT_URL,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error("Google auth URL was not returned.");
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT_URL);
  if (result.type !== "success") {
    return null;
  }

  const callbackUrl = new URL(result.url);
  const oauthError =
    callbackUrl.searchParams.get("error_description") ??
    callbackUrl.searchParams.get("error");
  if (oauthError) {
    throw new Error(oauthError);
  }

  const code = callbackUrl.searchParams.get("code");
  if (!code) {
    throw new Error("Google auth code was not returned.");
  }

  const sessionResponse = await auth.exchangeCodeForSession(code);
  if (sessionResponse.error) {
    throw sessionResponse.error;
  }

  return sessionResponse.data?.session ?? null;
};

export const signOut = async () => supabase.auth.signOut();

export const getSession = async (): Promise<Session | null> => {
  const auth = supabase.auth as any;
  if (typeof auth.getSession === "function") {
    const { data, error } = await auth.getSession();
    if (error) {
      await recoverInvalidRefreshToken(error);
      return null;
    }
    return data.session ?? null;
  }

  return auth.session() ?? null;
};

export const onAuthStateChange = (
  callback: (event: AuthChangeEvent, session: Session | null) => void
) => {
  return supabase.auth.onAuthStateChange(callback);
};
