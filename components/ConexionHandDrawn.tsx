/** @format */

/**
 * ConexionHandDrawn
 *
 * The conexion illustration rendered as animated line-art:
 * - Strokes appear progressively top→bottom (strokeDashoffset)
 * - Fill fades in once all strokes are drawn
 *
 * SVG paths extracted from assets/illustrations/14iBn01.svg
 * Original transform: translate(0,774) scale(0.1,-0.1) → viewBox "0 0 600 774"
 */

import React, { useEffect } from "react";
import Svg, { G, Path } from "react-native-svg";
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { conexionPaths } from "../src/illustrations/conexionSvgPaths";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const STROKE_COLOR = "#4A4A5A";
const FILL_COLOR = "#2B2B2B";
const STROKE_WIDTH = 3; // in original SVG units (~0.3 in screen units)

// ── One animated path ─────────────────────────────────────────────────────────

type AnimPathProps = {
  d: string;
  dash: number;
  progress: Animated.SharedValue<number>;
  startAt: number; // 0–1
  endAt: number;   // 0–1
  fillStart: number; // when fill begins to appear (0–1)
};

const AnimPath = React.memo(({ d, dash, progress, startAt, endAt, fillStart }: AnimPathProps) => {
  const animatedProps = useAnimatedProps(() => {
    "worklet";
    const strokeLocal = Math.min(Math.max((progress.value - startAt) / (endAt - startAt), 0), 1);
    const fillLocal = Math.min(Math.max((progress.value - fillStart) / (1 - fillStart), 0), 1);
    return {
      strokeDashoffset: dash * (1 - strokeLocal),
      opacity: strokeLocal > 0.01 ? 1 : 0,
      fillOpacity: interpolate(fillLocal, [0, 1], [0, 1]),
    };
  });

  return (
    <AnimatedPath
      d={d}
      fill={FILL_COLOR}
      stroke={STROKE_COLOR}
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dash}
      animatedProps={animatedProps}
    />
  );
});

// ── Main component ────────────────────────────────────────────────────────────

type Props = {
  width: number;
  height: number;
  durationMs?: number;
};

const FILL_START = 0.72; // fill begins at 72% of draw progress

const ConexionHandDrawn = ({ width, height, durationMs = 3200 }: Props) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: durationMs,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [durationMs, progress]);

  const total = conexionPaths.length;
  // Each path gets a window of 1.6/total (overlap so animation feels fluid)
  const WINDOW = 1.6 / total;

  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 600 774"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Apply the original SVG group transform */}
      <G transform="translate(0,774) scale(0.1,-0.1)">
        {conexionPaths.map((path, i) => {
          const startAt = (i / total) * (1 - WINDOW * 0.5);
          const endAt = startAt + WINDOW;
          return (
            <AnimPath
              key={i}
              d={path.d}
              dash={path.dash}
              progress={progress}
              startAt={startAt}
              endAt={Math.min(endAt, 1)}
              fillStart={FILL_START}
            />
          );
        })}
      </G>
    </Svg>
  );
};

export default ConexionHandDrawn;
