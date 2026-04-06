/** @format */

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import styles, { DARK_GRAY, TEXT_SECONDARY } from "../assets/styles";
import Icon from "../components/Icon";
import { useOnboardingDraft } from "../src/queries/onboarding.queries";

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
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Permission denied",
      "Please allow gallery access to upload a picture.",
    );
    return null;
  }

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
    Alert.alert("Error", "Could not open the gallery.");
    return null;
  }
};

const pickFromCamera = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Permission denied",
      "Please allow camera access to take a photo.",
    );
    return null;
  }

  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: IMAGE_MEDIA_TYPE,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return null;
    return result.assets[0].uri;
  } catch (_error) {
    Alert.alert("Error", "Could not open the camera.");
    return null;
  }
};

const OnboardingPhoto = () => {
  const navigation = useNavigation();
  const { draft, updateDraft } = useOnboardingDraft();
  const initialPhotos = useMemo(
    () => normalizeDraftPhotos(draft.photoUris, draft.primaryPhotoUri),
    [draft.photoUris, draft.primaryPhotoUri],
  );
  const [photoUris, setPhotoUris] = useState<string[]>(initialPhotos);
  const [showPickerModal, setShowPickerModal] = useState(false);

  const progress = 83;

  useEffect(() => {
    setPhotoUris(initialPhotos);
  }, [initialPhotos]);

  useEffect(() => {
    let active = true;

    const activateLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || !active) return;

        const current = await Location.getCurrentPositionAsync({});
        if (!active) return;

        const [address] = await Location.reverseGeocodeAsync({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
        if (!active) return;

        if (address?.country && address.country !== draft.country) {
          updateDraft({ country: address.country });
        }
      } catch (_error) {
        // Keep flow non-blocking if location is not available.
      }
    };

    activateLocation();

    return () => {
      active = false;
    };
  }, [draft.country, updateDraft]);

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

  const handlePickCamera = async () => {
    setShowPickerModal(false);
    const uri = await pickFromCamera();
    if (uri) persistPhotos([...photoUris, uri]);
  };

  const handlePickGallery = async () => {
    setShowPickerModal(false);
    const uri = await pickFromGallery();
    if (uri) persistPhotos([...photoUris, uri]);
  };

  const setAsPrimary = (index: number) => {
    if (index <= 0 || index >= photoUris.length) return;
    const next = [...photoUris];
    const [selected] = next.splice(index, 1);
    next.unshift(selected);
    persistPhotos(next);
  };

  const onContinue = () => {
    navigation.navigate("OnboardingGender" as never);
  };

  const onSkip = () => {
    navigation.navigate("OnboardingGender" as never);
  };

  const primaryUri = photoUris[0] ?? null;
  const extraPhotos = photoUris.slice(1);
  const canUploadMore = photoUris.length < MAX_PHOTOS;

  return (
    <View style={styles.bg}>
      <View style={styles.onboardContainer}>
        <View style={styles.onboardHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={22} color={DARK_GRAY} />
          </TouchableOpacity>
          <View style={styles.onboardProgressTrack}>
            <View
              style={[styles.onboardProgressFill, { width: `${progress}%` }]}
            />
          </View>
          <View style={localStyles.headerSpacer} />
        </View>

        <Text style={styles.onboardTitle}>Add your photo</Text>
        <Text style={styles.onboardSubtitle}>Show your authentic self</Text>
        {draft.country ? (
          <Text style={localStyles.locationText}>
            Location: {draft.country}
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
              <Icon name="person" size={56} color={TEXT_SECONDARY} />
              <Text style={localStyles.emptyPrimaryLabel}>No photo yet</Text>
            </View>
          )}
          <Text style={localStyles.primaryBadge}>Primary</Text>
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
              size={18}
              color="#D88C7A"
              style={localStyles.buttonIcon}
            />
            <Text style={styles.welcomeSecondaryText}>Upload photo</Text>
          </TouchableOpacity>

          {photoUris.length > 0 && canUploadMore ? (
            <TouchableOpacity
              style={styles.welcomeSecondary}
              onPress={uploadPhoto}
            >
              <Icon
                name="add"
                size={18}
                color="#D88C7A"
                style={localStyles.buttonIcon}
              />
              <Text style={styles.welcomeSecondaryText}>Upload another</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={localStyles.footer}>
          <TouchableOpacity style={styles.onboardNext} onPress={onContinue}>
            <Text style={styles.onboardNextText}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={localStyles.skipButton} onPress={onSkip}>
            <Text style={styles.onboardSkip}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Photo source picker modal */}
      <Modal
        visible={showPickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPickerModal(false)}
      >
        <TouchableOpacity
          style={localStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPickerModal(false)}
        >
          <View style={localStyles.modalCard}>
            <Text style={localStyles.modalTitle}>Choose source</Text>
            <Text style={localStyles.modalSubtitle}>
              How would you like to add your photo?
            </Text>

            <View style={localStyles.modalButtons}>
              <TouchableOpacity
                style={localStyles.modalOption}
                onPress={handlePickCamera}
              >
                <View style={localStyles.modalIconWrap}>
                  <Icon name="camera" size={26} color="#D88C7A" />
                </View>
                <Text style={localStyles.modalOptionText}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={localStyles.modalOption}
                onPress={handlePickGallery}
              >
                <View style={localStyles.modalIconWrap}>
                  <Icon name="images" size={26} color="#D88C7A" />
                </View>
                <Text style={localStyles.modalOptionText}>Gallery</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={localStyles.modalCancel}
              onPress={() => setShowPickerModal(false)}
            >
              <Text style={localStyles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const localStyles = StyleSheet.create({
  headerSpacer: {
    width: 42,
  },
  previewSection: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 18,
  },
  locationText: {
    marginTop: 8,
    textAlign: "center",
    color: TEXT_SECONDARY,
    fontFamily: "CormorantGaramond_500Medium",
    fontSize: 14,
  },
  primaryPhoto: {
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 2,
    borderColor: "#D88C7A",
  },
  emptyPrimaryPhoto: {
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 2,
    borderColor: "#D88C7A",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F6F4",
  },
  emptyPrimaryLabel: {
    marginTop: 10,
    color: TEXT_SECONDARY,
    fontFamily: "CormorantGaramond_500Medium",
    fontSize: 15,
  },
  primaryBadge: {
    marginTop: 10,
    color: "#D88C7A",
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 16,
  },
  thumbsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginBottom: 10,
    minHeight: 60,
  },
  thumbWrap: {
    borderRadius: 24,
    padding: 2,
    borderWidth: 1,
    borderColor: "#D88C7A",
    backgroundColor: "#FDF8F5",
  },
  thumbPhoto: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  buttonIcon: {
    marginRight: 8,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 16,
    paddingBottom: 12,
  },
  skipButton: {
    marginTop: 12,
    alignSelf: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FDF8F5",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  modalTitle: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 22,
    color: "#3B3B3B",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: "CormorantGaramond_500Medium",
    fontSize: 15,
    color: "#9B9B9B",
    marginBottom: 24,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 24,
  },
  modalOption: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 28,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FDF0EC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  modalOptionText: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 16,
    color: "#3B3B3B",
  },
  modalCancel: {
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  modalCancelText: {
    fontFamily: "CormorantGaramond_500Medium",
    fontSize: 16,
    color: "#9B9B9B",
  },
});

export default OnboardingPhoto;
