/** @format */

import React, { useMemo, useState } from "react";
import { Image, Platform, StyleSheet, View } from "react-native";
import { Text } from "../components/Typography";
import BirthDateWheel from "../components/BirthDateWheel";
import DateTimePicker from "@react-native-community/datetimepicker";
import { VIBES_LOGO } from "../src/constants/brandAssets";
import { useNavigation } from "@react-navigation/native";
import ScreenContainer from "../components/ScreenContainer";
import VibesActionButton from "../components/VibesActionButton";
import AppHeader from "../components/AppHeader";
import { useI18n } from "../src/i18n";
import { useOnboardingDraft } from "../src/queries/onboarding.queries";
import {
  calculateAge,
  formatBirthDate,
  parseBirthDate,
} from "../src/lib/birthDate";
import { vibesTheme } from "../src/theme/vibesTheme";

const MIN_AGE = 18;

const AgeAssurance = () => {
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const { draft, updateDraft } = useOnboardingDraft();
  const [birthDate, setBirthDate] = useState<Date | null>(() =>
    parseBirthDate(draft.birthDate)
  );

  const minDate = useMemo(() => new Date(1900, 0, 1), []);
  const maxDate = useMemo(() => new Date(), []);
  const initialPickerDate = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear() - MIN_AGE, today.getMonth(), today.getDate());
  }, []);
  const age = birthDate ? calculateAge(birthDate) : null;
  const isValidAge = typeof age === "number" && age >= MIN_AGE;
  const showUnderageError = birthDate ? !isValidAge : false;

  const handleContinue = () => {
    if (!birthDate || !isValidAge) return;
    const confirmedBirthDate = formatBirthDate(birthDate);
    updateDraft({ birthDate: confirmedBirthDate });
    navigation.navigate(
      "Signup" as never,
      { birthDate: confirmedBirthDate } as never
    );
  };

  return (
    <ScreenContainer scroll contentContainerStyle={{ flexGrow: 1 }} edges={["top", "bottom", "left", "right"]}>
      <View style={localStyles.container}>
        <AppHeader
          showBack
          backButtonStyle={localStyles.headerBackButton}
          onBack={() => navigation.goBack()}
        />

        <View style={localStyles.content}>
          <Image source={VIBES_LOGO} resizeMode="contain" accessibilityLabel="Vibes" style={localStyles.logo} />
          <View style={localStyles.copyBlock}>
            <Text style={localStyles.title}>{t("ageAssurance.title")}</Text>
            <Text style={localStyles.subtitle}>
              {t("ageAssurance.subtitle")}
            </Text>
          </View>

          <View style={localStyles.card}>
            {Platform.OS === "ios" ? (
              <DateTimePicker
                style={localStyles.nativeDatePicker}
                value={birthDate ?? initialPickerDate}
                mode="date"
                display="spinner"
                themeVariant="light"
                textColor={vibesTheme.colors.primaryText}
                locale={locale === "en" ? "en-US" : "es-AR"}
                minimumDate={minDate}
                maximumDate={maxDate}
                onChange={(_event, date) => {
                  if (date) setBirthDate(date);
                }}
              />
            ) : (
              <BirthDateWheel value={birthDate} onChange={setBirthDate}
                minimumDate={minDate} maximumDate={maxDate} locale={locale} />
            )}

            {showUnderageError ? (
              <Text style={localStyles.error}>
                {t("ageAssurance.underageError")}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={localStyles.footer}>
          <VibesActionButton
            label={t("ageAssurance.continue")}
            onPress={handleContinue}
            disabled={!isValidAge}
          />
          <VibesActionButton
            label={t("common.back")}
            variant="skip"
            style={localStyles.backButton}
            onPress={() => navigation.goBack()}
          />
        </View>
      </View>
    </ScreenContainer>
  );
};

export default AgeAssurance;

const localStyles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    gap: 24,
  },
  logo: { width: 140, height: 140, alignSelf: "center" },
  copyBlock: {
    alignItems: "center",
    gap: 10,
  },
  kicker: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  title: {
    color: vibesTheme.colors.accentBlue,
    fontFamily: vibesTheme.fonts.bold,
    fontSize: 30,
    lineHeight: 36,
    textAlign: "center",
  },
  subtitle: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
  },
  card: { width: "100%", marginTop: -8 },
  nativeDatePicker: { alignSelf: "center" },
  error: {
    marginTop: 10,
    color: vibesTheme.colors.accentBlue,
    fontSize: 14,
    lineHeight: 19,
  },
  footer: {
    paddingTop: 18,
    paddingBottom: 36,
  },
  backButton: {
    marginTop: 10,
  },
  headerBackButton: {
    backgroundColor: "transparent",
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
});
