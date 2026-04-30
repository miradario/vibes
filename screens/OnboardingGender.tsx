/** @format */

import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";
import OnboardingVideo from "../components/OnboardingVideo";
import OnboardingProgressBar from "../components/OnboardingProgressBar";
import { useOnboardingDraft } from "../src/queries/onboarding.queries";
import { GENDERS, getGenderLabel } from "../src/constants/lookups";
import { useI18n } from "../src/i18n";

const OnboardingGender = () => {
  const { locale, t } = useI18n();
  const navigation = useNavigation();
  const { draft, updateDraft } = useOnboardingDraft();
  const [selected, setSelected] = useState<number | null>(
    draft.genderId ?? null
  );
  return (
    <View style={styles.bg}>
      <View style={styles.onboardContainer}>
        <View style={styles.onboardHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={22} color={DARK_GRAY} />
          </TouchableOpacity>
          <OnboardingProgressBar screenName="OnboardingGender" />
        </View>

        <Text style={styles.onboardTitle}>{t("onboarding.genderTitle")}</Text>

        <View style={styles.onboardOptions}>
          {GENDERS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.onboardOption,
                selected === option.id && styles.onboardOptionActive,
              ]}
              onPress={() => setSelected(option.id)}
            >
              <Text
                style={[
                  styles.onboardOptionText,
                  selected === option.id && localStyles.selectedOptionText,
                ]}
              >
                {getGenderLabel(option.id, locale)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <OnboardingVideo containerStyle={localStyles.videoWrap} />

        <View style={styles.onboardFooter}>
          <TouchableOpacity
            style={[
              styles.onboardNext,
              !selected && styles.onboardNextDisabled,
            ]}
            disabled={!selected}
            onPress={() => {
              if (!selected) return;
              updateDraft({ genderId: selected });
              navigation.navigate("OnboardingPhoto" as never);
            }}
          >
            <Text style={styles.onboardNextText}>{t("common.next")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default OnboardingGender;

const localStyles = StyleSheet.create({
  videoWrap: {
    flex: 1,
    minHeight: 320,
    marginTop: 18,
    marginBottom: 12,
  },
  selectedOptionText: {
    color: "#FFFFFF",
  },
});
