import React from "react";
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import { cardStyles } from "./surfaceStyles";
import * as ds from "../../src/theme/tokens";

/**
 * Skeletons de carga inicial (DS "Estados de carga"): bloques `text/secondary` con `opacity.soft`
 * (mismo tono que PersonCardSkeleton) que reservan la geometría de la tarjeta real. Sin spinner ni
 * texto "Cargando…" visible. El grupo expone un único label accesible con estado ocupado.
 */
type TextVariant = keyof typeof ds.textStyles;

export function SkeletonBlock({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.block, style]} />;
}

/** Línea con el alto (lineHeight) del estilo de texto que reemplaza. */
export function SkeletonLine({ text = "body", width = "100%" }: { text?: TextVariant; width?: DimensionValue }) {
  return <View style={[styles.block, styles.line, { height: ds.textStyles[text].lineHeight, width }]} />;
}

/** Pastilla de estado (texto `caption` + padding vertical `spacing/1`), como las de SessionCard. */
export function SkeletonPill({ width = "30%" }: { width?: DimensionValue }) {
  return <View style={[styles.block, styles.pill, { width }]} />;
}

/** Fila de Chips (alto `componentSize.chip`, pill). */
export function SkeletonChips({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.chips}>
      {Array.from({ length: count }, (_, index) => <View key={index} style={[styles.block, styles.chip]} />)}
    </View>
  );
}

/** Contenedor accesible: un solo nodo "Cargando …" con `busy`; los bloques no se anuncian. */
export function SkeletonGroup({ label, children, style }: { label: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.group, style]} accessible accessibilityLabel={label} accessibilityState={{ busy: true }}>
      {children}
    </View>
  );
}

/**
 * Card-fila (`cardStyles.base` + padding, fila con gap `spacing/3`): miniatura opcional con el estilo
 * de la foto real, líneas de texto y chevron opcional. `cardStyle` permite usar la superficie real
 * de la tarjeta cuando no es `cardStyles.base`.
 */
export function CardRowSkeleton({ thumb, lines, pill = false, chevron = false, cardStyle }: {
  thumb?: StyleProp<ViewStyle>;
  lines: ReadonlyArray<{ text?: TextVariant; width?: DimensionValue }>;
  pill?: boolean;
  chevron?: boolean;
  cardStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[cardStyle ?? [cardStyles.base, cardStyles.padding], styles.row]}>
      {thumb ? <SkeletonBlock style={thumb} /> : null}
      <View style={styles.copy}>
        {lines.map((line, index) => <SkeletonLine key={index} text={line.text} width={line.width} />)}
        {pill ? <SkeletonPill /> : null}
      </View>
      {chevron ? <SkeletonBlock style={styles.icon} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.soft) },
  line: { borderRadius: ds.radii.sm },
  pill: { height: ds.textStyles.caption.lineHeight + ds.spacing[1] * 2, marginTop: ds.spacing[1], borderRadius: ds.radii.pill },
  chips: { flexDirection: "row", gap: ds.spacing[2] },
  chip: { height: ds.componentSize.chip, width: "24%", borderRadius: ds.radii.pill },
  group: { gap: ds.spacing[3] },
  row: { flexDirection: "row", alignItems: "center", gap: ds.spacing[3] },
  copy: { flex: 1, gap: ds.spacing[1] },
  icon: { width: ds.iconSize.md, height: ds.iconSize.md, borderRadius: ds.radii.pill },
});
