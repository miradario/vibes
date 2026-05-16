import type { LoginInput } from "./auth.types";
import * as authClient from "./supabaseAuth.client";
import { bootstrapAuthSession } from "./session.bootstrap";
import { recoverInvalidRefreshToken } from "./session.recovery";

void bootstrapAuthSession();

export const login = async ({ email, password }: LoginInput) => {
  const { data, error } = await authClient.signInWithPassword(email, password);
  if (error) {
    throw error;
  }
  return data.session ?? null;
};

export const signup = async ({ email, password }: LoginInput) => {
  const { data, error } = await authClient.signUp(email, password);
  if (error) {
    throw error;
  }

  let session = data.session ?? null;
  if (!session) {
    const loginResponse = await authClient.signInWithPassword(email, password);
    if (!loginResponse.error) {
      session = loginResponse.data.session ?? null;
    }
  }

  return {
    session,
    user: data.user ?? data.session?.user ?? null,
  };
};

export const loginWithGoogle = async () => authClient.signInWithGoogle();

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
