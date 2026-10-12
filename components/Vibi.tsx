import React, { memo, useEffect, useRef, useSyncExternalStore } from "react";
import { Animated, Image, Pressable, View } from "react-native";
import { VIBES_LOGO } from "../src/constants/brandAssets";
import { VIBI_LOOPS, finishAnimation, vibiController, type VibiAnimation } from "../src/vibi/controller";
import type { VibiModel } from "../src/vibi/model";
import type { VibiRendererProps } from "./VibiRenderer";
import { useVibiRuntime } from "../src/vibi/useMotionPreference";
export type VibiProps = {
  state?: VibiAnimation;
  /** Subscribe to app events instead of using the instance state. */
  followController?: boolean;
  visible?: boolean;
  animation?: VibiAnimation;
  loop?: boolean;
  /** Turntable speed multiplier; true uses the default speed. */
  spin?: boolean | number;
  size?: number;
  width?: number;
  height?: number;
  welcomeIntro?: VibiRendererProps["welcomeIntro"];
  onReady?: () => void;
  onError?: () => void;
  paused?: boolean;
  /** Use an already-resolved preference when the initial camera depends on it. */
  reducedMotion?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onCycleComplete?: () => void;
  viewportSize?: number;
  onModelLoaded?: (model: VibiModel) => void;
};

export async function preloadVibi() {
  const model = await import("../src/vibi/model").then(module => module.loadVibiModel());
  return { model };
}
function Vibi({ state, animation, followController = false, visible = true, loop, size = 120, width = size, height = size,
  paused = false, reducedMotion: preference, onPress, onLongPress, onReady, onError, onModelLoaded, onCycleComplete }: VibiProps) {
  const snapshot = useSyncExternalStore(vibiController.subscribe, vibiController.getSnapshot, vibiController.getSnapshot);
  const name = state ?? animation ?? (followController ? snapshot.animation : "idle");
  const { active, reducedMotion } = useVibiRuntime();
  const stopped = paused || !visible || !active;
  const scale = useRef(new Animated.Value(1)).current;
  const callbacks = useRef({ onReady, onError, onCycleComplete, onModelLoaded });
  callbacks.current = { onReady, onError, onCycleComplete, onModelLoaded };
  useEffect(() => {
    if (!onModelLoaded) return;
    let mounted = true;
    void preloadVibi().then(({ model }) => { if (mounted) callbacks.current.onModelLoaded?.(model); })
      .catch(() => { if (mounted) callbacks.current.onError?.(); });
    return () => { mounted = false; };
  }, [!!onModelLoaded]);
  useEffect(() => {
    scale.setValue(1);
    if (stopped || (preference ?? reducedMotion) || name === "idle") return;
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: 1.018, duration: 3000, useNativeDriver: true, isInteraction: false }),
      Animated.timing(scale, { toValue: 1, duration: 3000, useNativeDriver: true, isInteraction: false }),
    ]));
    pulse.start();
    return () => { pulse.stop(); scale.setValue(1); };
  }, [name, stopped, reducedMotion, preference, scale]);
  useEffect(() => {
    if (stopped) return;
    const durations = require("../assets/models/vibi-clips.json") as Record<string, number>;
    const duration = (durations[name] ?? 3) * 1000;
    const looping = loop ?? VIBI_LOOPS.has(name);
    const complete = () => {
      callbacks.current.onCycleComplete?.();
      if (followController && !looping) finishAnimation(snapshot.requestId);
    };
    const timer = looping ? setInterval(complete, duration) : setTimeout(complete, duration);
    return () => { clearInterval(timer); clearTimeout(timer); };
  }, [name, stopped, loop, followController, snapshot.requestId]);
  const artwork = <View pointerEvents="none" style={{ width, height }}>
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <Image source={VIBES_LOGO} resizeMode="contain" style={{ width: "100%", height: "100%" }}
        accessibilityLabel="Vibi" onLoad={() => callbacks.current.onReady?.()} onError={() => callbacks.current.onError?.()} />
    </Animated.View>
  </View>;
  if (!visible) return null;
  return onPress ? <Pressable onPress={onPress} onLongPress={onLongPress} accessibilityRole="button"
    accessibilityLabel="Hablar con Vibi" accessibilityHint="Abre el chat con tu asistente">{artwork}</Pressable> : artwork;
}
export default memo(Vibi);
