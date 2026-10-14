import React, { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { vibesTheme } from "../src/theme/vibesTheme";
import { useCalmMotion } from "../src/hooks/useCalmMotion";

export default function DiscoverFiltersGuide({ userId, opened }: { userId?: string; opened: boolean }) {
  const [owner, setOwner] = useState<string | null>(null);
  const { visible, reduceMotion } = useCalmMotion();
  const pulse = useRef(new Animated.Value(0)).current;
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
    pulse.setValue(0);
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true, isInteraction: false }),
      Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true, isInteraction: false }),
    ]));
    if (!reduceMotion) animation.start();
    return () => { clearTimeout(timer); animation.stop(); };
  }, [userId, owner, opened, visible, reduceMotion, pulse]);
  if (!userId || owner !== userId || opened) return null;
  return <Animated.View pointerEvents="none" accessible={false} style={{
    position: "absolute", width: 48, height: 48, left: "50%", top: "50%", marginLeft: -24, marginTop: -24,
    borderRadius: 24, borderWidth: 2, borderColor: vibesTheme.colors.accentCoral,
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, .35] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }],
  }} />;
}
