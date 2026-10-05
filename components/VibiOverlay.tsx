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
import { Text } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";
import { getBottomTabBarHeight } from "../src/lib/tabBarLayout";
import { useAuthSession } from "../src/auth/auth.queries";
import { useVibiEnabled } from "../src/featureFlags/useVibiEnabled";
import { useVibi } from "../src/vibi/useVibi";
import { useVibiRuntime } from "../src/vibi/useMotionPreference";
import {
  playAnimation,
  setMinimized,
  setVisible,
  vibiController,
} from "../src/vibi/controller";

const SIZE = 120;
const RESTORE_WIDTH = 112;
const RESTORE_HEIGHT = 44;
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
  const shown = eligible && state.visible;
  useEffect(() => {
    if (!eligible || routeName !== "Home") return;
    const timeout = setTimeout(() => {
      const current = vibiController.getSnapshot();
      if (current.visible && !current.minimized) playAnimation("happy");
    }, 3000);
    return () => clearTimeout(timeout);
  }, [eligible, routeName]);
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
    const metrics = Keyboard.metrics();
    if (Keyboard.isVisible() && metrics) setKeyboardTop(metrics.screenY);
    return () => {
      show.remove();
      change.remove();
      hide.remove();
    };
  }, []);
  const collapsed = !state.visible || state.minimized;
  const boxWidth = collapsed ? RESTORE_WIDTH : SIZE;
  const expandedHeight = SIZE;
  const boxHeight = collapsed ? RESTORE_HEIGHT : expandedHeight;
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
  const changeVisibility = (visible: boolean) => {
    position.stopAnimation();
    current.current = {
      x: current.current.x + (visible ? -1 : 1) * (SIZE - RESTORE_WIDTH),
      y: current.current.y,
    };
    dragged.current = true;
    position.setValue(current.current);
    setMinimized(false);
    setVisible(visible);
  };
  if (!everEnabled) return null;
  return (
    <View
      pointerEvents={eligible ? "box-none" : "none"}
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        !eligible && styles.hidden,
      ]}
      accessibilityElementsHidden={!eligible}
      importantForAccessibility={eligible ? "auto" : "no-hide-descendants"}
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
            minimized. Only its visibility and frame scheduler change. */}
        <View
          pointerEvents={collapsed ? "none" : "auto"}
          style={[
            styles.fullCharacter,
            { height: expandedHeight },
            collapsed && styles.hidden,
          ]}
          accessibilityElementsHidden={collapsed}
          importantForAccessibility={collapsed ? "no-hide-descendants" : "auto"}
        >
          <View {...pan.panHandlers}>
            <Vibi size={SIZE} onPress={onPress} paused={!shown || collapsed} />
          </View>
          <Pressable
            onPress={() => changeVisibility(false)}
            accessibilityRole="button"
            accessibilityLabel="Ocultar Vibi"
            accessibilityHint="Podés recuperarlo con el botón Mostrar Vibi."
            style={styles.control}
          >
            <Ionicons name="close" size={20} color={colors.primaryText} />
          </Pressable>
        </View>
        {collapsed && (
          <View {...pan.panHandlers}>
            <Pressable
              onPress={() => {
                changeVisibility(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Mostrar Vibi"
              accessibilityHint="Restaura el personaje. Después podés tocarlo para abrir el chat."
              accessibilityActions={[
                { name: "expand", label: "Expandir Vibi" },
              ]}
              onAccessibilityAction={({ nativeEvent }) => {
                if (nativeEvent.actionName === "expand") changeVisibility(true);
              }}
              style={styles.mini}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color={colors.primaryText}
              />
              <Text style={styles.restoreLabel}>Mostrar Vibi</Text>
            </Pressable>
          </View>
        )}
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
  restoreLabel: { fontSize: 12, color: colors.primaryText },
  mini: {
    alignItems: "center",
    justifyContent: "center",
    width: RESTORE_WIDTH,
    height: RESTORE_HEIGHT,
    flexDirection: "row",
    gap: 6,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accentMustard,
  },
});
