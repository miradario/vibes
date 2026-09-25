import { vibesTheme } from "../src/theme/vibesTheme";
/** @format */

import React, { useState } from "react";
import { View, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { Text, TextInput } from "../components/Typography";
import { useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import styles from "../assets/styles";
import Icon from "../components/Icon";
import AppHeader from "../components/AppHeader";
import OnboardingVideo from "../components/OnboardingVideo";
import OnboardingProgressBar from "../components/OnboardingProgressBar";
import { useI18n } from "../src/i18n";
import { useOnboardingDraft } from "../src/queries/onboarding.queries";

const getUniqueLocationParts = (...parts: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .filter((part) => {
      const key = part.toLocaleLowerCase("es-AR");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const OnboardingCountry = () => {
  const { t } = useI18n();
  const navigation = useNavigation();
  const { draft, updateDraft } = useOnboardingDraft();
  const [city, setCity] = useState(draft.city ?? "");
  const [country, setCountry] = useState(draft.country ?? "");
  const [loading, setLoading] = useState(false);

  const goToNextStep = () => {
    const trimmedCity = city.trim();
    const trimmedCountry = country.trim();
    if (!trimmedCity && !trimmedCountry) return;

    const locationLabel = getUniqueLocationParts(trimmedCity, trimmedCountry).join(", ");
    updateDraft({
      city: trimmedCity,
      country: trimmedCountry,
      locationLabel,
    });
    navigation.navigate("OnboardingSpiritualPath" as never);
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

      const nextCity = address?.city ?? address?.subregion ?? address?.region ?? "";
      const nextCountry = address?.country ?? "";
      const locationLabel = getUniqueLocationParts(nextCity, nextCountry).join(", ");

      setCity(nextCity);
      setCountry(nextCountry);
      updateDraft({
        city: nextCity,
        country: nextCountry,
        locationLabel,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      Alert.alert(t("common.error"), t("onboarding.locationError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.bg}>
      <View style={styles.onboardContainer}>
        <AppHeader showBack onBack={() => navigation.goBack()} style={styles.onboardHeader} contentStyle={styles.onboardHeaderProgress}>
          <OnboardingProgressBar screenName="OnboardingCountry" />
        </AppHeader>

        <Text style={styles.onboardTitle}>{t("onboarding.countryTitle")}</Text>
        <Text style={styles.onboardSubtitle}>{t("onboarding.countrySubtitle")}</Text>

        <View style={styles.loginField}>
          <TextInput
            style={styles.loginInput}
            placeholder={t("onboarding.cityPlaceholder")}
            placeholderTextColor={vibesTheme.colors.secondaryText}
            autoCapitalize="words"
            returnKeyType="next"
            value={city}
            onChangeText={setCity}
          />
        </View>

        <View style={styles.loginField}>
          <TextInput
            style={styles.loginInput}
            placeholder={t("onboarding.countryPlaceholder")}
            placeholderTextColor={vibesTheme.colors.secondaryText}
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
            color={vibesTheme.colors.accentCoral}
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
              !city.trim() && !country.trim() && styles.onboardNextDisabled,
            ]}
            disabled={!city.trim() && !country.trim()}
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
