/** @format */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";
import OnboardingVideo from "../components/OnboardingVideo";
import OnboardingProgressBar from "../components/OnboardingProgressBar";
import { useOnboardingDraft } from "../src/queries/onboarding.queries";
import { useI18n } from "../src/i18n";

const OnboardingName = () => {
  const { t } = useI18n();
  const navigation = useNavigation();
  const { draft, updateDraft } = useOnboardingDraft();
  const [name, setName] = useState(draft.displayName ?? "");

  const goToNextStep = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    updateDraft({ displayName: trimmedName });
    navigation.navigate("OnboardingAge" as never);
  };

  return (
    <View style={styles.bg}>
      <View style={styles.onboardContainer}>
        <View style={styles.onboardHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={22} color={DARK_GRAY} />
          </TouchableOpacity>
          <OnboardingProgressBar screenName="OnboardingName" />
        </View>

        <Text style={styles.onboardTitle}>{t("onboarding.nameTitle")}</Text>
        <Text style={styles.onboardSubtitle}>{t("onboarding.nameSubtitle")}</Text>

        <View style={styles.loginField}>
          <TextInput
            style={styles.loginInput}
            placeholder={t("onboarding.namePlaceholder")}
            placeholderTextColor="#6E6E6E"
            autoCapitalize="words"
            returnKeyType="done"
            value={name}
            onChangeText={setName}
            maxLength={50}
            onSubmitEditing={goToNextStep}
          />
        </View>

        <OnboardingVideo containerStyle={localStyles.videoWrap} />

        <View style={styles.onboardFooter}>
          <TouchableOpacity
            style={[
              styles.onboardNext,
              !name.trim() && styles.onboardNextDisabled,
            ]}
            disabled={!name.trim()}
            onPress={goToNextStep}
          >
            <Text style={styles.onboardNextText}>{t("common.next")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default OnboardingName;

const localStyles = StyleSheet.create({
  videoWrap: {
    width: "100%",
    flex: 1,
    minHeight: 320,
    marginTop: 18,
    marginBottom: 12,
  },
});
