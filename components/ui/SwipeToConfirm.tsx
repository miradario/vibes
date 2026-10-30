import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import * as ds from "../../src/theme/tokens";

export type SwipeSize = "md" | "lg";
export type SwipeAccent = "accent" | "info";

/**
 * SwipeToConfirm (components-spec §1.2). Las pantallas conservan su gesto (PanResponder,
 * umbral y animación: no se cambia lógica); este módulo define la pista y el thumb.
 * md 56 (footer) / lg 72 (bloque principal), pill, borde 1 px; glow solo en lg (DUDA 4 ★).
 */
export const swipeToConfirmMetrics = (size: SwipeSize) => {
  const height = ds.componentSize.swipeToConfirm[size];
  const inset = ds.spacing[1];
  const thumb = height - inset * 2;
  return { height, inset, thumb, labelInset: thumb + inset + ds.spacing[3] };
};

const accentColors = {
  accent: { track: ds.colors.bg.selected, border: ds.withAlpha(ds.colors.base.mustard, ds.opacity.medium), fill: ds.withAlpha(ds.colors.base.mustard, ds.opacity.medium), glow: ds.glow.accent },
  info: { track: ds.colors.bg.surfaceTranslucent, border: ds.withAlpha(ds.colors.base.blue, ds.opacity.high), fill: ds.withAlpha(ds.colors.base.blue, ds.opacity.medium), glow: ds.glow.blue },
} as const;

export const swipeToConfirmFill = (accent: SwipeAccent) => accentColors[accent].fill;

/** Estilo de la pista. */
export function swipeToConfirmTrackStyle(size: SwipeSize, accent: SwipeAccent): ViewStyle {
  const m = swipeToConfirmMetrics(size);
  const c = accentColors[accent];
  return {
    minHeight: m.height,
    borderRadius: ds.radii.pill,
    backgroundColor: c.track,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden",
    justifyContent: "center",
    paddingLeft: m.labelInset,
    paddingRight: size === "lg" ? ds.spacing[6] : ds.spacing[4],
    ...(size === "lg" ? { ...c.glow, elevation: ds.shadows.md.elevation } : null),
  };
}

/** Estilo del thumb circular (posición absoluta; la pantalla le aplica translateX). */
export function swipeToConfirmThumbStyle(size: SwipeSize): ViewStyle {
  const m = swipeToConfirmMetrics(size);
  return { position: "absolute", left: m.inset, top: m.inset, width: m.thumb, height: m.thumb, borderRadius: ds.radii.pill, backgroundColor: ds.colors.bg.surface, alignItems: "center", justifyContent: "center", ...ds.shadows.sm };
}

type TrackProps = { size?: SwipeSize; accent?: SwipeAccent; style?: StyleProp<ViewStyle>; children?: React.ReactNode };

/** Pista presentacional, para envolver el copy y los chevrons de cada pantalla. */
export default function SwipeToConfirmTrack({ size = "md", accent = "accent", style, children }: TrackProps) {
  return <View style={[swipeToConfirmTrackStyle(size, accent), style]}>{children}</View>;
}

export const swipeToConfirmStyles = StyleSheet.create({ wrap: { position: "relative", justifyContent: "center" } });
