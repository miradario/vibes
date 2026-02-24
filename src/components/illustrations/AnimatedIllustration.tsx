/** @format */

import React, { useEffect, useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Defs, G, LinearGradient, Path, Stop } from "react-native-svg";
import Animated, {
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { vibesTheme } from "../../theme/vibesTheme";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

export type IllustrationPath = {
  d: string;
  fill: string;
};

export type LinearGradientStopConfig = {
  offset: string;
  stopColor: string;
  stopOpacity?: number;
};

export type LinearGradientConfig = {
  id: string;
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  gradientUnits?: string;
  stops: LinearGradientStopConfig[];
};

export type DrawSegmentConfig = {
  pathIndex: number;
  dash: number;
  startAt: number;
  span: number;
  strokeWidth?: number;
  color?: string;
};

export type ButterflyConfig = {
  pathIndexes: number[];
  miniViewBox: string;
  anchorX: number;
  anchorY: number;
  size: number;
  amplitudeX: number;
  amplitudeY: number;
  rotationDeg: number;
  durationMs: number;
  delayMs?: number;
  phase?: number;
  scale?: number;
};

export type FlyerConfig = ButterflyConfig & {
  mode?: "loop" | "oneShotExit";
  exitFadeStart?: number;
};

export type FloatLayerConfig = {
  pathIndexes: number[];
  amplitudeY: number;
  amplitudeX?: number;
  durationMs: number;
  phase?: number;
  opacity?: number;
};

export type RevealLayerConfig = {
  pathIndexes: number[];
  startAt: number;
  durationMs: number;
  fromOpacity?: number;
  toOpacity?: number;
  fromScale?: number;
  toScale?: number;
};

export type CircleOverlayConfig = {
  x: number;
  y: number;
  size: number;
  color: string;
  opacity?: number;
  startAt: number;
  durationMs: number;
  scaleFrom?: number;
};

export type PenPathConfig = {
  inputRange: number[];
  x: number[];
  y: number[];
  size?: number;
  color?: string;
};

export type AnimatedIllustrationProps = {
  paths: ReadonlyArray<IllustrationPath>;
  viewBox: string;
  linearGradients?: ReadonlyArray<LinearGradientConfig>;
  hiddenPathIndexes?: ReadonlyArray<number>;
  drawSegments: ReadonlyArray<DrawSegmentConfig>;
  flyers?: ReadonlyArray<FlyerConfig>;
  butterflies?: ReadonlyArray<ButterflyConfig>;
  floatLayers?: ReadonlyArray<FloatLayerConfig>;
  revealLayers?: ReadonlyArray<RevealLayerConfig>;
  circles: ReadonlyArray<CircleOverlayConfig>;
  drawDurationMs?: number;
  fillRevealStart?: number;
  fillRevealDurationMs?: number;
  showPenTip?: boolean;
  penPath?: PenPathConfig;
  style?: ViewStyle;
};

type DrawStrokePathProps = {
  d: string;
  dash: number;
  startAt: number;
  span: number;
  progress: SharedValue<number>;
  strokeWidth: number;
  color: string;
};

const DrawStrokePath = ({
  d,
  dash,
  startAt,
  span,
  progress,
  strokeWidth,
  color,
}: DrawStrokePathProps) => {
  const animatedProps = useAnimatedProps(() => {
    "worklet";
    const local = Math.min(Math.max((progress.value - startAt) / span, 0), 1);
    return {
      strokeDashoffset: dash * (1 - local),
      opacity: local > 0 ? 0.95 : 0,
    };
  });

  return (
    <AnimatedPath
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dash}
      animatedProps={animatedProps}
    />
  );
};

type FlyingButterflyProps = {
  parts: IllustrationPath[];
  miniViewBox: string;
  anchorX: number;
  anchorY: number;
  sizePx: number;
  amplitudeXPx: number;
  amplitudeYPx: number;
  rotationDeg: number;
  durationMs: number;
  delayMs: number;
  phase: number;
  scale: number;
  mode: "loop" | "oneShotExit";
  exitFadeStart: number;
};

