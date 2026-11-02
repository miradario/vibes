import { launchAppCamera } from "../AppCamera";
import { vibesTheme } from "../../src/theme/vibesTheme";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  InteractionManager,
  Platform,
  Image,
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
import * as ds from "../../src/theme/tokens";

const IMAGE_MEDIA_TYPE = (ImagePicker as any).MediaType?.Images
  ? [(ImagePicker as any).MediaType.Images]
  : ["images"];
type ProfilePhotoPickerProps = {
  uris: string[];
  requestOpen?: number;
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

const ProfilePhotoPicker = ({ uris, originalUris = {}, onChange, requestOpen }: ProfilePhotoPickerProps) => {
  const { t, locale } = useI18n();
  const english = locale === "en";
  const [modalVisible, setModalVisible] = useState(false);
  const consumedRequest = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (requestOpen && consumedRequest.current !== requestOpen && uris.length < 6) {
      const task = InteractionManager.runAfterInteractions(() => {
        consumedRequest.current = requestOpen;
        setModalVisible(true);
      });
      return () => task.cancel();
    }
  }, [requestOpen,uris.length]);
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
  const [gridWidth, setGridWidth] = useState(0);
  const [photoMenuIndex, setPhotoMenuIndex] = useState<number | null>(null);
  const pendingEditIndex = useRef<number | null>(null);
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
      <View style={styles.mainPhotoWrap}>
        <TouchableOpacity style={styles.mainPhoto} accessibilityRole="button"
          accessibilityLabel={uris[0] ? (english ? "Adjust profile photo" : "Ajustar foto de perfil") : (english ? "Add profile photo" : "Agregar foto de perfil")}
          disabled={busy} activeOpacity={0.8}
          onPress={() => uris[0] ? void editPhoto(0) : setModalVisible(true)}>
          {uris[0] ? <Image source={{ uri: uris[0] }} style={onboardingStyles.photo} resizeMode="contain" />
            : <Icon name="person-outline" size={ds.iconSize.xxl} color={vibesTheme.colors.secondaryText} />}
        </TouchableOpacity>
        {uris[0] ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={english ? "Edit main photo" : "Editar foto principal"}
          disabled={busy} style={styles.mainEdit} onPress={() => void editPhoto(0)}>
          <Icon name="create-outline" size={ds.iconSize.md} color={vibesTheme.colors.primaryText} />
        </TouchableOpacity> : null}
      </View>
      {uris[0] ? <View style={styles.mainLabel}><Text style={styles.mainLabelText}>{english ? "Main photo" : "Foto principal"}</Text></View> : null}
      <View style={styles.gridHeading}>
        <Text style={styles.gridTitle}>{english ? "Your photos" : "Tus fotos"}</Text>
        <Text style={styles.gridCount}>{english ? `${uris.length} of 6` : `${uris.length} de 6`}</Text>
      </View>
      <View style={styles.grid} onLayout={event => setGridWidth(event.nativeEvent.layout.width)}>
        {Array.from({ length: 6 }, (_, index) => {
          const uri = uris[index];
          return <View key={index} style={[styles.tile, { width: gridWidth ? (gridWidth - 16) / 3 : 92 }, uri && index === 0 && styles.selectedTile]}>
            <TouchableOpacity style={styles.tileTouch} disabled={busy} activeOpacity={0.8} accessibilityRole="button"
              accessibilityState={{ selected: Boolean(uri && index === 0) }}
              accessibilityLabel={uri ? (english ? `Make photo ${index + 1} primary` : `Hacer principal la foto ${index + 1}`) : (english ? "Add photo" : "Agregar foto")}
              onPress={() => uri ? onChange([uri, ...uris.filter(photo => photo !== uri)]) : setModalVisible(true)}>
              {uri ? <Image source={{ uri }} style={onboardingStyles.photo} resizeMode="contain" />
                : <View style={styles.addCircle}><Icon name="add" size={ds.iconSize.lg} color={vibesTheme.colors.primaryText} /></View>}
            </TouchableOpacity>
            {uri ? <>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={english ? `Photo ${index + 1} options` : `Opciones de foto ${index + 1}`}
                disabled={busy} style={styles.photoMenu} onPress={() => setPhotoMenuIndex(index)}>
                <Icon name="ellipsis-vertical" size={ds.iconSize.md} color={vibesTheme.colors.primaryText} />
              </TouchableOpacity>
              {index === 0 ? <View pointerEvents="none" style={styles.selectedBadge}><Icon name="checkmark" size={ds.iconSize.sm} color={vibesTheme.colors.primaryText} /></View> : null}
            </> : null}
          </View>;
        })}
      </View>
      <Text style={styles.hint}>{english ? "Tap a photo to make it primary. Photos are optional." : "Tocá una foto para hacerla principal. Son opcionales."}</Text>
      {remaining > 0 ? <TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.add}
        onPress={() => setModalVisible(true)} activeOpacity={0.8}>
        <Icon name="images-outline" size={ds.iconSize.lg} color={vibesTheme.colors.primaryText} />
        <Text style={styles.addText}>{english ? "Add photos" : "Agregar fotos"}</Text>
      </TouchableOpacity> : null}
      <AnimatedSheetModal visible={photoMenuIndex !== null} onClose={() => setPhotoMenuIndex(null)} sheetStyle={styles.sheet}
        onClosed={() => {
          const index = pendingEditIndex.current; pendingEditIndex.current = null;
          if (index !== null) void editPhoto(index);
        }}>
        <TouchableOpacity accessibilityRole="button" style={styles.row} onPress={() => {
          pendingEditIndex.current = photoMenuIndex; setPhotoMenuIndex(null);
        }}><Text style={styles.rowText}>{english ? "Edit photo" : "Editar foto"}</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.row} onPress={() => {
          const uri = photoMenuIndex === null ? null : uris[photoMenuIndex];
          if (uri) onChange([uri, ...uris.filter(photo => photo !== uri)]);
          setPhotoMenuIndex(null);
        }}><Text style={styles.rowText}>{english ? "Make primary" : "Hacer principal"}</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.row} onPress={() => {
          onChange(uris.filter((_, index) => index !== photoMenuIndex)); setPhotoMenuIndex(null);
        }}><Text style={styles.cancelText}>{english ? "Remove photo" : "Quitar foto"}</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.cancel} onPress={() => setPhotoMenuIndex(null)}><Text style={styles.rowText}>{t("common.cancel")}</Text></TouchableOpacity>
      </AnimatedSheetModal>
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
  mainPhotoWrap: { width: 156, height: 156, position: "relative" },
  mainPhoto: { width: 156, height: 156, borderRadius: ds.radii.pill, borderWidth: 2, borderColor: vibesTheme.colors.accentBlue, backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle), alignItems: "center", justifyContent: "center", overflow: "hidden" },
  mainEdit: { position: "absolute", right: -2, bottom: -2, width: 44, height: 44, borderRadius: ds.radii.pill, backgroundColor: vibesTheme.colors.surface, borderWidth: 1, borderColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.strong), alignItems: "center", justifyContent: "center" },
  mainLabel: { backgroundColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.subtle), borderRadius: ds.radii.lg, paddingHorizontal: ds.spacing[4], paddingVertical: ds.spacing[2], marginTop: ds.spacing[2] },
  mainLabelText: { color: vibesTheme.colors.accentBlue, ...ds.textStyles.labelMedium },
  gridHeading: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: ds.spacing[4], marginBottom: ds.spacing[3] },
  gridTitle: { color: vibesTheme.colors.primaryText, ...ds.textStyles.heading },
  gridCount: { color: vibesTheme.colors.secondaryText, ...ds.textStyles.bodySmall },
  grid: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: ds.spacing[2] },
  tile: { aspectRatio: 1, borderRadius: ds.radii.lg, borderWidth: 2, borderColor: "transparent", backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle), position: "relative" },
  selectedTile: { borderColor: vibesTheme.colors.accentBlue },
  tileTouch: { flex: 1, borderRadius: ds.radii.md, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  addCircle: { width: 34, height: 34, borderRadius: ds.radii.pill, backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.soft), alignItems: "center", justifyContent: "center" },
  photoMenu: { position: "absolute", top: 0, right: 0, width: 44, height: 44, borderRadius: ds.radii.pill, backgroundColor: ds.colors.bg.surfaceTranslucent, alignItems: "center", justifyContent: "center" },
  selectedBadge: { position: "absolute", bottom: 3, right: 3, width: 25, height: 25, borderRadius: ds.radii.pill, backgroundColor: vibesTheme.colors.accentBlue, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: vibesTheme.colors.surface },
  hint: {
    color: ONBOARDING_COLORS.muted,
    textAlign: "center",
    ...ds.textStyles.bodySmall,
    marginVertical: ds.spacing[2],
  },
  add: {
    width: "100%",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: ds.spacing[5],
    paddingVertical: ds.spacing[3],
    borderRadius: ds.radii.lg,
    backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle),
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[2],
  },
  addText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.subtitle,
    flexShrink: 1,
  },
  sheet: {
    borderRadius: ds.radii.xl,
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
    ...ds.textStyles.body,
  },
  cancel: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: ONBOARDING_COLORS.coral,
    ...ds.textStyles.body,
  },
});

export default ProfilePhotoPicker;
