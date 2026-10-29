/** @format */

import React, { useMemo, useState } from "react";
import { Image, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../components/Typography";
import BirthDateWheel from "../components/BirthDateWheel";
import DateTimePicker from "@react-native-community/datetimepicker";
import { VIBES_LOGO } from "../src/constants/brandAssets";
import { useNavigation } from "@react-navigation/native";
import { trackSignupEvent } from "../src/lib/signupEvents";
import { useSignupBackgroundTracking } from "../src/lib/useSignupBackgroundTracking";
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
import * as ds from "../src/theme/tokens";

const MIN_AGE = 18;

const AgeAssurance = () => {
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const { draft, updateDraft } = useOnboardingDraft();
  useSignupBackgroundTracking("age");
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
    trackSignupEvent("age_confirmed");
    navigation.navigate(
      "Signup" as never,
      { birthDate: confirmedBirthDate } as never
    );
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={localStyles.container}>
        <AppHeader
          showBack
          backButtonStyle={localStyles.headerBackButton}
          onBack={() => navigation.goBack()}
        />

        <ScrollView style={localStyles.scroll} contentContainerStyle={localStyles.content}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
        </ScrollView>

        <View style={localStyles.footer}>
          <VibesActionButton
            label={t("ageAssurance.continue")}
            onPress={handleContinue}
            disabled={!isValidAge}
          />
        </View>
      </View>
    </ScreenContainer>
  );
};

export default AgeAssurance;

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: ds.spacing[4],
  },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: ds.spacing[6],
    justifyContent: "center",
    gap: ds.spacing[4],
  },
  logo: { width: 100, height: 100, alignSelf: "center" },
  copyBlock: {
    alignItems: "center",
    gap: ds.spacing[3],
  },
  kicker: {
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.caption,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  title: {
    color: vibesTheme.colors.accentBlue,
    ...ds.textStyles.title,
    textAlign: "center",
  },
  subtitle: {
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.body,
    textAlign: "center",
  },
  card: { width: "100%", marginTop: -ds.spacing[2], flexShrink: 0 },
  nativeDatePicker: { alignSelf: "center", width: "100%", height: 216, minHeight: 216, flexShrink: 0 },
  error: {
    marginTop: ds.spacing[3],
    color: vibesTheme.colors.accentBlue,
    ...ds.textStyles.bodySmall,
  },
  footer: {
    flexShrink: 0,
    paddingHorizontal: ds.spacing[6],
    paddingTop: ds.spacing[4],
  },
  headerBackButton: {
    backgroundColor: "transparent",
    borderWidth: 0,
    ...ds.shadows.none,
  },
});
