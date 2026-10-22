import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Vibi from "./Vibi";
import { vibesTheme } from "../src/theme/vibesTheme";
import { getBottomTabBarHeight } from "../src/lib/tabBarLayout";
import { useAuthSession } from "../src/auth/auth.queries";
import { useVibiEnabled } from "../src/featureFlags/useVibiEnabled";
import { useVibi } from "../src/vibi/useVibi";
import { useVibiRuntime } from "../src/vibi/useMotionPreference";
import { setVisible } from "../src/vibi/controller";

const SIZE = 64;
const CLOSE_SPACE = 36;
const GAP = 12;
const colors = vibesTheme.colors;
const AUTH_ROUTES = new Set([
  "Startup",
  "UpdateGate",
  "Welcome",
  "Login",
  "Signup",
  "ResetPassword",
  "VerifyEmail",
  "AgeAssurance",
  "VibesOnboardingFlow",
  "VibesMinimalOnboarding",
]);
export type VibiOverlayProps = {
  onPress?: () => void;
  routeName?: string;
  hasBottomBar?: boolean;
};
export default function VibiOverlay({
  onPress,
  routeName = "",
  hasBottomBar = false,
}: VibiOverlayProps) {
  const state = useVibi();
  const { active, reducedMotion } = useVibiRuntime();
  const enabled = useVibiEnabled();
  const { data: session } = useAuthSession();
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const [everEnabled, setEverEnabled] = useState(false);
  const eligible =
    enabled &&
    Boolean(session?.user?.id) &&
    routeName === "Home" &&
    !AUTH_ROUTES.has(routeName) &&
    !routeName.startsWith("Onboarding");
  // Visibility lives in the in-memory controller: dismissal survives navigation
  // and remounts, and resets when the app starts a new runtime.
  const shown = eligible && state.visible && !state.minimized;
  const floatOffset = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!shown || !active || reducedMotion) {
      floatOffset.setValue(0);
      return;
    }
    const floating = Animated.loop(
      Animated.sequence([
        Animated.timing(floatOffset, {
          toValue: -4,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(floatOffset, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ])
    );
    floating.start();
    return () => {
      floating.stop();
      floatOffset.setValue(0);
    };
  }, [shown, active, reducedMotion, floatOffset]);
  useEffect(() => {
    if (eligible) setEverEnabled(true);
  }, [eligible]);
  useEffect(() => {
    const update = (event: { endCoordinates: { screenY: number } }) =>
      setKeyboardTop(event.endCoordinates.screenY);
    const show = Keyboard.addListener("keyboardDidShow", update);
    const change = Keyboard.addListener("keyboardDidChangeFrame", update);
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardTop(null)
    );
    const metrics = Keyboard.metrics?.();
    if (Keyboard.isVisible?.() && metrics) setKeyboardTop(metrics.screenY);
    return () => {
      show.remove();
      change.remove();
      hide.remove();
    };
  }, []);
  const boxWidth = SIZE;
  const expandedHeight = SIZE;
  const boxHeight = SIZE + CLOSE_SPACE;
  // Tab bar includes a raised selected icon, so leave space above its crest.
  const bottomSpace = hasBottomBar
    ? getBottomTabBarHeight(fontScale) + Math.max(insets.bottom + 8, 18) + 38
    : insets.bottom;
  const keyboardCeiling = keyboardTop === null ? height : keyboardTop - 64;
  const bounds = {
    minX: insets.left + GAP,
    maxX: Math.max(insets.left + GAP, width - insets.right - GAP - boxWidth),
    minY: insets.top + GAP,
    maxY: Math.max(
      insets.top + GAP,
      Math.min(height - bottomSpace, keyboardCeiling) - GAP - boxHeight
    ),
  };
  const latest = useRef({ bounds, reducedMotion });
  latest.current = { bounds, reducedMotion };
  const position = useRef(new Animated.ValueXY()).current;
  const current = useRef({ x: 0, y: 0 });
  const start = useRef(current.current);
  const initialized = useRef(false);
  const dragged = useRef(false);
  const clamp = (point: { x: number; y: number }) => {
    const b = latest.current.bounds;
    return {
      x: Math.min(b.maxX, Math.max(b.minX, point.x)),
      y: Math.min(b.maxY, Math.max(b.minY, point.y)),
    };
  };
  useEffect(() => {
    const next = clamp(
      !initialized.current || !dragged.current
        ? { x: bounds.maxX, y: bounds.maxY }
        : current.current
    );
    initialized.current = true;
    current.current = next;
    position.stopAnimation();
    position.setValue(next);
  }, [bounds.minX, bounds.maxX, bounds.minY, bounds.maxY, position]);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.hypot(gesture.dx, gesture.dy) > 6,
        onPanResponderGrant: () => {
          position.stopAnimation((point) => {
            current.current = point;
            start.current = point;
          });
          dragged.current = true;
        },
        onPanResponderMove: (_event, gesture) => {
          const next = clamp({
            x: start.current.x + gesture.dx,
            y: start.current.y + gesture.dy,
          });
          current.current = next;
          position.setValue(next);
        },
        onPanResponderRelease: () => {
          const b = latest.current.bounds;
          const next = clamp({
            x: current.current.x < (b.minX + b.maxX) / 2 ? b.minX : b.maxX,
            y: current.current.y,
          });
          current.current = next;
          if (latest.current.reducedMotion) {
            position.setValue(next);
            return;
          }
          Animated.spring(position, {
            toValue: next,
            useNativeDriver: true,
            tension: 90,
            friction: 14,
          }).start();
        },
        onPanResponderTerminate: () => {
          const next = clamp(current.current);
          current.current = next;
          position.setValue(next);
        },
      }),
    [position]
  );
  if (!everEnabled) return null;
  return (
    <View
      pointerEvents={shown ? "box-none" : "none"}
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        !shown && styles.hidden,
      ]}
      accessibilityElementsHidden={!shown}
      importantForAccessibility={shown ? "auto" : "no-hide-descendants"}
    >
      <Animated.View
        style={[
          styles.character,
          {
            width: boxWidth,
            height: boxHeight,
            transform: position.getTranslateTransform(),
          },
        ]}
      >
        {/* Keep the GL component mounted with its original dimensions while
            hidden. Only its visibility and frame scheduler change. */}
        <Animated.View
          pointerEvents={shown ? "auto" : "none"}
          style={[
            styles.fullCharacter,
            { height: expandedHeight, transform: [{ translateY: floatOffset }] },
          ]}
          accessibilityElementsHidden={!shown}
          importantForAccessibility={shown ? "auto" : "no-hide-descendants"}
        >
          <View {...pan.panHandlers}>
            <Vibi
              followController
              size={SIZE}
              onPress={onPress}
              paused={!shown}

            />
          </View>
        </Animated.View>
          <Pressable
            onPress={() => setVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Ocultar Vibi"
            accessibilityHint="Quedará oculta hasta que vuelvas a iniciar la app."
            style={styles.control}
          >
            <View style={styles.controlChip}>
              <Ionicons name="close" size={18} color={colors.primaryText} />
            </View>
          </Pressable>
      </Animated.View>
    </View>
  );
}
const styles = StyleSheet.create({
  overlay: { zIndex: 50 },
  hidden: { opacity: 0 },
  character: { position: "absolute", left: 0, top: 0 },
  fullCharacter: {
    position: "absolute",
    top: CLOSE_SPACE,
    left: 0,
    width: SIZE,
    alignItems: "center",
    borderRadius: SIZE / 2,
    // Solid surface + brand-blue ring + soft shadow so Vibi never blends into
    // photos or cards underneath (Home and every screen where it floats).
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: "rgba(57, 120, 184, 0.35)",
    shadowColor: colors.primaryText,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  control: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  controlChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    shadowColor: colors.primaryText,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
