/** @format */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";
import OnboardingVideo from "../components/OnboardingVideo";
import OnboardingProgressBar from "../components/OnboardingProgressBar";
import { useI18n } from "../src/i18n";

const OnboardingCountry = () => {
  const { t } = useI18n();
  const navigation = useNavigation();
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);

  const goToNextStep = () => {
    if (!country.trim()) return;
    navigation.navigate("OnboardingPhoto" as never);
  };

  const requestLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("onboarding.locationPermissionDeniedTitle"),
          t("onboarding.locationPermissionDeniedMessage"),
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
      Alert.alert(t("common.error"), t("onboarding.locationError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.bg}>
      <View style={styles.onboardContainer}>
        <View style={styles.onboardHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={22} color={DARK_GRAY} />
          </TouchableOpacity>
          <OnboardingProgressBar screenName="OnboardingCountry" />
        </View>

        <Text style={styles.onboardTitle}>{t("onboarding.countryTitle")}</Text>
        <Text style={styles.onboardSubtitle}>{t("onboarding.countrySubtitle")}</Text>

        <View style={styles.loginField}>
          <TextInput
            style={styles.loginInput}
            placeholder={t("onboarding.countryPlaceholder")}
            placeholderTextColor="#6E6E6E"
            autoCapitalize="words"
            returnKeyType="done"
            value={country}
            onChangeText={setCountry}
            onSubmitEditing={goToNextStep}
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
            color="#D88C7A"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.welcomeSecondaryText}>
            {loading ? t("onboarding.gettingLocation") : t("onboarding.useMyLocation")}
          </Text>
        </TouchableOpacity>

        <OnboardingVideo containerStyle={localStyles.videoWrap} />

        <View style={styles.onboardFooter}>
          <TouchableOpacity
            style={[
              styles.onboardNext,
              !country.trim() && styles.onboardNextDisabled,
            ]}
            disabled={!country.trim()}
            onPress={goToNextStep}
          >
            <Text style={styles.onboardNextText}>{t("common.next")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default OnboardingCountry;

const localStyles = StyleSheet.create({
  videoWrap: {
    flex: 1,
    minHeight: 320,
    marginTop: 18,
    marginBottom: 12,
  },
});
