import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as authService from "./auth.service";
import type {
  AuthSession,
  AuthSignupResult,
  LoginInput,
  SignupInput,
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
    const { data } = authService.onAuthStateChange?.((_, session) => {
      queryClient.setQueryData(authKeys.session, session ?? null);
    }) ?? { data: null };

    const subscription =
      (data as any)?.subscription ??
      (data as any) ??
      null;

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
      queryClient.setQueryData(authKeys.session, session ?? null);
      if (session) {
        queryClient.invalidateQueries();
      }
    },
  });
};

export const useLogoutMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, void>({
    mutationFn: authService.logout,
    onSuccess: () => {
      queryClient.setQueryData(authKeys.session, null);
      queryClient.invalidateQueries();
    },
  });
};
