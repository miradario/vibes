import React, { useRef, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "../Typography";
import * as ImagePicker from "expo-image-picker";
import { CameraType } from "expo-image-picker";
import Icon from "../Icon";
import AnimatedSheetModal from "../AnimatedSheetModal";
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
  onChange: (uris: string[]) => void;
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

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: IMAGE_MEDIA_TYPE,
    cameraType: CameraType.front,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.82,
  });

  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return result.assets[0].uri;
};

const ProfilePhotoPicker = ({ uris, onChange }: ProfilePhotoPickerProps) => {
  const { t, locale } = useI18n();
  const english = locale === "en";
  const [modalVisible, setModalVisible] = useState(false);
  const [busy, setBusy] = useState(false);
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
      const added = typeof selected === "string" ? [selected] : selected ?? [];
      if (added.length)
        onChange(Array.from(new Set([...uris, ...added])).slice(0, 6));
    } catch {
      Alert.alert(
        t("common.error"),
        english
          ? "Could not open your photos. Please try again."
          : "No pudimos abrir tus fotos. Intentá de nuevo."
      );
    } finally {
      setBusy(false);
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
            <Image source={{ uri: uris[0] }} style={onboardingStyles.photo} />
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
                <Image source={{ uri }} style={onboardingStyles.photo} />
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
          <Text style={styles.rowText}>
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
  previewItem: { width: 76, alignItems: "center" },
  thumbnail: {
    width: 76,
    height: 76,
    borderRadius: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "#F5E5BD",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sheet: {
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
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