const FlyingButterfly = ({
  parts,
  miniViewBox,
  anchorX,
  anchorY,
  sizePx,
  amplitudeXPx,
  amplitudeYPx,
  rotationDeg,
  durationMs,
  delayMs,
  phase,
  scale,
  mode,
  exitFadeStart,
}: FlyingButterflyProps) => {
  const loop = useSharedValue(0);

  useEffect(() => {
    if (mode === "oneShotExit") {
      loop.value = withDelay(
        delayMs,
        withTiming(1, { duration: durationMs, easing: Easing.out(Easing.cubic) }),
      );
      return;
    }

    loop.value = withDelay(
      delayMs,
      withRepeat(
        withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [delayMs, durationMs, loop, mode]);

  const animatedStyle = useAnimatedStyle(() => {
    const raw = mode === "oneShotExit" ? Math.min(Math.max(loop.value, 0), 1) : (loop.value + phase) % 1;
    const t = raw;
    const swing = Math.sin(t * Math.PI * 2);
    const lift = Math.cos(t * Math.PI * 2);
    const flutter = 1 + Math.sin((t + 0.15) * Math.PI * 4) * 0.05;
    const oneShotFade = mode === "oneShotExit" ? interpolate(t, [0, exitFadeStart, 1], [0.95, 0.9, 0]) : 0.92;

    return {
      opacity: oneShotFade,
      transform: [
        { translateX: swing * amplitudeXPx },
        { translateY: lift * amplitudeYPx },
        { rotate: `${swing * rotationDeg}deg` },
        { scale: scale * flutter },
      ],
    };
  }, [exitFadeStart, mode]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.butterflyLayer,
        {
          left: anchorX,
          top: anchorY,
          width: sizePx,
          height: sizePx,
        },
        animatedStyle,
      ]}
    >
      <Svg width="100%" height="100%" viewBox={miniViewBox}>
        {parts.map((part, index) => (
          <Path key={`bf-part-${index}`} d={part.d} fill={part.fill} />
        ))}
      </Svg>
    </Animated.View>
  );
};

type FloatingPathLayerProps = {
  parts: IllustrationPath[];
  viewBox: string;
  width: number;
  height: number;
  amplitudeXPx: number;
  amplitudeYPx: number;
  durationMs: number;
  phase: number;
  maxOpacity: number;
};

const FloatingPathLayer = ({
  parts,
  viewBox,
  width,
  height,
  amplitudeXPx,
  amplitudeYPx,
  durationMs,
  phase,
  maxOpacity,
}: FloatingPathLayerProps) => {
  const loop = useSharedValue(0);

  useEffect(() => {
    loop.value = withRepeat(
      withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [durationMs, loop]);

  const style = useAnimatedStyle(() => {
    const t = (loop.value + phase) % 1;
    const swing = Math.sin(t * Math.PI * 2);
    const lift = Math.cos(t * Math.PI * 2);
    return {
      opacity: maxOpacity,
      transform: [{ translateX: swing * amplitudeXPx }, { translateY: lift * amplitudeYPx }],
    };
  }, [amplitudeXPx, amplitudeYPx, maxOpacity, phase]);

  return (
    <Animated.View pointerEvents="none" style={[styles.overlayLayer, { width, height }, style]}>
      <Svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
        {parts.map((part, index) => (
          <Path key={`float-part-${index}`} d={part.d} fill={part.fill} />
        ))}
      </Svg>
    </Animated.View>
  );
};

type RevealPathLayerProps = {
  parts: IllustrationPath[];
  viewBox: string;
  width: number;
  height: number;
  startAt: number;
  durationMs: number;
  fromOpacity: number;
  toOpacity: number;
  fromScale: number;
  toScale: number;
  drawDurationMs: number;
};

const RevealPathLayer = ({
  parts,
  viewBox,
  width,
  height,
  startAt,
  durationMs,
  fromOpacity,
  toOpacity,
  fromScale,
  toScale,
  drawDurationMs,
}: RevealPathLayerProps) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      Math.max(0, Math.round(startAt * drawDurationMs)),
      withTiming(1, { duration: durationMs, easing: Easing.out(Easing.cubic) }),
    );
  }, [drawDurationMs, durationMs, progress, startAt]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [fromOpacity, toOpacity]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [fromScale, toScale]) }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.overlayLayer, { width, height }, style]}>
      <Svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
        {parts.map((part, index) => (
          <Path key={`reveal-part-${index}`} d={part.d} fill={part.fill} />
        ))}
      </Svg>
    </Animated.View>
  );
};

