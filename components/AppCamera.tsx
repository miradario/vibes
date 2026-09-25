import React, { useEffect, useRef, useState } from "react";
import { Alert, Image, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { CameraView, type CameraType } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import AnimatedSheetModal from "./AnimatedSheetModal";
import Icon from "./Icon";
import { Text } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";

type Request = {
  options: ImagePicker.ImagePickerOptions;
  resolve: (result: ImagePicker.ImagePickerResult) => void;
};
let openCamera: ((request: Request) => void) | undefined;

export function launchAppCamera(options: ImagePicker.ImagePickerOptions): Promise<ImagePicker.ImagePickerResult> {
  if (Platform.OS !== "android") return ImagePicker.launchCameraAsync(options);
  return new Promise((resolve, reject) => {
    if (!openCamera) return reject(new Error("Camera is not available"));
    openCamera({ options, resolve });
  });
}

export default function AppCamera() {
  const [request, setRequest] = useState<Request | null>(null);
  const requestRef = useRef<Request | null>(null);
  const camera = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>("front");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const pendingResult = useRef<ImagePicker.ImagePickerResult | null>(null);

  useEffect(() => {
    openCamera = (next) => {
      if (requestRef.current) {
        next.resolve({ canceled: true, assets: null });
        return;
      }
      requestRef.current = next;
      setFacing("front");
      setReady(false);
      setPhoto(null);
      setRequest(next);
    };
    return () => {
      openCamera = undefined;
      requestRef.current?.resolve({ canceled: true, assets: null });
      requestRef.current = null;
    };
  }, []);

  const close = (result: ImagePicker.ImagePickerResult) => {
    pendingResult.current = result;
    setRequest(null);
  };
  const capture = async () => {
    if (!ready || busyRef.current || !camera.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await camera.current.takePictureAsync({ quality: request?.options.quality ?? 0.85 });
      if (result && requestRef.current && !pendingResult.current) {
        setPhoto({ uri: result.uri, width: result.width, height: result.height, type: "image", mimeType: "image/jpeg" });
      }
    } catch {
      Alert.alert("Cámara", "No se pudo tomar la foto. Intentá de nuevo.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  return (
    <AnimatedSheetModal visible={Boolean(request)} fullScreen closeOnBackdropPress={false}
      onClose={() => close({ canceled: true, assets: null })}
      onClosed={() => {
        const current = requestRef.current;
        requestRef.current = null;
        const result = pendingResult.current;
        pendingResult.current = null;
        current?.resolve(result ?? { canceled: true, assets: null });
      }}
      sheetStyle={styles.sheet}>
      {request ? <>
        <View style={styles.preview}>
          {photo ? <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" /> :
            <CameraView ref={camera} style={StyleSheet.absoluteFill} facing={facing} mode="picture"
              onCameraReady={() => setReady(true)}
              onMountError={() => {
                Alert.alert("Cámara", "No se pudo abrir la cámara.");
                close({ canceled: true, assets: null });
              }} />}
        </View>
        <View style={styles.controls}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar cámara" style={styles.button}
            onPress={() => close({ canceled: true, assets: null })}>
            <Icon name="close" size={30} color={vibesTheme.colors.background} />
          </TouchableOpacity>
          {photo ? <>
            <TouchableOpacity style={styles.button} onPress={() => { setReady(false); setPhoto(null); }}>
              <Text style={styles.label}>Repetir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => close({ canceled: false, assets: [photo] })}>
              <Text style={styles.label}>Usar foto</Text>
            </TouchableOpacity>
          </> : <>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Tomar foto" style={styles.capture}
              disabled={!ready || busy} onPress={() => void capture()}>
              <Icon name="camera" size={32} color={vibesTheme.colors.primaryText} />
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cambiar cámara" style={styles.button}
              disabled={busy} onPress={() => { setReady(false); setFacing(current => current === "front" ? "back" : "front"); }}>
              <Icon name="camera-reverse-outline" size={30} color={vibesTheme.colors.background} />
            </TouchableOpacity>
          </>}
        </View>
      </> : null}
    </AnimatedSheetModal>
  );
}
const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: vibesTheme.colors.primaryText },
  preview: { flex: 1, marginTop: 40 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingTop: 16, paddingBottom: 40 },
  button: { minWidth: 60, minHeight: 60, alignItems: "center", justifyContent: "center" },
  capture: { width: 72, height: 72, borderRadius: 36, backgroundColor: vibesTheme.colors.accentMustard, alignItems: "center", justifyContent: "center" },
  label: { color: vibesTheme.colors.background, fontSize: 16 },
});
