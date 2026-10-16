import CancelOnboardingButton from "../components/CancelOnboardingButton";
import { vibesTheme } from "../src/theme/vibesTheme";
/** @format */

import React, { useMemo, useState } from "react";
import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Text } from "../components/Typography";
import BirthDateWheel from "../components/BirthDateWheel";
import DateTimePicker from "@react-native-community/datetimepicker";
import ScreenContainer from "../components/ScreenContainer";
import { useNavigation } from "@react-navigation/native";
import styles from "../assets/styles";
import AppHeader from "../components/AppHeader";
import OnboardingProgressBar from "../components/OnboardingProgressBar";
import { useOnboardingDraft } from "../src/queries/onboarding.queries";
import { useI18n } from "../src/i18n";
import {
  calculateAge,
  formatBirthDate,
  parseBirthDate,
} from "../src/lib/birthDate";

const OnboardingAge = () => {
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const { draft, updateDraft } = useOnboardingDraft();
  const [birthDate, setBirthDate] = useState<Date | null>(() =>
    parseBirthDate(draft.birthDate),
  );

  const minDate = useMemo(() => new Date(1900, 0, 1), []);
  const maxDate = useMemo(() => {
    const today = new Date();
    return new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate()
    );
  }, []);

  const isValidAge = birthDate ? calculateAge(birthDate) >= 18 : false;
  const showUnderageError = birthDate ? !isValidAge : false;

  return (
    <ScreenContainer scroll contentContainerStyle={{ flexGrow: 1 }} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.onboardContainer}>
        <AppHeader right={<CancelOnboardingButton />}
          style={styles.onboardHeader}
          contentStyle={styles.onboardHeaderProgress}
          hideBackIcon
        >
          <OnboardingProgressBar screenName="OnboardingAge" />
        </AppHeader>

        <Text style={styles.onboardTitle}>{t("onboarding.ageTitle")}</Text>
        <Text style={styles.onboardSubtitle}>{t("onboarding.ageSubtitle")}</Text>

        {Platform.OS === "ios" ? (
          <DateTimePicker
            value={birthDate ?? maxDate}
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
          <Text style={localStyles.ageError}>
            Debés tener al menos 18 años para continuar.
          </Text>
        ) : null}


        <View style={styles.onboardFooter}>
          <TouchableOpacity
            style={[
              styles.onboardNext,
              !isValidAge && styles.onboardNextDisabled,
            ]}
            disabled={!isValidAge}
            onPress={() => {
              if (!birthDate || !isValidAge) return;
              updateDraft({ birthDate: formatBirthDate(birthDate) });
              navigation.navigate("OnboardingPhoto" as never);
            }}
          >
            <Text style={styles.onboardNextText}>{t("common.next")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
};

export default OnboardingAge;

const localStyles = StyleSheet.create({
  videoWrap: {
    flex: 1,
    minHeight: 320,
    marginTop: 18,
    marginBottom: 12,
  },
  ageError: {
    marginTop: 10,
    color: vibesTheme.colors.accentBlue,
    fontSize: 14,
  },
});
