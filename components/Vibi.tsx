import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { vibesTheme } from "../src/theme/vibesTheme";
import type { VibiAnimation } from "../src/vibi/controller";
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
  // Load the existing GLB renderer on native devices, simulators and web.
  return (rendererPromise ??= import("./VibiRenderer").then(
    (module) => module.default
  ));
}
export async function preloadVibi() {
  const [model, Renderer] = await Promise.all([
    import("../src/vibi/model").then((module) => module.loadVibiModel()),
    loadRenderer(),
  ]);
  return { model, Renderer };
}
function Vibi({
  state,
  followController = false,
  visible = true,
  animation,
  loop,
  spin,
  size = 120,
  width = size,
  height = size,
  welcomeIntro,
  onReady,
  onError,
  paused = false,
  reducedMotion: motionPreference,
  onPress,
  onLongPress,
  onModelLoaded,
  onCycleComplete,
  viewportSize,
}: VibiProps) {
  animation = state ?? animation ?? (followController ? undefined : "idle");
  paused = paused || !visible;
  const { active, reducedMotion: systemReducedMotion } = useVibiRuntime();
  const reducedMotion = motionPreference ?? systemReducedMotion;
  const onModelLoadedRef = useRef(onModelLoaded);
  onModelLoadedRef.current = onModelLoaded;
  const [loaded, setLoaded] = useState<{
    model: VibiModel;
    Renderer: React.ComponentType<VibiRendererProps>;
  }>();
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const externalCallbacks = useRef({ onReady, onError });
  externalCallbacks.current = { onReady, onError };
  const reportError = useCallback((error: unknown) => {
    console.warn("[Vibi] Unable to render GLB", error);
    setFailed(true);
    externalCallbacks.current.onError?.();
  }, []);
  const reportReady = useCallback(() => {
    setReady(true);
    externalCallbacks.current.onReady?.();
  }, []);
  useEffect(() => {
    if (failed) onCycleComplete?.();
  }, [failed, onCycleComplete]);
  useEffect(() => {
    let mounted = true;
    void preloadVibi()
      .then(({ model, Renderer }) => {
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
    <View collapsable={false} pointerEvents="none" style={{ width, height }}>
      {loaded && !failed && (
        <View style={{ flex: 1 }}>
          <RenderBoundary fallback={null} onError={reportError}>
            <loaded.Renderer
              animation={animation}
              loop={loop}
              spin={spin}
              model={loaded.model}
              paused={paused || !active || (!!welcomeIntro && !ready)}
              welcomeIntro={welcomeIntro}
              reducedMotion={reducedMotion}
              viewportSize={viewportSize}
              onCycleComplete={onCycleComplete}
              onReady={reportReady}
              onError={reportError}
            />
          </RenderBoundary>
          {welcomeIntro && !ready && (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: vibesTheme.colors.accentMustard },
              ]}
            />
          )}
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
