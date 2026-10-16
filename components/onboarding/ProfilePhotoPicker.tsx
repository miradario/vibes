import { launchAppCamera } from "../AppCamera";
import { vibesTheme } from "../../src/theme/vibesTheme";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "../Typography";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { CameraType } from "expo-image-picker";
import Icon from "../Icon";
import AnimatedSheetModal from "../AnimatedSheetModal";
import PhotoCropEditor, { type CropPhoto } from "./PhotoCropEditor";
import {
  ONBOARDING_COLORS,
  onboardingStyles,
} from "../../src/screens/Onboarding/vibesOnboardingStyles";
import { useI18n } from "../../src/i18n";

const IMAGE_MEDIA_TYPE = (ImagePicker as any).MediaType?.Images
  ? [(ImagePicker as any).MediaType.Images]
  : ["images"];
type ProfilePhotoPickerProps = {
  uris: string[];
  originalUris?: Record<string, string>;
  onChange: (uris: string[], originals?: Record<string, string>) => void;
};

const pickFromGallery = async (t: (key: string) => string, limit: number) => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      t("onboarding.photoPermissionGalleryTitle"),
      t("onboarding.photoPermissionGalleryMessage")
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: IMAGE_MEDIA_TYPE,
    allowsMultipleSelection: true,
    selectionLimit: limit,
    quality: 0.82,
  });

  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return result.assets.map((asset) => asset.uri);
};

const pickFromCamera = async (t: (key: string) => string) => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      t("onboarding.photoPermissionGalleryTitle"),
      t("onboarding.photoPermissionCameraMessage")
    );
    return null;
  }

  const result = await launchAppCamera({
    mediaTypes: IMAGE_MEDIA_TYPE,
    cameraType: Platform.OS === "android" ? CameraType.front : CameraType.back,
    allowsEditing: false,
    quality: 0.82,
  });

  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return result.assets[0].uri;
};

