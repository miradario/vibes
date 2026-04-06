/** @format */

/**
 * ChallengeTreeProgress
 *
 * An animated SVG tree (line-art, inspired by the Vibes figure-tree illustration)
 * that draws itself progressively based on a 0–1 progress value.
 *
 * Layers revealed in order:
 *  0.00 – 0.22  Roots
 *  0.12 – 0.40  Trunk
 *  0.30 – 0.56  Figure aura (light-blue fill, fade-in)
 *  0.40 – 0.65  Arms → main branches
 *  0.58 – 0.80  Secondary branches
 *  0.72 – 0.94  Leaf buds
 *  0.88 – 1.00  Bird + decorative dots
 */

import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path, Circle, Ellipse } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

// ─── helpers ────────────────────────────────────────────────────────────────

/** Map global progress [0,1] to a local [0,1] window */
const localProgress = (global: number, start: number, end: number) =>
  Math.min(Math.max((global - start) / (end - start), 0), 1);

// ─── animated components ─────────────────────────────────────────────────────

type StrokePathProps = {
  d: string;
  dash: number;
  progress: Animated.SharedValue<number>;
  start: number;
  end: number;
  strokeWidth?: number;
  stroke?: string;
};

const StrokePath = ({
  d, dash, progress, start, end,
  strokeWidth = 1.8,
  stroke = "#5A5A6E",
}: StrokePathProps) => {
  const animatedProps = useAnimatedProps(() => {
    "worklet";
    const lp = Math.min(Math.max((progress.value - start) / (end - start), 0), 1);
    return {
      strokeDashoffset: dash * (1 - lp),
      opacity: lp > 0 ? 1 : 0,
    };
  });

  return (
    <AnimatedPath
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dash}
      animatedProps={animatedProps}
    />
  );
};

type FadeEllipseProps = {
  cx: number; cy: number; rx: number; ry: number;
  progress: Animated.SharedValue<number>;
  start: number; end: number;
  fill: string;
};

const FadeEllipse = ({ cx, cy, rx, ry, progress, start, end, fill }: FadeEllipseProps) => {
  const animatedProps = useAnimatedProps(() => {
    "worklet";
    const lp = Math.min(Math.max((progress.value - start) / (end - start), 0), 1);
    return { opacity: lp * 0.55 };
  });
  return <AnimatedEllipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} animatedProps={animatedProps} />;
};

type FadeCircleProps = {
  cx: number; cy: number; r: number;
  progress: Animated.SharedValue<number>;
  start: number; end: number;
  fill: string; maxOpacity?: number;
};

const FadeCircle = ({ cx, cy, r, progress, start, end, fill, maxOpacity = 0.85 }: FadeCircleProps) => {
  const animatedProps = useAnimatedProps(() => {
    "worklet";
    const lp = Math.min(Math.max((progress.value - start) / (end - start), 0), 1);
    return { opacity: lp * maxOpacity };
  });
  return <AnimatedCircle cx={cx} cy={cy} r={r} fill={fill} animatedProps={animatedProps} />;
};

// ─── main component ──────────────────────────────────────────────────────────

type Props = {
  /** 0–1 value: streak / durationDays */
  progress: number;
  size?: number;
};

