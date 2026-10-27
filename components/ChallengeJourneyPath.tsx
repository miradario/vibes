import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useIsFocused } from "@react-navigation/native";
import { Text } from "./Typography";
import Icon from "./Icon";
import { vibesTheme } from "../src/theme/vibesTheme";
import { useVibiRuntime } from "../src/vibi/useMotionPreference";

const c = vibesTheme.colors;
const PITCH = 94;
const TOP = 42;

export default function ChallengeJourneyPath({ totalDays, currentDay, completedDays }: {
  totalDays: number; currentDay: number; completedDays: number[];
}) {
  const [width, setWidth] = useState(300);
  const focused = useIsFocused();
  const { active, reducedMotion, motionReady } = useVibiRuntime();
  const travel = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const today = Math.max(1, Math.min(totalDays, currentDay));
  const first = Math.max(1, today - 3);
  const last = Math.min(totalDays, Math.max(first + 5, today + 2));
  const days = Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => first + i);
  const x = (index: number) => width * 0.44 + (index % 2 ? 15 : -15);
  const y = (index: number) => TOP + index * PITCH;
  const target = today - first;
  const points = useMemo(() => {
    const result = [{ x: x(0), y: y(0) }];
    for (let i = 0; i < target; i++) {
      for (let step = 1; step <= 20; step++) {
        const t = step / 20;
        const smooth = t * t * (3 - 2 * t);
        result.push({ x: x(i) + (x(i + 1) - x(i)) * smooth, y: y(i) + PITCH * (1.5 * t - 1.5 * t * t + t * t * t) });
      }
    }
    return result.length > 1 ? result : [result[0], result[0]];
  }, [target, width]);
  useEffect(() => {
    travel.stopAnimation(); float.stopAnimation();
    if (!motionReady || !active || !focused) return;
    if (reducedMotion) { travel.setValue(1); float.setValue(0); return; }
    travel.setValue(0); float.setValue(0);
    const arrival = Animated.timing(travel, { toValue: 1, duration: Math.max(900, target * 650), easing: Easing.inOut(Easing.cubic), useNativeDriver: true });
    const breathing = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    arrival.start(); breathing.start();
    return () => { arrival.stop(); breathing.stop(); };
  }, [active, focused, reducedMotion, motionReady, target, width, travel, float]);
  const range = points.map((_, i) => i / (points.length - 1));
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <Text style={s.count}>{completedDays.filter(day => day >= 1 && day <= totalDays).length} de {totalDays} días completados</Text>
    <View style={{ height: TOP * 2 + (days.length - 1) * PITCH }} accessibilityLabel={`Día actual ${currentDay} de ${totalDays}`}>
      <Svg width={width} height="100%" style={StyleSheet.absoluteFill} accessible={false}>
        {days.slice(0, -1).map((day, i) => <Path key={day}
          d={`M ${x(i)} ${y(i)} C ${x(i)} ${y(i) + PITCH / 2} ${x(i + 1)} ${y(i) + PITCH / 2} ${x(i + 1)} ${y(i + 1)}`}
          fill="none" stroke={completedDays.includes(day) ? c.accentBlue : c.secondaryText}
          strokeOpacity={completedDays.includes(day) ? 0.85 : 0.18} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={completedDays.includes(day) ? undefined : "7 10"} />)}
      </Svg>
      {days.map((day, i) => {
        const done = completedDays.includes(day);
        const isToday = day === currentDay;
        return <View key={day} style={[s.dayRow, { top: y(i) - 22, left: x(i) - 22 }]}>
          {isToday ? <Text style={s.today}>HOY</Text> : null}
          <View style={[s.node, (done || isToday) && s.nodeActive, isToday && s.current]}>
            {done ? <Icon name="checkmark" size={25} color={c.surface} /> : <Text style={[s.number, isToday && { color: c.surface }]}>{day}</Text>}
          </View>
          <Text numberOfLines={isToday ? 2 : 1} style={[s.dayLabel, { maxWidth: width - x(i) - 36 }, isToday && s.currentLabel]}>{isToday ? (done ? "¡Completaste el desafío hoy!" : "Aún debes completar el desafío hoy") : `Día ${day}`}</Text>
        </View>;
      })}
      <Animated.View pointerEvents="none" style={[s.mascot, { transform: [
        { translateX: travel.interpolate({ inputRange: range, outputRange: points.map(p => p.x - 96) }) },
        { translateY: travel.interpolate({ inputRange: range, outputRange: points.map(p => p.y - 32) }) },
      ] }]}>
        <Animated.View style={{ transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }, { rotate: float.interpolate({ inputRange: [0, 1], outputRange: ["-4deg", "4deg"] }) }] }}>
          <Image source={require("../assets/branding/vibes-logo-palette.png")} style={{ width: 62, height: 62 }} resizeMode="contain" accessible={false} />
        </Animated.View>
      </Animated.View>
    </View>
    {last < totalDays ? <Text style={s.more}>El recorrido continúa hasta el día {totalDays}</Text> : null}
  </View>;
}
const s = StyleSheet.create({
  count: { color: c.secondaryText, fontSize: 16, fontFamily: vibesTheme.fonts.semibold, marginBottom: 20 },
  dayRow: { position: "absolute", flexDirection: "row", alignItems: "center", gap: 14 },
  node: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface, borderWidth: 2, borderColor: `${c.secondaryText}40`, alignItems: "center", justifyContent: "center" },
  nodeActive: { backgroundColor: c.accentBlue, borderColor: c.accentBlue },
  current: { transform: [{ scale: 1.15 }], borderWidth: 5, borderColor: `${c.accentBlue}40` },
  number: { fontFamily: vibesTheme.fonts.bold, fontSize: 20, color: c.secondaryText },
  today: { position: "absolute", top: -28, left: 0, color: c.accentBlue, fontFamily: vibesTheme.fonts.bold, fontSize: 13 },
  dayLabel: { fontSize: 15, color: c.secondaryText, fontFamily: vibesTheme.fonts.medium },
  currentLabel: { color: c.primaryText, fontFamily: vibesTheme.fonts.bold },
  mascot: { position: "absolute", left: 0, top: 0 },
  more: { color: c.secondaryText, fontSize: 12, textAlign: "center", marginBottom: 12 },
});
