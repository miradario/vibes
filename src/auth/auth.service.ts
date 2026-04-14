import type { LoginInput } from "./auth.types";
import * as authClient from "./supabaseAuth.client";
import { bootstrapAuthSession } from "./session.bootstrap";
import { recoverInvalidRefreshToken } from "./session.recovery";

void bootstrapAuthSession();

const normalizeAuthError = (error: unknown): Error => {
  if (error instanceof Error) {
    if (/network request failed/i.test(error.message)) {
      return new Error(
        "Cannot reach the authentication server. Check the configured Supabase URL and your network connection."
      );
    }

    return error;
  }

  return new Error("Could not complete authentication.");
};

export const login = async ({ email, password }: LoginInput) => {
  try {
    const { data, error } = await authClient.signInWithPassword(email, password);
    if (error) {
      throw error;
    }
    return data.session ?? null;
  } catch (error) {
    throw normalizeAuthError(error);
  }
};

export const signup = async ({ email, password }: LoginInput) => {
  try {
    const { data, error } = await authClient.signUp(email, password);
    if (error) {
      throw error;
    }
    return data.session ?? null;
  } catch (error) {
    throw normalizeAuthError(error);
  }
};

export const logout = async () => {
  const { error } = await authClient.signOut();
  if (error) {
    const recovered = await recoverInvalidRefreshToken(error);
    if (recovered) {
      return;
    }
    throw error;
  }
};

export const getSession = async () => authClient.getSession();

export const onAuthStateChange = authClient.onAuthStateChange;
