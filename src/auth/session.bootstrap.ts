import { supabase } from "../lib/supabase";
import { recoverInvalidRefreshToken } from "./session.recovery";

const AUTH_BOOT_TIMEOUT_MS = 5000;
type SessionResponse = Awaited<ReturnType<typeof supabase.auth.getSession>>;

const withTimeout = async <T>(promise: Promise<T>, label: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${label} timed out after ${AUTH_BOOT_TIMEOUT_MS}ms`));
      }, AUTH_BOOT_TIMEOUT_MS);
    }),
  ]);
};

const isSessionExpired = (expiresAt?: number | null): boolean => {
  if (!expiresAt) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return expiresAt <= nowSeconds;
};

export const bootstrapAuthSession = async (): Promise<void> => {
  console.log("[boot] auth bootstrap started");

  let data;
  let error;

  try {
    const response = (await withTimeout(
      supabase.auth.getSession(),
      "auth.getSession",
    )) as SessionResponse;
    data = response.data;
    error = response.error;
  } catch (bootstrapError) {
    console.warn("[boot] auth bootstrap could not read session", bootstrapError);
    return;
  }

  if (error) {
    await recoverInvalidRefreshToken(error);
    return;
  }

  const session = data.session;
  if (session && isSessionExpired(session.expires_at)) {
    console.log("[boot] auth session expired, refreshing");
    const { error: refreshError } = await withTimeout(
      supabase.auth.refreshSession(),
      "auth.refreshSession",
    );
    if (refreshError) {
      await recoverInvalidRefreshToken(refreshError);
    }
  }

  console.log("[boot] auth bootstrap finished", {
    hasSession: Boolean(session),
  });
};

export const verifyPersistedSession = async (): Promise<boolean> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    await recoverInvalidRefreshToken(error);
    return false;
  }
  return Boolean(data.session);
};
