import CancelOnboardingButton from "../components/CancelOnboardingButton";
import AnimatedSheetModal from "../components/AnimatedSheetModal";
import { launchAppCamera } from "../components/AppCamera";
/** @format */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "../components/Typography";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import styles, { TEXT_SECONDARY } from "../assets/styles";
import Icon from "../components/Icon";
import AppHeader from "../components/AppHeader";
import OnboardingProgressBar from "../components/OnboardingProgressBar";
import { useOnboardingDraft } from "../src/queries/onboarding.queries";
import { useI18n } from "../src/i18n";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

const IMAGE_MEDIA_TYPE = (ImagePicker as any).MediaType?.Images
  ? [(ImagePicker as any).MediaType.Images]
  : ["images"];

const MAX_PHOTOS = 6;

const normalizeDraftPhotos = (
  photoUris: string[] | undefined,
  primaryPhotoUri: string | undefined,
) => {
  const cleanUris = Array.isArray(photoUris)
    ? photoUris.filter((item) => typeof item === "string" && item.trim())
    : [];
  if (
    primaryPhotoUri &&
    typeof primaryPhotoUri === "string" &&
    primaryPhotoUri.trim()
  ) {
    const withoutPrimary = cleanUris.filter((item) => item !== primaryPhotoUri);
    return [primaryPhotoUri, ...withoutPrimary].slice(0, MAX_PHOTOS);
  }
  return cleanUris.slice(0, MAX_PHOTOS);
};

const pickFromGallery = async () => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: IMAGE_MEDIA_TYPE,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return null;
    return result.assets[0].uri;
  } catch (_error) {
    Alert.alert("Error", "No se pudo abrir la galería.");
    return null;
  }
};

