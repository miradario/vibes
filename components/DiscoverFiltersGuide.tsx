import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCalmMotion } from "../src/hooks/useCalmMotion";

export default function DiscoverFiltersGuide({ userId, opened, children }: { userId?: string; opened: boolean; children: React.ReactNode }) {
  const [owner, setOwner] = useState<string | null>(null);
  const { visible, reduceMotion } = useCalmMotion();
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let active = true;
    setOwner(null);
    if (userId) void AsyncStorage.getItem(`discover_filters_guide:${userId}`).then(seen => { if (active && !seen) setOwner(userId); }).catch(() => {});
    return () => { active = false; };
  }, [userId]);
  useEffect(() => {
    if (!userId || owner !== userId || !visible) return;
    void AsyncStorage.setItem(`discover_filters_guide:${userId}`, "seen").catch(() => {});
    if (opened) { setOwner(null); return; }
    const timer = setTimeout(() => setOwner(null), 8000);
    scale.setValue(1);
    const scaleTo = (toValue: number, duration: number) =>
      Animated.timing(scale, {
        toValue,
        duration,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
        isInteraction: false,
      });
    const heartbeat = () => Animated.sequence([
      scaleTo(1.12, 180),
      scaleTo(1, 160),
      scaleTo(1.08, 150),
      scaleTo(1, 260),
    ]);
    const animation = Animated.sequence([
      Animated.delay(700),
      heartbeat(),
      Animated.delay(1400),
      heartbeat(),
      Animated.delay(1400),
      heartbeat(),
    ]);
    if (!reduceMotion) animation.start();
    return () => {
      clearTimeout(timer);
      animation.stop();
      scale.setValue(1);
    };
  }, [userId, owner, opened, visible, reduceMotion, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      {children}
    </Animated.View>
  );
}
