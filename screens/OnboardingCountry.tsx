/** @format */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";

const OnboardingCountry = () => {
  const navigation = useNavigation();
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);

  const progress = 50; // 3/6 steps

  const requestLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission denied",
          "Please allow location access to use this feature",
        );
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address?.country) {
        setCountry(address.country);
      }
    } catch (error) {
      Alert.alert("Error", "Could not get your location");
    } finally {
      setLoading(false);
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
          <View style={{ width: 40 }}>
            <Text style={styles.onboardSkip}>{progress}%</Text>
          </View>
        </View>

        <Text style={styles.onboardTitle}>Where are you from?</Text>
        <Text style={styles.onboardSubtitle}>
          We'll use your location to connect you with nearby souls
        </Text>

        <View style={styles.loginField}>
          <TextInput
            style={styles.loginInput}
            placeholder="Enter your country"
            placeholderTextColor="#9B91A6"
            autoCapitalize="words"
            value={country}
            onChangeText={setCountry}
          />
        </View>

        <TouchableOpacity
          style={styles.welcomeSecondary}
          onPress={requestLocation}
          disabled={loading}
        >
          <Icon
            name="location"
            size={18}
            color="#6B4CE6"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.welcomeSecondaryText}>
            {loading ? "Getting location..." : "Use my location"}
          </Text>
        </TouchableOpacity>

        <View style={styles.onboardFooter}>
          <TouchableOpacity
            style={[
              styles.onboardNext,
              !country.trim() && styles.onboardNextDisabled,
            ]}
            disabled={!country.trim()}
            onPress={() => navigation.navigate("OnboardingGender" as never)}
          >
            <Text style={styles.onboardNextText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
};

export default OnboardingCountry;
