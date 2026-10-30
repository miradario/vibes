import React, { useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "../Typography";
import { moveRangeThumb } from "../../src/lib/rangeSlider";
import * as ds from "../../src/theme/tokens";

/**
 * RangeSlider / Slider (components-spec §1.7, DUDA 12 ★): área táctil 44, thumb 24 en
 * `action/accent` con borde 2 `bg/surface` + `shadows.sm`, pista 4 pill `border/default`,
 * rango activo `action/accent`. "Sin límite" como botón ghost.
 */
const HIT = ds.touchTarget;
const TRACK = ds.componentSize.slider.track;
const THUMB = ds.componentSize.slider.thumb;
export default function RangeSlider({ label, minimum, maximum, lower, upper, unit, onChange, onClear, noLimitLabel = "Sin límite", single = false, disabled = false }: {
  label: string; minimum: number; maximum: number; lower: number | null; upper: number | null;
  unit: string; onChange: (lower: number, upper: number) => void; onClear?: () => void; noLimitLabel?: string; single?: boolean; disabled?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const low = Math.max(minimum, Math.min(maximum, lower ?? minimum));
  const high = Math.max(low, Math.min(maximum, upper ?? (single ? minimum : maximum)));
  const track = Math.max(1, width - HIT);
  const latest = useRef({ low, high, track, minimum, maximum, onChange, disabled, single });
  latest.current = { low, high, track, minimum, maximum, onChange, disabled, single };
  const start = useRef(0);
  const collapsed = useRef(false);
  const responders = useMemo(() => (["lower", "upper"] as const).map(thumb => PanResponder.create({
    onStartShouldSetPanResponder: () => !latest.current.disabled,
    onPanResponderGrant: () => { start.current = thumb === "lower" ? latest.current.low : latest.current.high; collapsed.current = latest.current.low === latest.current.high; },
    onPanResponderMove: (_, gesture) => {
      const current = latest.current;
      if (current.disabled) return;
      const value = start.current + gesture.dx / current.track * (current.maximum - current.minimum);
      const moving = current.single ? "upper" : collapsed.current ? gesture.dx > 0 ? "upper" : "lower" : thumb;
      const result = moveRangeThumb(current.minimum, current.maximum, current.low, current.high, moving, value);
      current.onChange(...result);
    },
  })), []);
  const x = (value: number) => (value - minimum) / (maximum - minimum) * track;
  return <View style={{ gap: ds.spacing[3], opacity: disabled ? ds.opacity.disabled : 1 }}>
    <View style={s.heading}>
      <Text style={[s.title, single && { ...ds.textStyles.body }, { flex: 1 }]}>{label}</Text>
      {single ? (upper === null ? null : <View style={s.valuePill}><Text style={s.clearText}>{`${high}/10`}</Text></View>) : <TouchableOpacity accessibilityRole="button" onPress={onClear} style={s.clearGhost}>
        <Text style={s.clearText}>{noLimitLabel}</Text>
      </TouchableOpacity>}
    </View>
    <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ height: HIT }}>
      <View style={[s.track, { left: HIT / 2, right: HIT / 2 }]} />
      <View style={[s.track, { left: HIT / 2 + x(low), width: x(high) - x(low), backgroundColor: ds.colors.action.accent }]} />
      {([low, high] as const).map((value, index) => single && index === 0 ? null : <View key={index}
        accessible accessibilityRole="adjustable" accessibilityLabel={single ? label : `${label}, ${index === 0 ? "desde" : "hasta"}`}
        accessibilityState={{ disabled }}
        accessibilityValue={{ min: index === 0 ? minimum : low, max: index === 0 ? high : maximum, now: value, text: `${value} ${unit}` }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={event => !disabled && onChange(...moveRangeThumb(minimum, maximum, low, high, index === 0 ? "lower" : "upper", value + (event.nativeEvent.actionName === "increment" ? 1 : -1)))}
        style={[s.hit, { left: x(value), zIndex: index === 0 && low === high ? 2 : 1 }]} {...responders[index].panHandlers}>
        <View style={s.thumb} />
      </View>)}
    </View>
    {!single && <View style={s.heading}><Text style={s.value}>{low} {unit}</Text><Text style={s.value}>{upper === null ? noLimitLabel : `${high} ${unit}`}</Text></View>}
  </View>;
}
const s = StyleSheet.create({
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: ds.spacing[3] },
  title: { color: ds.colors.text.primary, ...ds.textStyles.title },
  /** Pastilla de valor del slider simple (sin cambio visual). */
  valuePill: { borderRadius: ds.radii.xl, paddingHorizontal: ds.spacing[4], paddingVertical: ds.spacing[3], backgroundColor: ds.colors.bg.subtle },
  clearText: { color: ds.colors.text.primary, ...ds.textStyles.label },
  clearGhost: { minHeight: HIT, justifyContent: "center", paddingHorizontal: ds.spacing[3], borderRadius: ds.radii.pill },
  track: { position: "absolute", top: (HIT - TRACK) / 2, height: TRACK, borderRadius: ds.radii.pill, backgroundColor: ds.colors.border.default },
  hit: { position: "absolute", top: 0, width: HIT, height: HIT, alignItems: "center", justifyContent: "center" },
  thumb: { width: THUMB, height: THUMB, borderRadius: ds.radii.pill, backgroundColor: ds.colors.action.accent, borderWidth: 2, borderColor: ds.colors.bg.surface, ...ds.shadows.sm },
  value: { color: ds.colors.text.secondary, ...ds.textStyles.body },
});
