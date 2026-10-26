import React, { useEffect } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { vibesTheme } from "../src/theme/vibesTheme";

const colors = [vibesTheme.colors.accentMustard, vibesTheme.colors.accentBlue, vibesTheme.colors.accentCoral];
const pieces = Array.from({ length: 36 }, (_, index) => ({
  index,
  spread: ((index * 17) % 37) / 36,
  lift: 110 + (index % 6) * 30,
  rotation: (index % 2 ? 1 : -1) * (180 + (index % 5) * 90),
}));

function Piece({ piece, progress, width, height }: {
  piece: typeof pieces[number]; progress: SharedValue<number>; width: number; height: number;
}) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: Math.min(p * 12, 1) * Math.min((1 - p) * 5, 1),
      transform: [
        { translateX: (piece.spread - 0.5) * width * 1.15 * p },
        { translateY: -piece.lift * Math.sin(p * Math.PI) + height * 0.7 * p * p },
        { rotate: `${piece.rotation * p}deg` },
      ],
    };
  });
  return <Animated.View style={[styles.piece, {
    backgroundColor: colors[piece.index % colors.length],
    borderRadius: piece.index % 3 === 0 ? 5 : 1,
  }, style]} />;
}

export default function ChallengeCompletionConfetti() {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  useEffect(() => {
    if (!reducedMotion) progress.value = withTiming(1, { duration: 2800, easing: Easing.out(Easing.quad) });
  }, [progress, reducedMotion]);
  if (reducedMotion) return null;
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.overlay}>
      {pieces.map(piece => <Piece key={piece.index} piece={piece} progress={progress} width={width} height={height} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 95, overflow: "hidden" },
  piece: { position: "absolute", left: "50%", top: "28%", width: 9, height: 14 },
});
