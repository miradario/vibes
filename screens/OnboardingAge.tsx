/** @format */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";
import { useOnboardingDraft } from "../src/queries/onboarding.queries";

const OnboardingAge = () => {
  const navigation = useNavigation();
  const { draft, updateDraft } = useOnboardingDraft();
  const [showPicker, setShowPicker] = useState(Platform.OS === "ios");
  const [birthDate, setBirthDate] = useState<Date | null>(() => {
    if (!draft.birthDate) return null;
    const parsed = new Date(draft.birthDate);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  });

  const progress = 33; // 2/6 steps

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
              style={[styles.onboardProgressFill, { width: `${progress}%` }]}
            />
          </View>
          <View style={{ width: 40 }}>
            <Text style={styles.onboardSkip}>{progress}%</Text>
          </View>
        </View>

        <Text style={styles.onboardTitle}>What’s your birth date?</Text>
        <Text style={styles.onboardSubtitle}>
          You must be at least 18 years old
        </Text>

        <View style={styles.loginField}>
          <TouchableOpacity
            style={styles.loginInput}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={{ color: birthDate ? DARK_GRAY : "#9B91A6" }}>
              {birthDate ? formatDate(birthDate) : "Select your birth date"}
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

        <View style={styles.onboardFooter}>
          <TouchableOpacity
            style={[
              styles.onboardNext,
              !isValidAge && styles.onboardNextDisabled,
            ]}
            disabled={!isValidAge}
            onPress={() => {
              if (!birthDate) return;
              updateDraft({ birthDate: formatDate(birthDate) });
              navigation.navigate("OnboardingGender" as never);
            }}
          >
            <Text style={styles.onboardNextText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default OnboardingAge;
