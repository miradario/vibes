import React, { useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import { Text } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";

const MIN = 1;
const MAX = 10;
const THUMB_RADIUS = 13;
const clamp = (value: number) => Math.max(MIN, Math.min(MAX, Math.round(value)));

export default function EnergySlider({ label, value, disabled = false, onChange }: {
  label: string;
  value?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const current = useRef({ width, disabled, onChange });
  current.current = { width, disabled, onChange };
  const responder = useMemo(() => {
    const update = (x: number) => {
      const latest = current.current;
      if (latest.disabled || latest.width <= THUMB_RADIUS * 2) return;
      const fraction = (x - THUMB_RADIUS) / (latest.width - THUMB_RADIUS * 2);
      latest.onChange(clamp(MIN + fraction * (MAX - MIN)));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !current.current.disabled,
      onMoveShouldSetPanResponder: (_, gesture) => !current.current.disabled && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: (event) => update(event.nativeEvent.locationX),
      onPanResponderMove: (event) => update(event.nativeEvent.locationX),
    });
  }, []);
  const position = ((value ?? MIN) - MIN) / (MAX - MIN) * Math.max(0, width - THUMB_RADIUS * 2);
  return <View style={[styles.container, disabled && styles.disabled]}>
    <View style={styles.heading}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value === undefined ? "Elegí" : `${value}/10`}</Text>
    </View>
    <View accessible accessibilityRole="adjustable" accessibilityLabel={label}
      accessibilityState={{ disabled }}
      accessibilityValue={{ min: MIN, max: MAX, ...(value === undefined ? {} : { now: value }), text: value === undefined ? "Sin elegir" : `${value} de 10` }}
      accessibilityActions={[{ name: "increment", label: "Aumentar" }, { name: "decrement", label: "Disminuir" }]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (disabled) return;
        if (nativeEvent.actionName === "increment") onChange(clamp(value === undefined ? MIN : value + 1));
        if (nativeEvent.actionName === "decrement") onChange(clamp(value === undefined ? MIN : value - 1));
      }}
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
      style={styles.control} {...responder.panHandlers}>
      <View pointerEvents="none" style={styles.track} />
      <View pointerEvents="none" style={[styles.fill, { width: position }]} />
      <View pointerEvents="none" style={[styles.thumb, { left: position }]} />
    </View>
    <View pointerEvents="none" style={styles.endpoints}>
      <Text style={styles.endpoint}>1</Text><Text style={styles.endpoint}>10</Text>
    </View>
  </View>;
}
const colors = vibesTheme.colors;
const styles = StyleSheet.create({
  container: { gap: 4 },
  disabled: { opacity: 0.5 },
  heading: { flexDirection: "row", alignItems: "center", gap: 12 },
  label: { flex: 1, fontSize: 18, color: colors.primaryText, fontFamily: vibesTheme.fonts.medium },
  value: { fontSize: 18, color: colors.primaryText, minWidth: 48, textAlign: "right" },
  control: { height: 48, justifyContent: "center" },
  track: { height: 6, position: "absolute", left: THUMB_RADIUS, right: THUMB_RADIUS, borderRadius: 3, backgroundColor: colors.accentBlue, opacity: 0.25 },
  fill: { height: 6, position: "absolute", left: THUMB_RADIUS, borderRadius: 3, backgroundColor: colors.accentBlue },
  thumb: { width: THUMB_RADIUS * 2, height: THUMB_RADIUS * 2, borderRadius: THUMB_RADIUS, borderWidth: 2, borderColor: colors.primaryText, backgroundColor: colors.accentMustard, position: "absolute", top: 11 },
  endpoints: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8 },
  endpoint: { fontSize: 16, color: colors.secondaryText },
});
