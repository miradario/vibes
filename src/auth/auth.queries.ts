import { useEffect } from "react";
import { resetVibiDailyGreeting } from "../lib/vibiDailyPrompts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as authService from "./auth.service";
import type {
  AuthSession,
  AuthSignupResult,
  LoginInput,
  ResetPasswordInput,
  SignupInput,
  UpdatePasswordInput,
} from "./auth.types";

export const authKeys = {
  session: ["auth", "session"] as const,
};

export const useAuthSession = () => {
  const queryClient = useQueryClient();

  const query = useQuery<AuthSession>({
    queryKey: authKeys.session,
    queryFn: () => authService.getSession(),
    staleTime: Infinity,
  });

  useEffect(() => {
    const { data } = authService.onAuthStateChange?.((event, session) => {
      if (event === "SIGNED_OUT") resetVibiDailyGreeting();
      queryClient.setQueryData(authKeys.session, session ?? null);
    }) ?? { data: null };

    const subscription = (data as any)?.subscription ?? (data as any) ?? null;

    return () => {
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
      if (subscription?.subscription?.unsubscribe) {
        subscription.subscription.unsubscribe();
      }
    };
  }, [queryClient]);

  return query;
};

export const useLoginMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<AuthSession, unknown, LoginInput>({
    mutationFn: authService.login,
    onSuccess: (session) => {
      if (session?.user?.id) resetVibiDailyGreeting(session.user.id);
      queryClient.setQueryData(authKeys.session, session ?? null);
      queryClient.invalidateQueries();
    },
  });
};

export const useSignupMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<AuthSignupResult, unknown, SignupInput>({
    mutationFn: authService.signup,
    onSuccess: ({ session }) => {
      if (session?.user?.id) resetVibiDailyGreeting(session.user.id);
      queryClient.setQueryData(authKeys.session, session ?? null);
      if (session) {
        queryClient.invalidateQueries();
      }
    },
  });
};

export const useGoogleLoginMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<AuthSession, unknown, void>({
    mutationFn: authService.loginWithGoogle,
    onSuccess: (session) => {
      if (session?.user?.id) resetVibiDailyGreeting(session.user.id);
      queryClient.setQueryData(authKeys.session, session ?? null);
      if (session) {
        queryClient.invalidateQueries();
      }
    },
  });
};

export const useAppleLoginMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<AuthSession, unknown, void>({
    mutationFn: authService.loginWithApple,
    onSuccess: (session) => {
      if (session?.user?.id) resetVibiDailyGreeting(session.user.id);
      queryClient.setQueryData(authKeys.session, session ?? null);
      if (session) {
        queryClient.invalidateQueries();
      }
    },
  });
};

export const useResetPasswordMutation = () => {
  return useMutation<"google" | "email", unknown, ResetPasswordInput>({
    mutationFn: authService.resetPassword,
  });
};

export const useExchangePasswordResetCodeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<AuthSession, unknown, string>({
    mutationFn: authService.exchangePasswordResetCode,
    onSuccess: (session) => {
      if (session?.user?.id) resetVibiDailyGreeting(session.user.id);
      queryClient.setQueryData(authKeys.session, session ?? null);
      if (session) {
        queryClient.invalidateQueries();
      }
    },
  });
};

export const useUpdatePasswordMutation = () => {
  return useMutation<void, unknown, UpdatePasswordInput>({
    mutationFn: authService.updatePassword,
  });
};

export const useLogoutMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, void>({
    mutationFn: authService.logout,
    onSuccess: () => {
      resetVibiDailyGreeting();
      queryClient.setQueryData(authKeys.session, null);
      queryClient.invalidateQueries();
    },
  });
};
