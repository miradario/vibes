/** @format */

import React, { useMemo, useState } from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "../components/Typography";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import ScreenContainer from "../components/ScreenContainer";
import VibesActionButton from "../components/VibesActionButton";
import AppHeader from "../components/AppHeader";
import styles, { DARK_GRAY } from "../assets/styles";
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
  const { t } = useI18n();
  const navigation = useNavigation();
  const { draft, updateDraft } = useOnboardingDraft();
  const [birthDate, setBirthDate] = useState<Date | null>(() =>
    parseBirthDate(draft.birthDate)
  );
  const [showPicker, setShowPicker] = useState(Platform.OS === "ios");

  const maxDate = useMemo(() => new Date(), []);
  const age = birthDate ? calculateAge(birthDate) : null;
  const isValidAge = typeof age === "number" && age >= MIN_AGE;
  const showUnderageError = birthDate ? !isValidAge : false;

  const handleChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (date) {
      setBirthDate(date);
    }
  };

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
    <ScreenContainer>
      <View style={localStyles.container}>
        <AppHeader showBack onBack={() => navigation.goBack()} />

        <View style={localStyles.content}>
          <View style={localStyles.copyBlock}>
            <Text style={localStyles.title}>{t("ageAssurance.title")}</Text>
            <Text style={localStyles.subtitle}>
              {t("ageAssurance.subtitle")}
            </Text>
          </View>

          <View style={localStyles.card}>
            <Text style={styles.loginLabel}>
              {t("ageAssurance.birthDateLabel")}
            </Text>
            <TouchableOpacity
              style={styles.loginInput}
              onPress={() => setShowPicker(true)}
              activeOpacity={0.78}
            >
              <Text style={{ color: birthDate ? DARK_GRAY : "#6E6E6E" }}>
                {birthDate
                  ? formatBirthDate(birthDate)
                  : t("ageAssurance.birthDatePlaceholder")}
              </Text>
            </TouchableOpacity>

            {showPicker ? (
              <DateTimePicker
                value={birthDate ?? new Date(2000, 0, 1)}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleChange}
                maximumDate={maxDate}
              />
            ) : null}

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
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    gap: 24,
  },
  copyBlock: {
    alignItems: "center",
    gap: 10,
  },
  kicker: {
    color: "#8C7B63",
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  title: {
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.light,
    fontSize: 42,
    lineHeight: 48,
    textAlign: "center",
  },
  subtitle: {
    color: "#6E6E6E",
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
  },
  card: {
    backgroundColor: "rgba(255, 253, 248, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.24)",
    borderRadius: 24,
    padding: 18,
  },
  error: {
    marginTop: 10,
    color: "#C65353",
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
});