type AppearingCircleProps = {
  xPx: number;
  yPx: number;
  sizePx: number;
  color: string;
  maxOpacity: number;
  startAt: number;
  durationMs: number;
  scaleFrom: number;
  drawDurationMs: number;
};

const AppearingCircle = ({
  xPx,
  yPx,
  sizePx,
  color,
  maxOpacity,
  startAt,
  durationMs,
  scaleFrom,
  drawDurationMs,
}: AppearingCircleProps) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    const delay = Math.max(0, Math.round(startAt * drawDurationMs));
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: durationMs, easing: Easing.out(Easing.cubic) }),
    );
  }, [drawDurationMs, durationMs, progress, startAt]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value * maxOpacity,
    transform: [{ scale: interpolate(progress.value, [0, 1], [scaleFrom, 1]) }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.circleOverlay,
        {
          left: xPx,
          top: yPx,
          width: sizePx,
          height: sizePx,
          borderRadius: sizePx / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
};

const parseViewBox = (viewBox: string) => {
  const values = viewBox
    .trim()
    .split(/\s+/)
    .map((value) => Number(value));
  if (values.length !== 4 || values.some((value) => Number.isNaN(value))) {
    return { minX: 0, minY: 0, width: 1000, height: 1000 };
  }
  return { minX: values[0], minY: values[1], width: values[2], height: values[3] };
};

// Generic illustration engine for reusable "draw + butterflies + circles" animations.
const AnimatedIllustration = ({
  paths,
  viewBox,
  linearGradients = [],
  hiddenPathIndexes = [],
  flyers = [],
  drawSegments,
  butterflies = [],
  floatLayers = [],
  revealLayers = [],
  circles,
  drawDurationMs = 3200,
  fillRevealStart = 0.75,
  fillRevealDurationMs = 700,
  showPenTip = false,
  penPath,
  style,
}: AnimatedIllustrationProps) => {
  const vb = useMemo(() => parseViewBox(viewBox), [viewBox]);
  const [layoutSize, setLayoutSize] = useState({ width: 1, height: 1 });

  const drawProgress = useSharedValue(0);
  const fillOpacity = useSharedValue(0);

  useEffect(() => {
    drawProgress.value = withTiming(1, {
      duration: drawDurationMs,
      easing: Easing.inOut(Easing.cubic),
    });
    fillOpacity.value = withDelay(
      Math.max(0, Math.round(fillRevealStart * drawDurationMs)),
      withTiming(1, {
        duration: fillRevealDurationMs,
        easing: Easing.out(Easing.quad),
      }),
    );
  }, [drawDurationMs, drawProgress, fillOpacity, fillRevealDurationMs, fillRevealStart]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setLayoutSize({ width, height });
    }
  };

  const scaleX = layoutSize.width / vb.width;
  const scaleY = layoutSize.height / vb.height;
  const scale = Math.min(scaleX, scaleY);

  const fillGroupProps = useAnimatedProps(() => ({
    opacity: fillOpacity.value,
  }));

  const visiblePaths = paths.filter((_, index) => !hiddenPathIndexes.includes(index));
  const flyerLayers = flyers.length > 0 ? flyers : butterflies;

  const penStyle = useAnimatedStyle(() => {
    if (!showPenTip || !penPath) {
      return { opacity: 0 };
    }

    const xPx = penPath.x.map((x) => (x - vb.minX) * scaleX);
    const yPx = penPath.y.map((y) => (y - vb.minY) * scaleY);

    return {
      opacity: drawProgress.value < 1 ? 0.92 : 0,
      transform: [
        { translateX: interpolate(drawProgress.value, penPath.inputRange, xPx) },
        { translateY: interpolate(drawProgress.value, penPath.inputRange, yPx) },
      ],
    };
  });

  const penSize = penPath?.size ?? 7;

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      <Svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
        <Defs>
          {linearGradients.map((gradient) => (
            <LinearGradient
              key={gradient.id}
              id={gradient.id}
              x1={gradient.x1}
              y1={gradient.y1}
              x2={gradient.x2}
              y2={gradient.y2}
              gradientUnits={gradient.gradientUnits}
            >
              {gradient.stops.map((stop, index) => (
                <Stop
                  key={`${gradient.id}-stop-${index}`}
                  offset={stop.offset}
                  stopColor={stop.stopColor}
                  stopOpacity={stop.stopOpacity}
                />
              ))}
            </LinearGradient>
          ))}
        </Defs>

        <AnimatedG animatedProps={fillGroupProps}>
          {visiblePaths.map((path, index) => (
            <Path key={`base-${index}`} d={path.d} fill={path.fill} />
          ))}
        </AnimatedG>

        {drawSegments.map((segment, index) => {
          const path = paths[segment.pathIndex];
          if (!path) return null;
          return (
            <DrawStrokePath
              key={`draw-${index}`}
              d={path.d}
              dash={segment.dash}
              startAt={segment.startAt}
              span={segment.span}
              progress={drawProgress}
              strokeWidth={segment.strokeWidth ?? 1.9}
              color={segment.color ?? vibesTheme.colors.lineArt}
            />
          );
        })}
      </Svg>

      {floatLayers.map((layer, index) => {
        const parts = layer.pathIndexes.map((pathIndex) => paths[pathIndex]).filter(Boolean) as IllustrationPath[];
        if (parts.length === 0) return null;
        return (
          <FloatingPathLayer
            key={`float-layer-${index}`}
            parts={parts}
            viewBox={viewBox}
            width={layoutSize.width}
            height={layoutSize.height}
            amplitudeXPx={(layer.amplitudeX ?? 0) * scaleX}
            amplitudeYPx={layer.amplitudeY * scaleY}
            durationMs={layer.durationMs}
            phase={layer.phase ?? 0}
            maxOpacity={layer.opacity ?? 1}
          />
        );
      })}

      {revealLayers.map((layer, index) => {
        const parts = layer.pathIndexes.map((pathIndex) => paths[pathIndex]).filter(Boolean) as IllustrationPath[];
        if (parts.length === 0) return null;
        return (
          <RevealPathLayer
            key={`reveal-layer-${index}`}
            parts={parts}
            viewBox={viewBox}
            width={layoutSize.width}
            height={layoutSize.height}
            startAt={layer.startAt}
            durationMs={layer.durationMs}
            fromOpacity={layer.fromOpacity ?? 0}
            toOpacity={layer.toOpacity ?? 1}
            fromScale={layer.fromScale ?? 1}
            toScale={layer.toScale ?? 1}
            drawDurationMs={drawDurationMs}
          />
        );
      })}

      {flyerLayers.map((flyer, index) => {
        const parts = flyer.pathIndexes
          .map((pathIndex) => paths[pathIndex])
          .filter(Boolean) as IllustrationPath[];

        if (parts.length === 0) return null;

        return (
          <FlyingButterfly
            key={`butterfly-${index}`}
            parts={parts}
            miniViewBox={flyer.miniViewBox}
            anchorX={(flyer.anchorX - vb.minX) * scaleX}
            anchorY={(flyer.anchorY - vb.minY) * scaleY}
            sizePx={Math.max(1, flyer.size * scale)}
            amplitudeXPx={flyer.amplitudeX * scaleX}
            amplitudeYPx={flyer.amplitudeY * scaleY}
            rotationDeg={flyer.rotationDeg}
            durationMs={flyer.durationMs}
            delayMs={flyer.delayMs ?? 0}
            phase={flyer.phase ?? 0}
            scale={flyer.scale ?? 1}
            mode={flyer.mode ?? "loop"}
            exitFadeStart={flyer.exitFadeStart ?? 0.78}
          />
        );
      })}

      {circles.map((circle, index) => (
        <AppearingCircle
          key={`circle-${index}`}
          xPx={(circle.x - vb.minX) * scaleX}
          yPx={(circle.y - vb.minY) * scaleY}
          sizePx={Math.max(1, circle.size * scale)}
          color={circle.color}
          maxOpacity={circle.opacity ?? 0.6}
          startAt={circle.startAt}
          durationMs={circle.durationMs}
          scaleFrom={circle.scaleFrom ?? 0.65}
          drawDurationMs={drawDurationMs}
        />
      ))}

      {showPenTip && penPath ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.penTip,
            {
              width: penSize,
              height: penSize,
              borderRadius: penSize / 2,
              backgroundColor: penPath.color ?? vibesTheme.colors.accentCoral,
            },
            penStyle,
          ]}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
  },
  butterflyLayer: {
    position: "absolute",
    zIndex: 4,
  },
  overlayLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 2,
  },
  circleOverlay: {
    position: "absolute",
    zIndex: 3,
  },
  penTip: {
    position: "absolute",
    zIndex: 5,
  },
});

export default AnimatedIllustration;
