import type {
  LoginInput,
  ResetPasswordInput,
  UpdatePasswordInput,
} from "./auth.types";
import * as authClient from "./supabaseAuth.client";
import { bootstrapAuthSession } from "./session.bootstrap";
import { recoverInvalidRefreshToken } from "./session.recovery";

void bootstrapAuthSession().catch((error) => {
  console.error("[boot] auth bootstrap failed", error);
});

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

export const resetPassword = async ({ email }: ResetPasswordInput) => {
  const { error } = await authClient.resetPasswordForEmail(email);
  if (error) {
    throw error;
  }
};

export const exchangePasswordResetCode = async (code: string) => {
  const { data, error } = await authClient.exchangeCodeForSession(code);
  if (error) {
    throw error;
  }
  return data.session ?? null;
};

export const updatePassword = async ({ password }: UpdatePasswordInput) => {
  const { error } = await authClient.updatePassword(password);
  if (error) {
    throw error;
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
