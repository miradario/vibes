import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { isDevice } from "expo-device";
import type { VibiAnimation } from "../src/vibi/controller";
import type { VibiModel } from "../src/vibi/model";
import type { VibiRendererProps } from "./VibiRenderer";
import { useStaticPlayback } from "../src/vibi/useStaticPlayback";
import { useVibiRuntime } from "../src/vibi/useMotionPreference";

export type VibiProps = {
  animation?: VibiAnimation;
  loop?: boolean;
  spin?: boolean;
  size?: number;
  paused?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onModelLoaded?: (model: VibiModel) => void;
};
const fallbackSource = require("../assets/models/vibi-static.png");
export function VibiStatic({ size = 120 }: { size?: number }) {
  return (
    <Image
      source={fallbackSource}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessible={false}
    />
  );
}
export function VibiBreathing({
  size = 120,
  paused = false,
}: {
  size?: number;
  paused?: boolean;
}) {
  const { active, reducedMotion } = useVibiRuntime();
  const breath = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (paused || !active || reducedMotion) {
      breath.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [active, reducedMotion, paused, breath]);
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        transform: [
          {
            scale: breath.interpolate({
              inputRange: [0, 1],
              outputRange: [0.94, 1],
            }),
          },
          {
            translateY: breath.interpolate({
              inputRange: [0, 1],
              outputRange: [2, -2],
            }),
          },
        ],
      }}
    >
      <VibiStatic size={size} />
    </Animated.View>
  );
}
class RenderBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback: React.ReactNode;
    onError: (error: unknown) => void;
  },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
let rendererPromise:
  | Promise<React.ComponentType<VibiRendererProps>>
  | undefined;
function loadRenderer() {
  // This iOS simulator produced a blank frame with Expo GL; its OpenGL ES
  // implementation is unreliable. Use the bundled model image there.
  // Physical iOS devices still load the native renderer.
  if (Platform.OS === "ios" && !isDevice) {
    return Promise.reject(
      new Error("iOS simulator uses the static Vibi fallback")
    );
  }
  // Importing expo-gl itself can throw on an older native binary. Keep it out
  // of the startup graph so the app can still show its bundled static model.
  return (rendererPromise ??= import("./VibiRenderer").then(
    (module) => module.default
  ));
}
function Vibi({
  animation,
  loop,
  spin,
  size = 120,
  paused = false,
  onPress,
  onLongPress,
  onModelLoaded,
}: VibiProps) {
  const { active, reducedMotion } = useVibiRuntime();
  const onModelLoadedRef = useRef(onModelLoaded);
  onModelLoadedRef.current = onModelLoaded;
  const [loaded, setLoaded] = useState<{
    model: VibiModel;
    Renderer: React.ComponentType<VibiRendererProps>;
  }>();
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const fallbackTurn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    fallbackTurn.setValue(0);
    if (!spin || (ready && !failed) || paused || !active || reducedMotion)
      return;
    const rotation = Animated.loop(
      Animated.timing(fallbackTurn, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotation.start();
    return () => rotation.stop();
  }, [spin, ready, failed, paused, active, reducedMotion, fallbackTurn]);
  useStaticPlayback(
    failed && !animation,
    paused || !active,
    loaded?.model.info
  );
  const reportError = useCallback((error: unknown) => {
    console.warn("[Vibi] 3D unavailable; using bundled static model", error);
    setFailed(true);
  }, []);
  const reportReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    let mounted = true;
    void Promise.all([
      import("../src/vibi/model").then((module) => module.loadVibiModel()),
      loadRenderer(),
    ])
      .then(([model, Renderer]) => {
        if (mounted) {
          setLoaded({ model, Renderer });
          onModelLoadedRef.current?.(model);
        }
      })
      .catch((error) => {
        if (mounted) reportError(error);
      });
    return () => {
      mounted = false;
    };
  }, [reportError]);
  useEffect(() => {
    if (!loaded || ready || failed || paused || !active) return;
    const timeout = setTimeout(
      () => reportError(new Error("Vibi GL context did not become ready")),
      12000
    );
    return () => clearTimeout(timeout);
  }, [loaded, ready, failed, paused, active, reportError]);
  const artwork = (
    <View pointerEvents="none" style={{ width: size, height: size }}>
      {(!ready || failed) && (
        <Animated.View
          style={{
            transform: [
              { perspective: 800 },
              {
                rotateY: fallbackTurn.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "360deg"],
                }),
              },
            ],
          }}
        >
          <VibiBreathing size={size} paused={paused} />
        </Animated.View>
      )}
      {loaded && !failed && (
        <View style={StyleSheet.absoluteFill}>
          <RenderBoundary
            fallback={<VibiBreathing size={size} paused={paused} />}
            onError={reportError}
          >
            <loaded.Renderer
              animation={animation}
              loop={loop}
              spin={spin}
              model={loaded.model}
              paused={paused || !active}
              reducedMotion={reducedMotion}
              onReady={reportReady}
              onError={reportError}
            />
          </RenderBoundary>
        </View>
      )}
    </View>
  );
  return onPress ? (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel="Hablar con Vibi"
      accessibilityHint="Abre el chat con tu asistente"
    >
      {artwork}
    </Pressable>
  ) : (
    artwork
  );
}
export default memo(Vibi);
