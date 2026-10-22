import type { Session } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { supabase } from "../lib/supabase";
import { recoverInvalidRefreshToken } from "./session.recovery";
import { vibesTheme } from "../theme/vibesTheme";

type AuthChangeEvent = string;
type SessionResponse = Awaited<ReturnType<typeof supabase.auth.getSession>>;
const APP_SCHEME = "com.gurudevelopers.vibes";
const AUTH_SESSION_TIMEOUT_MS = 5000;

const resolveRedirectUrl = (
  configuredRedirect: string | undefined,
  path: string
) => {
  const trimmedRedirect = configuredRedirect?.trim();
  if (trimmedRedirect) {
    if (trimmedRedirect.startsWith(`${APP_SCHEME}://`)) {
      return trimmedRedirect;
    }

    console.warn("[boot] ignoring redirect URL with unexpected scheme", {
      configuredRedirect: trimmedRedirect,
      expectedScheme: APP_SCHEME,
    });
  }

  return Linking.createURL(path, {
    scheme: APP_SCHEME,
  });
};

const withTimeout = async <T>(
  promise: Promise<T>,
  label: string
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(`${label} timed out after ${AUTH_SESSION_TIMEOUT_MS}ms`)
        );
      }, AUTH_SESSION_TIMEOUT_MS);
    }),
  ]);
};

const OAUTH_REDIRECT_URL = (() => {
  return resolveRedirectUrl(
    process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URL,
    "auth-callback"
  );
})();

const PASSWORD_RESET_REDIRECT_URL = (() => {
  return resolveRedirectUrl(
    process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL,
    "reset-password"
  );
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

export const resetPasswordForEmail = async (email: string) => {
  const auth = supabase.auth as any;
  if (typeof auth.resetPasswordForEmail === "function") {
    return auth.resetPasswordForEmail(email, {
      redirectTo: PASSWORD_RESET_REDIRECT_URL,
    });
  }

  if (typeof auth.api?.resetPasswordForEmail === "function") {
    return auth.api.resetPasswordForEmail(email, {
      redirectTo: PASSWORD_RESET_REDIRECT_URL,
    });
  }

  throw new Error("Password reset is not supported by this auth client.");
};

export const getPasswordRecoveryRoute = async (email: string): Promise<"google" | "email"> => {
  const { data, error } = await supabase.functions.invoke("password-recovery-route", {
    body: { email: email.trim().toLowerCase() },
  });
  if (error || (data?.route !== "google" && data?.route !== "email"))
    throw new Error("No pudimos consultar el método de acceso. Intentá nuevamente en un minuto.");
  return data.route;
};

export const exchangeCodeForSession = async (code: string) => {
  const auth = supabase.auth as any;
  if (typeof auth.exchangeCodeForSession !== "function") {
    throw new Error(
      "Password reset link is not supported by this auth client."
    );
  }

  return auth.exchangeCodeForSession(code);
};

export const updatePassword = async (password: string) => {
  const auth = supabase.auth as any;
  if (typeof auth.updateUser !== "function") {
    throw new Error("Password update is not supported by this auth client.");
  }

  return auth.updateUser({ password });
};

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

type GoogleSigninModule = typeof import("@react-native-google-signin/google-signin");
let googleSigninModule: GoogleSigninModule | null | undefined;
let googleSigninConfigured = false;

// Native Google Sign-In needs a native build with the module linked and the
// client IDs configured. Until both exist, keep the previous browser flow.
const getNativeGoogleSignin = (): GoogleSigninModule | null => {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return null;
  if (!GOOGLE_WEB_CLIENT_ID) return null;
  if (Platform.OS === "ios" && !GOOGLE_IOS_CLIENT_ID) return null;
  if (googleSigninModule === undefined) {
    try {
      googleSigninModule = require("@react-native-google-signin/google-signin");
    } catch (error) {
      console.warn("[auth] native Google Sign-In unavailable, using browser", error);
      googleSigninModule = null;
    }
  }
  if (googleSigninModule && !googleSigninConfigured) {
    googleSigninModule.GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      scopes: ["email", "profile"],
    });
    googleSigninConfigured = true;
  }
  return googleSigninModule ?? null;
};

const signInWithGoogleNative = async (
  module: GoogleSigninModule
): Promise<Session | null> => {
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = module;
  try {
    if (Platform.OS === "android") {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    // Always show the account picker, like the previous prompt=select_account.
    if (GoogleSignin.hasPreviousSignIn()) {
      await GoogleSignin.signOut();
    }
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      return null;
    }
    const idToken = response.data.idToken;
    if (!idToken) {
      throw new Error("Google ID token was not returned.");
    }
    const { data, error } = await (supabase.auth as any).signInWithIdToken({
      provider: "google",
      token: idToken,
    });
    if (error) {
      throw error;
    }
    return data?.session ?? null;
  } catch (error) {
    if (
      isErrorWithCode(error) &&
      (error.code === statusCodes.SIGN_IN_CANCELLED ||
        error.code === statusCodes.IN_PROGRESS)
    ) {
      return null;
    }
    throw error;
  }
};

export const signInWithGoogle = async (): Promise<Session | null> => {
  const nativeGoogle = getNativeGoogleSignin();
  if (nativeGoogle) {
    return signInWithGoogleNative(nativeGoogle);
  }
  return signInWithGoogleBrowser();
};

const signInWithGoogleBrowser = async (): Promise<Session | null> => {
  const auth = supabase.auth as any;
  const { data, error } = await auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: OAUTH_REDIRECT_URL,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: "select_account consent",
        access_type: "offline",
      },
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error("Google auth URL was not returned.");
  }

  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    OAUTH_REDIRECT_URL,
    Platform.OS === "android" ? {
      // Expo processes these color fields before passing options to Kotlin.
      // Supply valid values instead of undefined/null in the native record.
      toolbarColor: vibesTheme.colors.background,
      secondaryToolbarColor: vibesTheme.colors.background,
      controlsColor: vibesTheme.colors.primaryText,
    } : undefined
  );
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

export const signInWithApple = async (): Promise<Session | null> => {
  if (Platform.OS !== "ios") {
    throw new Error("Sign in with Apple is only available on iOS.");
  }

  // Supabase verifies the hashed nonce embedded in Apple's identity token.
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );

  const credential = await AppleAuthentication.signInAsync({
    nonce: hashedNonce,
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error("Apple identity token was not returned.");
  }

  const auth = supabase.auth as any;
  const { data, error } = await auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
    nonce: rawNonce,
  });

  if (error) {
    throw error;
  }

  return data?.session ?? null;
};

export const signOut = async () => supabase.auth.signOut();

export const getSession = async (): Promise<Session | null> => {
  const auth = supabase.auth as any;
  if (typeof auth.getSession === "function") {
    let data;
    let error;

    try {
      const response = (await withTimeout(
        auth.getSession(),
        "auth.getSession"
      )) as SessionResponse;
      data = response.data;
      error = response.error;
    } catch (sessionError) {
      console.warn("[boot] auth getSession timed out or failed", sessionError);
      return null;
    }

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
