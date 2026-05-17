import React, { useState } from "react";
import { Alert, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { CameraType } from "expo-image-picker";
import Icon from "../Icon";
import {
  ONBOARDING_COLORS,
  onboardingStyles,
} from "../../src/screens/Onboarding/vibesOnboardingStyles";
import { useI18n } from "../../src/i18n";

const IMAGE_MEDIA_TYPE = (ImagePicker as any).MediaType?.Images
  ? [(ImagePicker as any).MediaType.Images]
  : ["images"];
type ProfilePhotoPickerProps = {
  uri?: string;
  onChange: (uri: string) => void;
};

const pickFromGallery = async (t: (key: string) => string) => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      t("onboarding.photoPermissionGalleryTitle"),
      t("onboarding.photoPermissionGalleryMessage"),
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: IMAGE_MEDIA_TYPE,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.82,
  });

  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return result.assets[0].uri;
};

const pickFromCamera = async (t: (key: string) => string) => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      t("onboarding.photoPermissionGalleryTitle"),
      t("onboarding.photoPermissionCameraMessage"),
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

const ProfilePhotoPicker = ({ uri, onChange }: ProfilePhotoPickerProps) => {
  const { t } = useI18n();
  const [modalVisible, setModalVisible] = useState(false);

  const choosePhoto = async (source: "camera" | "gallery") => {
    setModalVisible(false);
    const nextUri =
      source === "camera" ? await pickFromCamera(t) : await pickFromGallery(t);
    if (nextUri) onChange(nextUri);
  };

  return (
    <>
      <TouchableOpacity
        style={onboardingStyles.photoPickerWrap}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.88}
      >
        <View style={onboardingStyles.photoButton}>
          {uri ? (
            <Image source={{ uri }} style={onboardingStyles.photo} />
          ) : (
            <Icon name="person-outline" size={42} color={ONBOARDING_COLORS.muted} />
          )}
        </View>
        <View style={onboardingStyles.cameraBadge}>
          <Icon name="camera-outline" size={22} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.overlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.sheet}>
            <TouchableOpacity style={styles.row} onPress={() => void choosePhoto("camera")}>
              <Text style={styles.rowText}>{t("onboarding.camera")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={() => void choosePhoto("gallery")}>
              <Text style={styles.rowText}>{t("onboarding.gallery")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancel} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(17, 17, 17, 0.28)",
    padding: 18,
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
