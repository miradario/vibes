import { useVibiRuntime } from "../src/vibi/useMotionPreference";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";
import { Text } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";

export default function ProfileWithoutPhoto({ name, age, zodiac, active = true }: { name: string; age?: string | number; zodiac?: string; active?: boolean }) {
  const { width, height } = useWindowDimensions();
  const positions = useRef(Array.from({ length: 6 }, () => new Animated.ValueXY({ x: 0, y: 0 }))).current;
  const runtime = useVibiRuntime();
  useEffect(() => {
    if (!active || !runtime.active || !runtime.motionReady || runtime.reducedMotion) {
      positions.forEach(position => position.setValue({ x: 0, y: 0 }));
      return;
    }
    let disposed = false;
    const animations = new Map<number, Animated.CompositeAnimation>();
    const move = (index: number) => {
      if (disposed) return;
      const range = index === 5 ? 10 : index < 3 ? 40 : 26;
      const animation = Animated.timing(positions[index], {
        toValue: { x: (Math.random() * 2 - 1) * range, y: (Math.random() * 2 - 1) * range },
        duration: 2400 + Math.random() * 2600,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
        isInteraction: false,
      });
      animations.set(index, animation);
      animation.start(({ finished }) => { if (finished && !disposed) move(index); });
    };
    positions.forEach((_, index) => move(index));
    return () => {
      disposed = true;
      animations.forEach(animation => animation.stop());
      positions.forEach(position => position.stopAnimation());
    };
  }, [active, runtime.active, runtime.motionReady, runtime.reducedMotion, positions]);
  const float = (index: number) => ({ transform: positions[index].getTranslateTransform() });
  const diameter = Math.min(width * 0.55, height * 0.3, 260);
  const initial = Array.from(name.trim())[0]?.toLocaleUpperCase("es-AR") || "?";
  return <View pointerEvents="none" style={s.canvas}>
    <Animated.View style={[s.orb, float(0), { width: width * 0.85, height: width * 0.85, right: -width * 0.3, top: -width * 0.2, backgroundColor: `${c.accentBlue}18` }]} />
    <Animated.View style={[s.orb, float(1), { width: width * 0.7, height: width * 0.7, left: -width * 0.38, top: height * 0.2, backgroundColor: `${c.accentMustard}14` }]} />
    <Animated.View style={[s.orb, float(2), { width: width * 0.85, height: width * 0.85, right: -width * 0.5, bottom: -width * 0.15, borderWidth: 1, borderColor: `${c.accentBlue}30` }]} />
    <Animated.View style={[s.dot, float(3), { top: "23%", right: "15%", width: 22, height: 22 }]} />
    <Animated.View style={[s.dot, float(4), { top: "53%", left: "17%", width: 12, height: 12 }]} />
    <View style={s.identity}>
      <Animated.View style={[s.avatar, float(5), { width: diameter, height: diameter, borderRadius: diameter / 2 }]}><Text style={[s.initial, { fontSize: diameter * 0.48, lineHeight: diameter * 0.6 }]}>{initial}</Text></Animated.View>
      <Text style={s.caption}>Sin foto de perfil</Text>
      <Text style={s.name} numberOfLines={2}>{name}{age ? `, ${age}` : ""}</Text>
      {zodiac ? <Text style={s.zodiac}>{zodiac}</Text> : null}
    </View>
  </View>;
}
const c = vibesTheme.colors;
const s = StyleSheet.create({
  canvas: { ...StyleSheet.absoluteFillObject, backgroundColor: c.background, overflow: "hidden", justifyContent: "center", alignItems: "center" },
  orb: { position: "absolute", borderRadius: 999 },
  dot: { position: "absolute", borderRadius: 30, backgroundColor: c.accentCoral },
  identity: { alignItems: "center", paddingHorizontal: 28, width: "100%", transform: [{ translateY: -28 }] },
  avatar: { alignItems: "center", justifyContent: "center", backgroundColor: `${c.accentBlue}20`, borderWidth: 3, borderColor: c.surface },
  initial: { color: c.accentBlue, fontFamily: vibesTheme.fonts.bold },
  caption: { color: c.secondaryText, fontSize: 13, marginTop: 10 },
  name: { color: c.primaryText, fontFamily: vibesTheme.fonts.bold, fontSize: 30, lineHeight: 36, textAlign: "center", marginTop: 22 },
  zodiac: { color: c.secondaryText, fontSize: 19, marginTop: 6 },
});
