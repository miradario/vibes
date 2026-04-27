/** @format */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";
import OnboardingVideo from "../components/OnboardingVideo";
import { useOnboardingDraft } from "../src/queries/onboarding.queries";
import { useI18n } from "../src/i18n";
import { getOnboardingProgress } from "../src/lib/onboardingFlow";

const OnboardingAge = () => {
  const { t } = useI18n();
  const navigation = useNavigation();
  const { draft, updateDraft } = useOnboardingDraft();
  const [showPicker, setShowPicker] = useState(Platform.OS === "ios");
  const [birthDate, setBirthDate] = useState<Date | null>(() => {
    if (!draft.birthDate) return null;
    const parsed = new Date(draft.birthDate);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  });

  const progress = getOnboardingProgress("OnboardingAge");

  const maxDate = useMemo(() => {
    const today = new Date();
    return new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate()
    );
  }, []);

  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  const getAge = (date: Date) => {
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < date.getDate())
    ) {
      age -= 1;
    }
    return age;
  };

  const isValidAge = birthDate ? getAge(birthDate) >= 18 : false;
  const showUnderageError = birthDate ? !isValidAge : false;

  const handleChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (date) {
      setBirthDate(date);
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
              style={[styles.onboardProgressFill, { width: `${progress.value}%` }]}
            />
          </View>
          <View style={{ width: 40 }}>
            <Text style={styles.onboardSkip}>{progress.label}</Text>
          </View>
        </View>

        <Text style={styles.onboardTitle}>{t("onboarding.ageTitle")}</Text>
        <Text style={styles.onboardSubtitle}>{t("onboarding.ageSubtitle")}</Text>

        <View style={styles.loginField}>
          <TouchableOpacity
            style={styles.loginInput}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={{ color: birthDate ? DARK_GRAY : "#6E6E6E" }}>
              {birthDate ? formatDate(birthDate) : t("onboarding.agePlaceholder")}
            </Text>
          </TouchableOpacity>
        </View>

        {showPicker ? (
          <DateTimePicker
            value={birthDate ?? maxDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleChange}
            maximumDate={maxDate}
          />
        ) : null}

        {showUnderageError ? (
          <Text style={localStyles.ageError}>
            Debés tener al menos 18 años para continuar.
          </Text>
        ) : null}

        <OnboardingVideo containerStyle={localStyles.videoWrap} />

        <View style={styles.onboardFooter}>
          <TouchableOpacity
            style={[
              styles.onboardNext,
              !isValidAge && styles.onboardNextDisabled,
            ]}
            disabled={!isValidAge}
            onPress={() => {
              if (!birthDate || !isValidAge) return;
              updateDraft({ birthDate: formatDate(birthDate) });
              navigation.navigate("OnboardingGender" as never);
            }}
          >
            <Text style={styles.onboardNextText}>{t("common.next")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
    color: "#C65353",
    fontSize: 14,
  },
});
