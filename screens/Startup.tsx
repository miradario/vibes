import React, { useEffect, useRef, useState } from "react";
import {
  CommonActions,
  StackActions,
  useNavigation,
} from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import CalmPause from "../components/CalmPause";
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

const SESSION_BOOT_TIMEOUT_MS = 5000;
const STARTUP_PREFETCH_TIMEOUT_MS = 8000;
const UPDATE_GATE_TIMEOUT_MS = 3000;
const STARTUP_INTRO_MIN_MS = 900;

const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const Startup = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { data: session, isLoading: isSessionLoading } = useAuthSession();
  const [introElapsed, setIntroElapsed] = useState(false);
  const didNavigateRef = useRef(false);
  const [isReadyToExit, setIsReadyToExit] = useState(false);
  const [sessionLoadTimedOut, setSessionLoadTimedOut] = useState(false);
  const [forceWelcome, setForceWelcome] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [updateGateState, setUpdateGateState] =
    useState<AppUpdateGateState | null>(null);

  const userId = session?.user?.id;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIntroElapsed(true);
    }, STARTUP_INTRO_MIN_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!isSessionLoading) return;

    const timeout = setTimeout(() => {
      console.warn("[boot] startup session load timed out, continuing");
      setSessionLoadTimedOut(true);
    }, SESSION_BOOT_TIMEOUT_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [isSessionLoading]);

  useEffect(() => {
    let cancelled = false;

    const prefetch = async () => {
      if (isSessionLoading && !sessionLoadTimedOut) return;

      if (userId && !forceWelcome) {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          const isSoftDeleted = user?.app_metadata?.vibes_soft_deleted === true;

          if (isSoftDeleted) {
            setForceWelcome(true);
            await supabase.auth.signOut({ scope: "local" });
            queryClient.setQueryData(authKeys.session, null);
            queryClient.invalidateQueries();
            if (!cancelled) {
              setIsReadyToExit(true);
            }
            return;
          }
        } catch (error) {
          console.warn("[boot] failed to validate auth user", error);
        }
      }

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

    void prefetch();

    return () => {
      cancelled = true;
    };
  }, [
    forceWelcome,
    isSessionLoading,
    queryClient,
    sessionLoadTimedOut,
    userId,
  ]);

  useEffect(() => {
    if (!introElapsed || !isReadyToExit || didNavigateRef.current) return;
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
    introElapsed,
    isReadyToExit,
    userId,
    forceWelcome,
    needsOnboarding,
    updateGateState,
    navigation,
  ]);

  return <CalmPause pending={!isReadyToExit} showAction={false} />;
};

export default Startup;
