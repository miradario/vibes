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
import { useOnboardingDraft } from "../src/queries/onboarding.queries";
import { useI18n } from "../src/i18n";
import { getOnboardingProgress } from "../src/lib/onboardingFlow";

const OnboardingName = () => {
  const { t } = useI18n();
  const navigation = useNavigation();
  const { draft, updateDraft } = useOnboardingDraft();
  const [name, setName] = useState(draft.displayName ?? "");

  const progress = getOnboardingProgress("OnboardingName");

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

        <Text style={styles.onboardTitle}>{t("onboarding.nameTitle")}</Text>
        <Text style={styles.onboardSubtitle}>{t("onboarding.nameSubtitle")}</Text>

        <View style={styles.loginField}>
          <TextInput
            style={styles.loginInput}
            placeholder={t("onboarding.namePlaceholder")}
            placeholderTextColor="#6E6E6E"
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
            maxLength={50}
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
            onPress={() => {
              updateDraft({ displayName: name.trim() });
              navigation.navigate("OnboardingAge" as never);
            }}
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