const ProfilePhotoPicker = ({ uris, originalUris = {}, onChange }: ProfilePhotoPickerProps) => {
  const { t, locale } = useI18n();
  const english = locale === "en";
  const [modalVisible, setModalVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cropPhoto, setCropPhoto] = useState<CropPhoto | null>(null);
  const cropResolve = useRef<((uri: string | null) => void) | null>(null);
  const normalizedOriginals = useRef(new Map<string, CropPhoto>());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; cropResolve.current?.(null); cropResolve.current = null; };
  }, []);
  const adjustPhoto = async (uri: string) => {
    uri = originalUris[uri] ?? uri;
    let source = normalizedOriginals.current.get(uri);
    if (!source) {
      // Decode orientation once. Preview and crop must use the same pixels and
      // dimensions, rather than mixing EXIF-oriented display with raw pixels.
      source = await manipulateAsync(uri, [], { compress: 1, format: SaveFormat.JPEG });
      if (normalizedOriginals.current.size >= 12) {
        const oldest = normalizedOriginals.current.keys().next().value;
        if (oldest) normalizedOriginals.current.delete(oldest);
      }
      normalizedOriginals.current.set(uri, source);
    }
    if (!mounted.current) return null;
    if (source.width <= 0 || source.height <= 0) throw new Error("Invalid photo dimensions");
    return new Promise<string | null>(resolve => {
      cropResolve.current = resolve;
      setCropPhoto(source);
    });
  };
  const editPhoto = async (index: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const uri = await adjustPhoto(uris[index]);
      if (uri && mounted.current) onChange(uris.map((photo, i) => i === index ? uri : photo),
        { ...originalUris, [uri]: originalUris[uris[index]] ?? uris[index] });
    } catch {
      Alert.alert(t("common.error"), english ? "Could not open the photo." : "No pudimos abrir la foto.");
    } finally { if (mounted.current) setBusy(false); }
  };
  const pendingSource = useRef<"camera" | "gallery" | null>(null);
  const remaining = 6 - uris.length;

  const choosePhoto = async () => {
    const source = pendingSource.current;
    pendingSource.current = null;
    if (!source || remaining <= 0 || busy) return;
    setBusy(true);
    try {
      const selected =
        source === "camera"
          ? await pickFromCamera(t)
          : await pickFromGallery(t, remaining);
      const originals = typeof selected === "string" ? [selected] : selected ?? [];
      const added: string[] = [];
      const originalsByUri = { ...originalUris };
      for (const uri of originals.slice(0, remaining)) {
        if (!mounted.current) break;
        const adjusted = await adjustPhoto(uri);
        if (!adjusted) break;
        added.push(adjusted);
        originalsByUri[adjusted] = originalUris[uri] ?? uri;
      }
      if (!mounted.current) return;
      if (added.length) {
        const nextPhotos = Array.from(new Set([...uris, ...added])).slice(0, 6);
        onChange(nextPhotos, originalsByUri);
        if (nextPhotos.length < 6) {
          Alert.alert(
            english ? "Photo added" : "Foto agregada",
            english ? "Would you like to add another photo?" : "¿Querés agregar otra foto?",
            [
              { text: english ? "Continue" : "Continuar", style: "cancel" },
              { text: english ? "Add another photo" : "Agregar otra foto", onPress: () => setModalVisible(true) },
            ]
          );
        }
      }
    } catch {
      Alert.alert(
        t("common.error"),
        english
          ? "Could not open your photos. Please try again."
          : "No pudimos abrir tus fotos. Intentá de nuevo."
      );
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const selectSource = (source: "camera" | "gallery") => {
    pendingSource.current = source;
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={onboardingStyles.photoPickerWrap}>
        <View style={onboardingStyles.photoButton}>
          {uris[0] ? (
            <Image source={{ uri: uris[0] }} style={onboardingStyles.photo} resizeMode="contain" />
          ) : (
            <Icon
              name="person-outline"
              size={42}
              color={ONBOARDING_COLORS.muted}
            />
          )}
        </View>
      </View>
      <Text style={styles.hint}>
        {english
          ? `${uris.length}/6 photos · Tap a photo to make it primary`
          : `${uris.length}/6 fotos · Tocá una foto para hacerla principal`}
      </Text>
      {uris.length > 0 && (
        <ScrollView
          horizontal
          style={styles.previews}
          contentContainerStyle={styles.previewContent}
          showsHorizontalScrollIndicator={false}
        >
          {uris.map((uri, index) => (
            <View key={uri} style={styles.previewItem}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                  english
                    ? `Make photo ${index + 1} primary`
                    : `Hacer principal la foto ${index + 1}`
                }
                accessibilityState={{ selected: index === 0 }}
                disabled={busy}
                onPress={() =>
                  onChange([uri, ...uris.filter((photo) => photo !== uri)])
                }
                style={[styles.thumbnail, index === 0 && styles.primary]}
              >
                <Image source={{ uri }} style={onboardingStyles.photo} resizeMode="contain" />
              </TouchableOpacity>
              <View style={styles.photoTools}>
              <TouchableOpacity accessibilityRole="button"
                accessibilityLabel={english ? `Adjust photo ${index + 1}` : `Ajustar foto ${index + 1}`}
                disabled={busy} style={styles.remove} onPress={() => void editPhoto(index)}>
                <Icon name="create-outline" size={20} color={ONBOARDING_COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                  english
                    ? `Remove photo ${index + 1}`
                    : `Quitar foto ${index + 1}`
                }
                disabled={busy}
                style={styles.remove}
                onPress={() => onChange(uris.filter((photo) => photo !== uri))}
              >
                <Icon
                  name="trash-outline"
                  size={20}
                  color={ONBOARDING_COLORS.coral}
                />
              </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      {remaining > 0 && (
        <TouchableOpacity
          accessibilityRole="button"
          disabled={busy}
          style={styles.add}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Icon
            name="images-outline"
            size={20}
            color={ONBOARDING_COLORS.text}
          />
          <Text style={styles.addText}>
            {uris.length > 0
              ? english ? "Add more photos" : "Agregar más fotos"
              : english ? "Add photos" : "Agregar fotos"}
          </Text>
        </TouchableOpacity>
      )}
      <AnimatedSheetModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onClosed={() => void choosePhoto()}
        sheetStyle={styles.sheet}
      >
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.row}
          onPress={() => selectSource("camera")}
        >
          <Text style={styles.rowText}>{t("onboarding.camera")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.row}
          onPress={() => selectSource("gallery")}
        >
          <Text style={styles.rowText}>{t("onboarding.gallery")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.cancel}
          onPress={() => setModalVisible(false)}
        >
          <Text style={styles.cancelText}>{t("common.cancel")}</Text>
        </TouchableOpacity>
      </AnimatedSheetModal>
      <PhotoCropEditor photo={cropPhoto} english={english} onDone={uri => {
        setCropPhoto(null);
        const resolve = cropResolve.current;
        cropResolve.current = null;
        resolve?.(uri);
      }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: "100%", alignItems: "center" },
  hint: {
    color: ONBOARDING_COLORS.muted,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    marginVertical: 8,
  },
  previews: { width: "100%", flexGrow: 0 },
  previewContent: { gap: 10 },
  previewItem: { width: 96, alignItems: "center" },
  photoTools: { flexDirection: "row", alignItems: "center" },
  thumbnail: {
    width: 76,
    height: 76,
    borderRadius: 38,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: ONBOARDING_COLORS.line,
  },
  primary: { borderColor: ONBOARDING_COLORS.mustard },
  remove: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  add: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: `${vibesTheme.colors.secondaryText}0C`,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addText: {
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    flexShrink: 1,
  },
  sheet: {
    borderRadius: 22,
    backgroundColor: vibesTheme.colors.background,
    overflow: "hidden",
  },
  row: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: ONBOARDING_COLORS.line,
  },
  rowText: {
    color: ONBOARDING_COLORS.text,
    fontSize: 16,
  },
  cancel: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: ONBOARDING_COLORS.coral,
    fontSize: 16,
  },
});

export default ProfilePhotoPicker;
