import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useAuthSession } from "../src/auth/auth.queries";
import { profileQueryOptions } from "../src/queries/profile.queries";
import { userPreferencesQueryOptions } from "../src/queries/userPreferences.queries";
import {
  challengesFeedQueryOptions,
  eventsFeedQueryOptions,
  myEventGroupsQueryOptions,
} from "../src/queries/events.queries";
import { matchesQueryOptions } from "../src/queries/matches.queries";
import AnimatedIllustration from "../src/components/illustrations/AnimatedIllustration";
import { startupIllustrationConfig } from "../src/components/illustrations/presets/startupIllustrationConfig";
import {
  getAppUpdateGateState,
  type AppUpdateGateState,
} from "../src/lib/appUpdateGate";
import { vibesTheme } from "../src/theme/vibesTheme";

const STARTUP_VISUAL_MS =
  (startupIllustrationConfig.drawDurationMs ?? 0) +
  (startupIllustrationConfig.fillRevealDurationMs ?? 0);
const MIN_STARTUP_MS = STARTUP_VISUAL_MS + 180;
const HOLD_ON_STARTUP = false;
const SESSION_BOOT_TIMEOUT_MS = 5000;
const STARTUP_PREFETCH_TIMEOUT_MS = 8000;
const UPDATE_GATE_TIMEOUT_MS = 3000;

const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${label} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
};

const Startup = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { data: session, isLoading: isSessionLoading } = useAuthSession();
  const startedAtRef = useRef(Date.now());
  const didNavigateRef = useRef(false);
  const [isReadyToExit, setIsReadyToExit] = useState(false);
  const [sessionLoadTimedOut, setSessionLoadTimedOut] = useState(false);
  const [updateGateState, setUpdateGateState] =
    useState<AppUpdateGateState | null>(null);

  const contentOpacity = useSharedValue(0);
  const contentScale = useSharedValue(0.96);
  const glowOpacity = useSharedValue(0);
  const fadeOverlayOpacity = useSharedValue(0);

  const userId = session?.user?.id;

  useEffect(() => {
    contentOpacity.value = withTiming(1, {
      duration: 540,
      easing: Easing.out(Easing.cubic),
    });
    contentScale.value = withTiming(1, {
      duration: 560,
      easing: Easing.out(Easing.cubic),
    });
    glowOpacity.value = withDelay(
      120,
      withTiming(1, {
        duration: 680,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [contentOpacity, contentScale, glowOpacity]);

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

      const startupTasks: Array<{ label: string; run: () => Promise<unknown> }> = [];

      if (userId) {
        startupTasks.push(
          {
            label: "profile prefetch",
            run: () => queryClient.prefetchQuery(profileQueryOptions(userId)),
          },
          {
            label: "user preferences prefetch",
            run: () => queryClient.prefetchQuery(userPreferencesQueryOptions(userId)),
          },
          {
            label: "matches prefetch",
            run: () => queryClient.prefetchQuery(matchesQueryOptions(userId)),
          },
          {
            label: "event groups prefetch",
            run: () => queryClient.prefetchQuery(myEventGroupsQueryOptions(userId)),
          },
          {
            label: "events feed prefetch",
            run: () => queryClient.prefetchQuery(eventsFeedQueryOptions()),
          },
          {
            label: "challenges feed prefetch",
            run: () => queryClient.prefetchQuery(challengesFeedQueryOptions(userId)),
          },
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
        }),
      );

      try {
        await withTimeout(
          prefetchPromise,
          STARTUP_PREFETCH_TIMEOUT_MS,
          "startup prefetch",
        );
      } catch (error) {
        console.warn("[boot] startup prefetch timed out, continuing", error);
      }

      let nextUpdateGateState: AppUpdateGateState | null = null;
      try {
        console.log("[boot] update gate check started");
        nextUpdateGateState = await withTimeout(
          getAppUpdateGateState(),
          UPDATE_GATE_TIMEOUT_MS,
          "startup update gate",
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

      const elapsed = Date.now() - startedAtRef.current;
      const waitMs = Math.max(0, MIN_STARTUP_MS - elapsed);

      if (waitMs > 0) {
        await new Promise((resolve) => {
          setTimeout(resolve, waitMs);
        });
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
  }, [isSessionLoading, queryClient, sessionLoadTimedOut, userId]);

  useEffect(() => {
    if (HOLD_ON_STARTUP) return;
    if (!isReadyToExit || didNavigateRef.current) return;
    didNavigateRef.current = true;

    fadeOverlayOpacity.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });

    const timeout = setTimeout(() => {
      const hasSession = Boolean(userId);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: updateGateState
            ? [{ name: "UpdateGate", params: updateGateState }]
            : hasSession
              ? [
                  {
                    name: "Tab",
                    params: {
                      screen: "Home",
                      params: { startupFadeIn: true },
                    },
                  },
                ]
              : [{ name: "Welcome" }],
        }),
      );
    }, 280);

    return () => {
      clearTimeout(timeout);
    };
  }, [fadeOverlayOpacity, isReadyToExit, navigation, updateGateState, userId]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: contentScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const fadeOverlayStyle = useAnimatedStyle(() => ({
    opacity: fadeOverlayOpacity.value,
  }));

  const glowColor = useMemo(() => "rgba(228, 183, 110, 0.24)", []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glow, { backgroundColor: glowColor }, glowStyle]} />
      <Animated.View style={[styles.content, contentStyle]}>
        <View style={styles.illustrationWrap}>
          <AnimatedIllustration
            {...startupIllustrationConfig}
            style={styles.illustration}
          />
        </View>
        <Text style={styles.title}>Toma una respiración profunda.</Text>
        <Text style={styles.body}>
          Tu energía se está ordenando para abrirte el camino correcto.
        </Text>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.fadeOverlay, fadeOverlayStyle]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: vibesTheme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  content: {
    width: "100%",
    alignItems: "center",
    marginTop: -36,
  },
  illustrationWrap: {
    width: "100%",
    maxWidth: 300,
    height: 300,
    marginBottom: 58,
  },
  illustration: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontSize: 34,
    textAlign: "center",
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.semibold,
    letterSpacing: 0.2,
  },
  body: {
    marginTop: 10,
    fontSize: 19,
    lineHeight: 24,
    textAlign: "center",
    color: vibesTheme.colors.secondaryText,
    fontFamily: vibesTheme.fonts.medium,
    maxWidth: 300,
  },
  glow: {
    position: "absolute",
    top: "26%",
    width: 280,
    height: 280,
    borderRadius: 140,
    transform: [{ scale: 1.1 }],
  },
  fadeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: vibesTheme.colors.background,
  },
});

export default Startup;
