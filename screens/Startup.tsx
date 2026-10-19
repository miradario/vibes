import { Platform } from "react-native";
import SessionRecoveryAction from "../components/SessionRecoveryAction";
import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { vibesTheme } from "../src/theme/vibesTheme";
import {
  CommonActions,
  StackActions,
  useNavigation,
} from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import ScreenContainer from "../components/ScreenContainer";
import AnimatedBrandLogo from "../components/AnimatedBrandLogo";
import VibesActionButton from "../components/VibesActionButton";
import { Text } from "../components/Typography";
import { getStartupDestination } from "../src/lib/calmPause";
import { authKeys, useAuthSession } from "../src/auth/auth.queries";
import { supabase } from "../src/lib/supabase";
import {
  profileKeys,
  profileQueryOptions,
} from "../src/queries/profile.queries";
import { userPreferencesQueryOptions } from "../src/queries/userPreferences.queries";
import {
  challengesFeedQueryOptions,
  eventsFeedQueryOptions,
  myEventGroupsQueryOptions,
} from "../src/queries/events.queries";
import { matchesQueryOptions } from "../src/queries/matches.queries";
import {
  getAppUpdateGateState,
  type AppUpdateGateState,
} from "../src/lib/appUpdateGate";
import { isOnboardingComplete } from "../src/lib/onboardingFlow";
import {
  AUTH_VALIDATION_TIMEOUT_MS,
  withBootTimeout as withTimeout,
} from "../src/lib/startupBoot";

const SESSION_BOOT_TIMEOUT_MS = 5000;
const STARTUP_PREFETCH_TIMEOUT_MS = 8000;
const UPDATE_GATE_TIMEOUT_MS = 3000;