const pickFromCamera = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Permiso denegado",
      "Permití acceso a tu cámara para sacar una foto.",
    );
    return null;
  }

  try {
    const result = await launchAppCamera({
        cameraType: Platform.OS === "android" ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
      mediaTypes: IMAGE_MEDIA_TYPE,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return null;
    return result.assets[0].uri;
  } catch (_error) {
    Alert.alert("Error", "No se pudo abrir la cámara.");
    return null;
  }
};

const OnboardingPhoto = () => {
  const navigation = useNavigation();
  const { t } = useI18n();
  const { draft, updateDraft } = useOnboardingDraft();
  const initialPhotos = useMemo(
    () => normalizeDraftPhotos(draft.photoUris, draft.primaryPhotoUri),
    [draft.photoUris, draft.primaryPhotoUri],
  );
  const [photoUris, setPhotoUris] = useState<string[]>(initialPhotos);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const pendingPhotoSource = useRef<"camera" | "gallery" | null>(null);

  useEffect(() => {
    setPhotoUris(initialPhotos);
  }, [initialPhotos]);

  const persistPhotos = (nextPhotos: string[]) => {
    const trimmed = nextPhotos.slice(0, MAX_PHOTOS);
    setPhotoUris(trimmed);
    updateDraft({
      photoUris: trimmed,
      primaryPhotoUri: trimmed[0] ?? "",
    });
  };

  const uploadPhoto = () => {
    if (photoUris.length >= MAX_PHOTOS) return;
    setShowPickerModal(true);
  };

  const handlePickerClosed = async () => {
    const source = pendingPhotoSource.current;
    pendingPhotoSource.current = null;
    if (!source) return;
    try {
      const uri = await (source === "camera" ? pickFromCamera() : pickFromGallery());
      if (uri) persistPhotos([...photoUris, uri]);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "No se pudo abrir el selector de fotos.");
    }
  };

  const choosePhotoSource = (source: "camera" | "gallery") => {
    pendingPhotoSource.current = source;
    setShowPickerModal(false);
  };

  const setAsPrimary = (index: number) => {
    if (index <= 0 || index >= photoUris.length) return;
    const next = [...photoUris];
    const [selected] = next.splice(index, 1);
    next.unshift(selected);
    persistPhotos(next);
  };

  const onContinue = () => {
    navigation.navigate("OnboardingCountry" as never);
  };

  const onSkip = () => {
    navigation.navigate("OnboardingCountry" as never);
  };

  const primaryUri = photoUris[0] ?? null;
  const extraPhotos = photoUris.slice(1);
  const canUploadMore = photoUris.length < MAX_PHOTOS;

  return (
    <View style={styles.bg}>
      <View style={styles.onboardContainer}>
        <AppHeader right={<CancelOnboardingButton />} showBack onBack={() => navigation.goBack()} style={styles.onboardHeader} contentStyle={styles.onboardHeaderProgress}>
          <OnboardingProgressBar screenName="OnboardingPhoto" />
        </AppHeader>
        <ScrollView
          style={localStyles.scrollView}
          contentContainerStyle={localStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.onboardTitle} maxFontSizeMultiplier={1}>
            {t("onboarding.photoTitle")}
          </Text>
          <Text style={styles.onboardSubtitle}>{t("onboarding.photoSubtitle")}</Text>
          {draft.locationLabel || draft.country ? (
            <Text style={localStyles.locationText}>
              Ubicación: {draft.locationLabel || draft.country}
            </Text>
          ) : null}

          <View style={localStyles.previewSection}>
            {primaryUri ? (
              <Image
                source={{ uri: primaryUri }}
                style={localStyles.primaryPhoto}
              />
            ) : (
              <View style={localStyles.emptyPrimaryPhoto}>
                <Icon name="person" size={/* ds-lint-allow DS-TODO: ícono de 56: fuera de icon-size (16/20/24/32) */ 56} color={TEXT_SECONDARY} />
                <Text style={localStyles.emptyPrimaryLabel}>{t("onboarding.photoEmpty")}</Text>
              </View>
            )}
            <Text style={localStyles.primaryBadge}>{t("onboarding.primary")}</Text>
          </View>

          {extraPhotos.length > 0 ? (
            <View style={localStyles.thumbsRow}>
              {extraPhotos.map((uri, index) => (
                <TouchableOpacity
                  key={`${uri}-${index}`}
                  onPress={() => setAsPrimary(index + 1)}
                  style={localStyles.thumbWrap}
                >
                  <Image source={{ uri }} style={localStyles.thumbPhoto} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <View style={styles.onboardOptions}>
            <TouchableOpacity
              style={styles.welcomeSecondary}
              onPress={uploadPhoto}
            >
              <Icon
                name="images"
                size={ds.iconSize.md}
                color={vibesTheme.colors.accentCoral}
                style={localStyles.buttonIcon}
              />
              <Text style={styles.welcomeSecondaryText}>{t("onboarding.uploadPhoto")}</Text>
            </TouchableOpacity>

            {photoUris.length > 0 && canUploadMore ? (
              <TouchableOpacity
                style={styles.welcomeSecondary}
                onPress={uploadPhoto}
              >
                <Icon
                  name="add"
                  size={ds.iconSize.md}
                  color={vibesTheme.colors.accentCoral}
                  style={localStyles.buttonIcon}
                />
                <Text style={styles.welcomeSecondaryText}>{t("onboarding.uploadAnother")}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

        </ScrollView>

        <View style={localStyles.footer}>
          <TouchableOpacity style={styles.onboardNext} onPress={onContinue}>
            <Text style={styles.onboardNextText}>{t("common.continue")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={localStyles.skipButton} onPress={onSkip}>
            <Text style={styles.onboardSkip}>{t("common.skip")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Photo source picker modal */}
      <AnimatedSheetModal
        visible={showPickerModal}
        onClose={() => setShowPickerModal(false)}
        onClosed={() => void handlePickerClosed()}
        sheetStyle={localStyles.modalCard}
      >
          <View>
            <Text style={localStyles.modalTitle}>{t("onboarding.chooseSource")}</Text>
            <Text style={localStyles.modalSubtitle}>
              {t("onboarding.chooseSourceSubtitle")}
            </Text>

            <View style={localStyles.modalButtons}>
              <TouchableOpacity
                style={localStyles.modalOption}
                onPress={() => choosePhotoSource("camera")}
              >
                <View style={localStyles.modalIconWrap}>
                  <Icon name="camera" size={ds.iconSize.lg} color={vibesTheme.colors.accentCoral} />
                </View>
                <Text style={localStyles.modalOptionText}>{t("onboarding.camera")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={localStyles.modalOption}
                onPress={() => choosePhotoSource("gallery")}
              >
                <View style={localStyles.modalIconWrap}>
                  <Icon name="images" size={ds.iconSize.lg} color={vibesTheme.colors.accentCoral} />
                </View>
                <Text style={localStyles.modalOptionText}>{t("onboarding.gallery")}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={localStyles.modalCancel}
              onPress={() => setShowPickerModal(false)}
            >
              <Text style={localStyles.modalCancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
      </AnimatedSheetModal>
    </View>
  );
};

const localStyles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: ds.spacing[5],
  },
  previewSection: {
    alignItems: "center",
    marginTop: ds.spacing[4],
    marginBottom: ds.spacing[4],
  },
  locationText: {
    marginTop: ds.spacing[2],
    textAlign: "center",
    color: TEXT_SECONDARY,
    ...ds.textStyles.labelMedium,
  },
  primaryPhoto: {
    width: 190,
    height: 190,
    borderRadius: ds.radii.pill,
    borderWidth: 2,
    borderColor: vibesTheme.colors.accentCoral,
  },
  emptyPrimaryPhoto: {
    width: 190,
    height: 190,
    borderRadius: ds.radii.pill,
    borderWidth: 2,
    borderColor: vibesTheme.colors.accentCoral,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.background,
  },
  emptyPrimaryLabel: {
    marginTop: ds.spacing[3],
    color: TEXT_SECONDARY,
    ...ds.textStyles.subtitleMedium,
  },
  primaryBadge: {
    marginTop: ds.spacing[3],
    color: vibesTheme.colors.accentBlue,
    ...ds.textStyles.subtitle,
  },
  thumbsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: ds.spacing[3],
    marginBottom: ds.spacing[3],
    minHeight: 60,
  },
  thumbWrap: {
    borderRadius: ds.radii.xl,
    padding: ds.spacing[1],
    borderWidth: 1,
    borderColor: vibesTheme.colors.accentCoral,
    backgroundColor: vibesTheme.colors.background,
  },
  thumbPhoto: {
    width: 46,
    height: 46,
    borderRadius: ds.radii.pill,
  },
  buttonIcon: {
    marginRight: ds.spacing[2],
  },
  videoWrap: {
    height: 140,
    marginTop: ds.spacing[3],
    marginBottom: ds.spacing[1],
  },
  footer: {
    paddingTop: ds.spacing[3],
    paddingBottom: ds.spacing[2],
    backgroundColor: styles.bg.backgroundColor,
  },
  skipButton: {
    marginTop: ds.spacing[3],
    alignSelf: "center",
    paddingVertical: ds.spacing[1],
    paddingHorizontal: ds.spacing[2],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: ds.withAlpha(ds.colors.base.ink, ds.opacity.strong),
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: vibesTheme.colors.background,
    borderTopLeftRadius: ds.radii.xl,
    borderTopRightRadius: ds.radii.xl,
    paddingTop: ds.spacing[8],
    paddingBottom: ds.spacing[8],
    paddingHorizontal: ds.spacing[6],
    alignItems: "center",
  },
  modalTitle: {
    ...ds.textStyles.title,
    color: vibesTheme.colors.primaryText,
    marginBottom: ds.spacing[1],
  },
  modalSubtitle: {
    ...ds.textStyles.subtitleMedium,
    color: vibesTheme.colors.secondaryText,
    marginBottom: ds.spacing[6],
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    gap: ds.spacing[6],
    marginBottom: ds.spacing[6],
  },
  modalOption: {
    alignItems: "center",
    backgroundColor: vibesTheme.colors.background,
    borderRadius: ds.radii.lg,
    paddingVertical: ds.spacing[5],
    paddingHorizontal: ds.spacing[8],
    ...ds.shadows.sm,
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.colors.feedback.errorBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ds.spacing[3],
  },
  modalOptionText: {
    ...ds.textStyles.subtitle,
    color: vibesTheme.colors.primaryText,
  },
  modalCancel: {
    paddingVertical: ds.spacing[2],
    paddingHorizontal: ds.spacing[6],
  },
  modalCancelText: {
    ...ds.textStyles.subtitleMedium,
    color: vibesTheme.colors.secondaryText,
  },
});

export default OnboardingPhoto;