const ChallengeTreeProgress = ({ progress, size = 220 }: Props) => {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(Math.min(Math.max(progress, 0), 1), {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  // viewBox: 0 0 200 270
  return (
    <View style={[localStyles.wrap, { width: size, height: size * 1.23 }]}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 200 270"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* ── Aura / figure glow (fade in early) ── */}
        <FadeEllipse cx={100} cy={108} rx={22} ry={40} fill="#A8D8EA" progress={p} start={0.28} end={0.56} />

        {/* ── Roots ── */}
        {/* left root */}
        <StrokePath d="M 100 238 C 94 248 80 258 65 263 C 53 267 43 261 40 252" dash={120} progress={p} start={0.00} end={0.20} />
        {/* right root */}
        <StrokePath d="M 100 238 C 106 248 120 258 135 263 C 147 267 157 261 160 252" dash={120} progress={p} start={0.03} end={0.22} />
        {/* center root left */}
        <StrokePath d="M 96 244 C 90 254 82 264 76 272" dash={60} progress={p} start={0.06} end={0.22} />
        {/* center root right */}
        <StrokePath d="M 104 244 C 110 254 118 264 124 272" dash={60} progress={p} start={0.08} end={0.24} />
        {/* small root loop */}
        <StrokePath d="M 65 263 C 62 268 60 272 63 274 C 67 276 72 272 72 268" dash={50} progress={p} start={0.10} end={0.24} />
        <StrokePath d="M 135 263 C 138 268 140 272 137 274 C 133 276 128 272 128 268" dash={50} progress={p} start={0.12} end={0.25} />

        {/* ── Trunk ── */}
        <StrokePath d="M 97 132 C 96 168 95 202 96 238 C 98 241 102 241 104 238 C 105 202 104 168 103 132" dash={280} progress={p} start={0.12} end={0.40} strokeWidth={2.2} />

        {/* ── Figure outline (head + body) ── */}
        {/* body curve */}
        <StrokePath d="M 88 148 C 80 138 76 124 76 108 C 76 88 86 72 100 70 C 114 72 124 88 124 108 C 124 124 120 138 112 148" dash={220} progress={p} start={0.32} end={0.58} strokeWidth={1.6} />
        {/* head loop */}
        <StrokePath d="M 88 88 C 88 78 93 70 100 70 C 107 70 112 78 112 88 C 112 98 107 106 100 108 C 93 106 88 98 88 88" dash={100} progress={p} start={0.36} end={0.56} strokeWidth={1.5} />

        {/* ── Arms → main branches ── */}
        {/* left arm */}
        <StrokePath d="M 92 80 C 80 72 66 60 52 50 C 44 44 36 36 30 26" dash={180} progress={p} start={0.40} end={0.64} />
        {/* right arm */}
        <StrokePath d="M 108 80 C 120 72 134 60 148 50 C 156 44 164 36 170 26" dash={180} progress={p} start={0.42} end={0.66} />

        {/* ── Secondary branches ── */}
        <StrokePath d="M 52 50 C 45 40 40 28 36 16" dash={90} progress={p} start={0.58} end={0.78} />
        <StrokePath d="M 148 50 C 155 40 160 28 164 16" dash={90} progress={p} start={0.60} end={0.80} />
        <StrokePath d="M 66 60 C 57 49 50 38 44 26" dash={85} progress={p} start={0.60} end={0.79} />
        <StrokePath d="M 134 60 C 143 49 150 38 156 26" dash={85} progress={p} start={0.62} end={0.80} />
        <StrokePath d="M 82 98 C 70 88 58 80 46 74" dash={75} progress={p} start={0.62} end={0.80} />
        <StrokePath d="M 118 98 C 130 88 142 80 154 74" dash={75} progress={p} start={0.63} end={0.80} />

        {/* ── Leaf buds (stroked ovals at branch tips) ── */}
        {/* top-left */}
        <StrokePath d="M 30 26 C 25 18 24 8 29 3 C 34 -2 40 1 40 10 C 40 18 36 24 30 26 Z" dash={80} progress={p} start={0.72} end={0.90} strokeWidth={1.4} />
        {/* top-right */}
        <StrokePath d="M 170 26 C 175 18 176 8 171 3 C 166 -2 160 1 160 10 C 160 18 164 24 170 26 Z" dash={80} progress={p} start={0.74} end={0.92} strokeWidth={1.4} />
        {/* left-upper */}
        <StrokePath d="M 36 16 C 31 8 31 -1 36 -5 C 41 -8 46 -5 45 5 C 44 12 41 17 36 16 Z" dash={70} progress={p} start={0.74} end={0.91} strokeWidth={1.4} />
        {/* right-upper */}
        <StrokePath d="M 164 16 C 169 8 169 -1 164 -5 C 159 -8 154 -5 155 5 C 156 12 159 17 164 16 Z" dash={70} progress={p} start={0.76} end={0.92} strokeWidth={1.4} />
        {/* left-mid */}
        <StrokePath d="M 44 26 C 39 18 38 8 43 3 C 48 -1 53 2 52 11 C 51 18 48 24 44 26 Z" dash={70} progress={p} start={0.76} end={0.92} strokeWidth={1.4} />
        {/* right-mid */}
        <StrokePath d="M 156 26 C 161 18 162 8 157 3 C 152 -1 147 2 148 11 C 149 18 152 24 156 26 Z" dash={70} progress={p} start={0.77} end={0.93} strokeWidth={1.4} />
        {/* low-left leaf */}
        <StrokePath d="M 46 74 C 40 66 40 56 45 51 C 50 47 56 50 54 59 C 53 66 50 72 46 74 Z" dash={70} progress={p} start={0.78} end={0.93} strokeWidth={1.4} />
        {/* low-right leaf */}
        <StrokePath d="M 154 74 C 160 66 160 56 155 51 C 150 47 144 50 146 59 C 147 66 150 72 154 74 Z" dash={70} progress={p} start={0.78} end={0.94} strokeWidth={1.4} />

        {/* ── Bird ── */}
        <StrokePath d="M 155 95 C 159 89 165 87 169 90 C 165 92 160 95 155 95" dash={50} progress={p} start={0.88} end={1.00} strokeWidth={1.6} stroke="#E4916E" />

        {/* ── Decorative dots ── */}
        {/* orange top-left 1 */}
        <FadeCircle cx={46} cy={35} r={6} fill="#E4916E" progress={p} start={0.88} end={1.00} />
        {/* orange top-left 2 (smaller) */}
        <FadeCircle cx={52} cy={52} r={4} fill="#E4916E" progress={p} start={0.90} end={1.00} maxOpacity={0.7} />
        {/* peach bottom-right */}
        <FadeCircle cx={142} cy={262} r={9} fill="#F2C99A" progress={p} start={0.90} end={1.00} maxOpacity={0.65} />
      </Svg>
    </View>
  );
};

const localStyles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
  },
});

export default ChallengeTreeProgress;