const Startup = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { data: session, isLoading: isSessionLoading } = useAuthSession();
  const didNavigateRef = useRef(false);
  const [isReadyToExit, setIsReadyToExit] = useState(false);
  const [sessionLoadTimedOut, setSessionLoadTimedOut] = useState(false);
  const [forceWelcome, setForceWelcome] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [bootFailed, setBootFailed] = useState(false);
  const [updateGateState, setUpdateGateState] =
    useState<AppUpdateGateState | null>(null);

  const userId = session?.user?.id;
  useEffect(() => {
    if (isReadyToExit) return;
    const timer = setTimeout(() => setBootFailed(true), 20000);
    return () => clearTimeout(timer);
  }, [attempt, isReadyToExit]);

  const retryBoot = () => {
    setBootFailed(false);
    setSessionLoadTimedOut(false);
    setAttempt(value => value + 1);
    void queryClient.refetchQueries({ queryKey: authKeys.session }).catch(error => {
      console.warn("[boot] session retry failed", error);
    });
  };
  useEffect(() => {
    if (!isSessionLoading) return;

    const timeout = setTimeout(() => {
      console.warn("[boot] startup session load timed out, continuing");
      setSessionLoadTimedOut(true);
    }, SESSION_BOOT_TIMEOUT_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [isSessionLoading, attempt]);

  useEffect(() => {
    let cancelled = false;

    const prefetch = async () => {
      if (isSessionLoading && !sessionLoadTimedOut) return;

      if (userId && !forceWelcome) {
        try {
          const {
            data: { user },
          } = await withTimeout(
            supabase.auth.getUser(),
            AUTH_VALIDATION_TIMEOUT_MS,
            "startup auth validation"
          );
          if (cancelled) return;
          const isSoftDeleted = user?.app_metadata?.vibes_soft_deleted === true;

          if (isSoftDeleted) {
            setForceWelcome(true);
            queryClient.setQueryData(authKeys.session, null);
            void queryClient.invalidateQueries();
            await withTimeout(
              supabase.auth.signOut({ scope: "local" }),
              AUTH_VALIDATION_TIMEOUT_MS,
              "startup local sign out"
            );
            if (!cancelled) {
              setIsReadyToExit(true);
            }
            return;
          }
        } catch (error) {
          console.warn("[boot] failed to validate auth user", error);
        }
      }

      if (cancelled) return;

      const startupTasks: Array<{
        label: string;
        run: () => Promise<unknown>;
      }> = [];

      if (userId && !cancelled) {
        startupTasks.push(
          {
            label: "profile prefetch",
            run: () => queryClient.prefetchQuery(profileQueryOptions(userId)),
          },
          {
            label: "user preferences prefetch",
            run: () =>
              queryClient.prefetchQuery(userPreferencesQueryOptions(userId)),
          },
          {
            label: "matches prefetch",
            run: () => queryClient.prefetchQuery(matchesQueryOptions(userId)),
          },
          {
            label: "event groups prefetch",
            run: () =>
              queryClient.prefetchQuery(myEventGroupsQueryOptions(userId)),
          },
          {
            label: "events feed prefetch",
            run: () => queryClient.prefetchQuery(eventsFeedQueryOptions()),
          },
          {
            label: "challenges feed prefetch",
            run: () =>
              queryClient.prefetchQuery(challengesFeedQueryOptions(userId)),
          }
        );
      }

      const prefetchPromise = Promise.allSettled(
        startupTasks.map(async ({ label, run }) => {
          console.log(`[boot] ${label} started`);

          try {
            const result = await run();
            console.log(`[boot] ${label} finished`);
            return result;
          } catch (error) {
            console.warn(`[boot] ${label} failed`, error);
            throw error;
          }
        })
      );

      try {
        await withTimeout(
          prefetchPromise,
          STARTUP_PREFETCH_TIMEOUT_MS,
          "startup prefetch"
        );
      } catch (error) {
        console.warn("[boot] startup prefetch timed out, continuing", error);
      }

      if (cancelled) return;

      if (userId) {
        const profileState = queryClient.getQueryState(
          profileKeys.byUser(userId)
        );
        if (profileState?.status === "success") {
          setNeedsOnboarding(
            !isOnboardingComplete(
              queryClient.getQueryData(profileKeys.byUser(userId))
            )
          );
        }
      }

      let nextUpdateGateState: AppUpdateGateState | null = null;
      try {
        console.log("[boot] update gate check started");
        nextUpdateGateState = await withTimeout(
          getAppUpdateGateState(),
          UPDATE_GATE_TIMEOUT_MS,
          "startup update gate"
        );
        console.log("[boot] update gate check finished", {
          hasUpdateGate: Boolean(nextUpdateGateState),
        });
      } catch (error) {
        console.warn("[boot] update gate check failed, continuing", error);
      }

      if (!cancelled) {
        setUpdateGateState(nextUpdateGateState);
      }

      if (!cancelled) {
        console.log("[boot] startup ready to exit", {
          hasSession: Boolean(userId),
          sessionLoadTimedOut,
          hasUpdateGate: Boolean(nextUpdateGateState),
        });
        setIsReadyToExit(true);
      }
    };

    void prefetch().catch(error => {
      console.warn("[boot] startup failed", error);
      if (!cancelled) setBootFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [
    forceWelcome,
    isSessionLoading,
    queryClient,
    sessionLoadTimedOut,
    userId,
    attempt,
  ]);

  useEffect(() => {
    // Loading artwork never delays navigation once boot data is ready.
    if (
      !isReadyToExit ||
      didNavigateRef.current
    )
      return;
    didNavigateRef.current = true;
    const destination = getStartupDestination(
      Boolean(userId) && !forceWelcome,
      needsOnboarding,
      updateGateState
    );
    if (destination.name === "Tab") {
      navigation.dispatch(
        StackActions.replace(destination.name, destination.params)
      );
      return;
    }

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [destination],
      })
    );
  }, [
    isReadyToExit,
    userId,
    forceWelcome,
    needsOnboarding,
    updateGateState,
    navigation,
  ]);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}
      style={{ backgroundColor: vibesTheme.colors.background }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <AnimatedBrandLogo direction="logo-to-word" loop animate={Platform.OS !== "android"} style={{ width: 240, height: 240 }} />
        {bootFailed ? (
          <View style={{ width: "100%", maxWidth: 360, paddingHorizontal: 24, gap: 16, marginTop: 24 }}>
            <Text accessibilityLiveRegion="polite" style={{ color: vibesTheme.colors.secondaryText, textAlign: "center", fontSize: 18 }}>
              La carga está demorando. Revisá tu conexión y volvé a intentar.
            </Text>
            <VibesActionButton label="Reintentar" onPress={retryBoot} textStyle={{ color: vibesTheme.colors.primaryText }} />
            <SessionRecoveryAction />
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
};

export default Startup;
