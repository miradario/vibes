/** @format */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";

const IMAGE_MEDIA_TYPE =
  (ImagePicker as any).MediaType?.Images
    ? [(ImagePicker as any).MediaType.Images]
    : ["images"];

const OnboardingPhoto = () => {
  const navigation = useNavigation();
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const progress = 83; // 5/6 steps

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission denied",
        "Please allow photo access to upload a picture",
      );
      return;
    }

    let result;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: IMAGE_MEDIA_TYPE,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    } catch (error) {
      Alert.alert("Error", "Could not open the gallery.");
      return;
    }

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission denied",
        "Please allow camera access to take a picture",
      );
      return;
    }

    let result;
    try {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: IMAGE_MEDIA_TYPE,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    } catch (error) {
      Alert.alert("Error", "Could not open the camera.");
      return;
    }

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

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
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("OnboardingSpiritualPath" as never)
            }
          >
            <Text style={styles.onboardSkip}>Skip</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.onboardTitle}>Add your photo</Text>
        <Text style={styles.onboardSubtitle}>Show your authentic self</Text>

        <View style={{ alignItems: "center", marginVertical: 40 }}>
          {photoUri ? (
            <TouchableOpacity onPress={pickImage}>
              <Image
                source={{ uri: photoUri }}
                style={{
                  width: 200,
                  height: 200,
                  borderRadius: 100,
                  borderWidth: 3,
                  borderColor: "#D88C7A",
                }}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={pickImage}
              style={{
                width: 200,
                height: 200,
                borderRadius: 100,
                backgroundColor: "#F6F6F4",
                borderWidth: 2,
                borderColor: "#D88C7A",
                borderStyle: "dashed",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Icon name="camera" size={60} color="#D88C7A" />
              <Text
                style={{ marginTop: 10, color: "#D88C7A", fontWeight: "600" }}
              >
                Add Photo
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.onboardOptions}>
          <TouchableOpacity style={styles.welcomeSecondary} onPress={pickImage}>
            <Icon
              name="images"
              size={18}
              color="#D88C7A"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.welcomeSecondaryText}>Choose from gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.welcomeSecondary} onPress={takePhoto}>
            <Icon
              name="camera"
              size={18}
              color="#D88C7A"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.welcomeSecondaryText}>Take a photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.onboardFooter}>
          <TouchableOpacity
            style={styles.onboardNext}
            onPress={() =>
              navigation.navigate("OnboardingSpiritualPath" as never)
            }
          >
            <Text style={styles.onboardNextText}>
              {photoUri ? "Next" : "Skip for now"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default OnboardingPhoto;
