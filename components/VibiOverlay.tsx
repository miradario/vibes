import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
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
import { playAnimation, setVisible, type VibiAnimation } from "../src/vibi/controller";
import type { VibiModel } from "../src/vibi/model";

const SIZE = 88;
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
  const { reducedMotion } = useVibiRuntime();
  const enabled = useVibiEnabled();
  const { data: session } = useAuthSession();
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const [everEnabled, setEverEnabled] = useState(false);
  const eligible =
    enabled &&
    Boolean(session?.user?.id) &&
    routeName !== "Vibi" &&
    !AUTH_ROUTES.has(routeName) &&
    !routeName.startsWith("Onboarding");
  // Visibility lives in the in-memory controller: dismissal survives navigation
  // and remounts, and resets when the app starts a new runtime.
  const shown = eligible && state.visible && !state.minimized;
  const [greeting, setGreeting] = useState<VibiAnimation | null>(null);
  const greetedHome = useRef(false);
  const onModelLoaded = React.useCallback((model: VibiModel) => {
    setGreeting(model.clips.has("wave") ? "wave" : null);
  }, []);
  useEffect(() => {
    if (routeName !== "Home") {
      greetedHome.current = false;
      return;
    }
    if (shown && greeting && !greetedHome.current) {
      greetedHome.current = true;
      playAnimation(greeting);
    }
  }, [routeName, shown, greeting]);
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
  const boxHeight = SIZE;
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
        <View
          pointerEvents={shown ? "auto" : "none"}
          style={[
            styles.fullCharacter,
            { height: expandedHeight },
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
              onModelLoaded={onModelLoaded}
            />
          </View>
          <Pressable
            onPress={() => setVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Ocultar Vibi"
            accessibilityHint="Quedará oculta hasta que vuelvas a iniciar la app."
            style={styles.control}
          >
            <Ionicons name="close" size={20} color={colors.primaryText} />
          </Pressable>
        </View>
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
    top: 0,
    left: 0,
    width: SIZE,
    alignItems: "center",
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
});
