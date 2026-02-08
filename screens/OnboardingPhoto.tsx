/** @format */

import React, { useState } from "react";
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";

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

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

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

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  return (
    <ImageBackground
      source={require("../assets/images/backgroundSimple.png")}
      style={styles.bg}
    >
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
                  borderColor: "#6B4CE6",
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
                backgroundColor: "#F3F0F7",
                borderWidth: 2,
                borderColor: "#6B4CE6",
                borderStyle: "dashed",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Icon name="camera" size={60} color="#6B4CE6" />
              <Text
                style={{ marginTop: 10, color: "#6B4CE6", fontWeight: "600" }}
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
              color="#6B4CE6"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.welcomeSecondaryText}>Choose from gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.welcomeSecondary} onPress={takePhoto}>
            <Icon
              name="camera"
              size={18}
              color="#6B4CE6"
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
    </ImageBackground>
  );
};

export default OnboardingPhoto;
