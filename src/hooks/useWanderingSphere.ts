import { useEffect } from "react";
import { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

/** Each sphere chooses a new destination after its previous movement finishes. */
export default function useWanderingSphere(enabled: boolean, reducedMotion: boolean, maxX: number, maxUp = 110) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(1);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const move = () => {
      const duration = 3200 + Math.random() * 2600;
      const config = { duration, easing: Easing.inOut(Easing.sin) };
      x.value = withTiming((Math.random() * 2 - 1) * maxX, config);
      y.value = withTiming(-maxUp + Math.random() * (maxUp + 20), config);
      scale.value = withTiming(0.88 + Math.random() * 0.38, config);
      timer = setTimeout(move, duration);
    };
    if (reducedMotion) {
      x.value = 0;
      y.value = 0;
      scale.value = 1;
    } else if (enabled) {
      timer = setTimeout(move, 200 + Math.random() * 300);
    }
    return () => {
      if (timer !== undefined) clearTimeout(timer);
      cancelAnimation(x);
      cancelAnimation(y);
      cancelAnimation(scale);
    };
  }, [enabled, reducedMotion, maxX, maxUp, x, y, scale]);
  return useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));
}

