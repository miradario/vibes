import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, PanResponder, StyleSheet, TouchableOpacity, View, useWindowDimensions, type GestureResponderEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import AnimatedSheetModal from "../AnimatedSheetModal";
import { Text } from "../Typography";
import { vibesTheme } from "../../src/theme/vibesTheme";
import { constrainPhotoCrop, photoCropRect, type CropTransform } from "../../src/lib/photoCrop";
import { buttonContentColor, buttonLabel, buttonStyle } from "../ui/buttonStyles";
import * as ds from "../../src/theme/tokens";

export type CropPhoto = { uri: string; width: number; height: number };

const touchPoint = (event: GestureResponderEvent) => {
  const touches = event.nativeEvent.touches;
  const first = touches[0];
  const second = touches[1];
  return {
    count: touches.length,
    x: second ? (first.locationX + second.locationX) / 2 : first?.locationX ?? 0,
    y: second ? (first.locationY + second.locationY) / 2 : first?.locationY ?? 0,
    distance: second ? Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY) : 0,
  };
};

export default function PhotoCropEditor({ photo, english, onDone }: {
  photo: CropPhoto | null;
  english: boolean;
  onDone: (uri: string | null) => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const size = Math.max(100, Math.min(width - 48, height - insets.top - insets.bottom - 260));
  const current = useRef<CropTransform>({ zoom: 1, x: 0, y: 0 });
  const [transform, setTransform] = useState(current.current);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [original, setOriginal] = useState(false);
  const result = useRef<string | null>(null);
  const requestVersion = useRef(0);
  const gesture = useRef<ReturnType<typeof touchPoint> & { value: CropTransform } | null>(null);
  const update = (next: CropTransform) => { current.current = next; setTransform(next); };
  const reset = () => {
    if (!photo) return;
    const fit = size / Math.min(photo.width, photo.height);
    update({ zoom: 1, x: (size - photo.width * fit) / 2, y: (size - photo.height * fit) / 2 });
  };
  useEffect(() => {
    requestVersion.current += 1;
    setClosing(false); closingRef.current = false; setBusy(false); busyRef.current = false; result.current = null;
    setReady(false); setOriginal(false); gesture.current = null; reset();
    return () => { requestVersion.current += 1; };
  }, [photo, size]);

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !busyRef.current,
    onMoveShouldSetPanResponder: () => !busyRef.current,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: event => {
      gesture.current = { ...touchPoint(event), value: current.current };
    },
    onPanResponderMove: event => {
      if (!photo || busyRef.current) return;
      const next = touchPoint(event);
      const start = gesture.current;
      if (!start || start.count !== next.count) {
        gesture.current = { ...next, value: current.current }; return;
      }
      setOriginal(false);
      const zoom = Math.max(1, Math.min(4, start.value.zoom * (start.distance > 0 ? next.distance / start.distance : 1)));
      const ratio = zoom / start.value.zoom;
      update(constrainPhotoCrop(photo.width, photo.height, size, {
        zoom, x: next.x - (start.x - start.value.x) * ratio,
        y: next.y - (start.y - start.value.y) * ratio,
      }));
    },
    onPanResponderRelease: () => { gesture.current = null; },
    onPanResponderTerminate: () => { gesture.current = null; },
  }), [photo, size]);

  const close = (uri: string | null) => {
    if (closingRef.current) return;
    closingRef.current = true; result.current = uri; setClosing(true);
  };
  const save = async () => {
    if (!photo || busyRef.current || closingRef.current || !ready) return;
    if (original) { close(photo.uri); return; }
    busyRef.current = true; setBusy(true);
    const version = requestVersion.current;
    try {
      const crop = photoCropRect(photo.width, photo.height, size, current.current);
      const edited = await manipulateAsync(photo.uri, [
        { crop }, ...(crop.width > 1080 ? [{ resize: { width: 1080 } }] : []),
      ], { compress: 0.85, format: SaveFormat.JPEG });
      if (version === requestVersion.current) close(edited.uri);
    } catch {
      if (version === requestVersion.current) Alert.alert(english ? "Photo" : "Foto",
        english ? "Could not adjust the photo. Please try again." : "No pudimos ajustar la foto. Intentá de nuevo.");
    } finally {
      if (version === requestVersion.current) { busyRef.current = false; setBusy(false); }
    }
  };
  const fit = photo ? original ? size / Math.max(photo.width, photo.height)
    : size / Math.min(photo.width, photo.height) * transform.zoom : 1;
  const changeZoom = (delta: number) => {
    if (!photo || busyRef.current) return;
    setOriginal(false);
    const value = current.current;
    const zoom = Math.max(1, Math.min(4, value.zoom + delta));
    const ratio = zoom / value.zoom;
    update(constrainPhotoCrop(photo.width, photo.height, size, {
      zoom, x: size / 2 - (size / 2 - value.x) * ratio,
      y: size / 2 - (size / 2 - value.y) * ratio,
    }));
  };
  return <AnimatedSheetModal visible={Boolean(photo) && !closing} fullScreen closeOnBackdropPress={false}
    onClose={() => { if (!busyRef.current) close(null); }} onClosed={() => onDone(result.current)}
    sheetStyle={styles.sheet}>
    <View style={[styles.content, { paddingTop: insets.top + ds.spacing[5], paddingBottom: insets.bottom + ds.spacing[5] }]}>
      <Text accessibilityRole="header" style={styles.title}>{english ? "Adjust your photo" : "Ajustá tu foto"}</Text>
      <Text style={styles.hint}>{original
        ? (english ? "Original photo · No crop" : "Foto original · Sin recorte")
        : (english ? "Drag to move · Pinch to zoom" : "Mové la foto · Pellizcá para hacer zoom")}</Text>
      <View style={[styles.frame, { width: size, height: size, borderRadius: original ? ds.radii.lg : size / 2 }]} {...pan.panHandlers}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {photo ? <Image source={{ uri: photo.uri }} resizeMode="stretch"
          onLoad={() => setReady(true)} onError={() => setReady(false)}
          style={{ position: "absolute", width: photo.width * fit, height: photo.height * fit,
            left: original ? (size - photo.width * fit) / 2 : transform.x,
            top: original ? (size - photo.height * fit) / 2 : transform.y }} /> : null}
        {!original ? <View pointerEvents="none" style={[styles.guide, { borderRadius: size / 2 }]} /> : null}
        </View>
      </View>
      <View style={styles.tools}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={english ? "Zoom out" : "Alejar"}
          disabled={busy || transform.zoom <= 1} style={styles.secondary} onPress={() => changeZoom(-0.25)}>
          <Text style={styles.text}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.secondary}
          onPress={() => { reset(); setOriginal(true); }}>
          <Text style={styles.text}>{english ? "Reset" : "Restablecer"}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={english ? "Zoom in" : "Acercar"}
          disabled={busy || transform.zoom >= 4} style={styles.secondary} onPress={() => changeZoom(0.25)}>
          <Text style={styles.text}>+</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={() => close(null)}>
          <Text style={styles.text}>{english ? "Cancel" : "Cancelar"}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" disabled={busy || !ready} style={[styles.primary, (busy || !ready) && styles.disabled]} onPress={() => void save()}>
          <Text style={styles.primaryText}>{busy ? (english ? "Saving…" : "Guardando…") : (english ? "Use photo" : "Usar foto")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </AnimatedSheetModal>;
}

const colors = vibesTheme.colors;
const styles = StyleSheet.create({
  sheet: { height: "100%", backgroundColor: colors.background },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: ds.spacing[6], gap: ds.spacing[4] },
  title: { color: colors.primaryText, ...ds.textStyles.title, textAlign: "center" },
  hint: { color: colors.secondaryText, ...ds.textStyles.bodySmall, textAlign: "center" },
  frame: { overflow: "hidden", backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle), borderRadius: ds.radii.lg },
  guide: { ...StyleSheet.absoluteFillObject, borderWidth: 1, borderColor: colors.background },
  tools: { flexDirection: "row", gap: ds.spacing[3] },
  actions: { flexDirection: "row", width: "100%", gap: ds.spacing[3] },
  secondary: { minHeight: 48, minWidth: 48, padding: ds.spacing[3], borderRadius: ds.radii.lg, alignItems: "center", justifyContent: "center", backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle) },
  text: { color: colors.primaryText, ...ds.textStyles.subtitle },
  primary: {
    ...buttonStyle("primary", "md"),
    flex: 1,
  },
  primaryText: {
    ...buttonLabel("md", "primary"),
  },
  disabled: { opacity: 0.5 },
});
