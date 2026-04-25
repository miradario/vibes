/** @format */

import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from "react-native";
import { ResizeMode, Video } from "expo-av";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  useCompleteOnboardingMutation,
  useOnboardingDraft,
} from "../src/queries/onboarding.queries";
import { GENDERS, getGenderLabel } from "../src/constants/lookups";
import { useI18n } from "../src/i18n";

const OnboardingGender = () => {
  const { locale, t } = useI18n();
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const { draft, updateDraft, resetDraft } = useOnboardingDraft();
  const completeMutation = useCompleteOnboardingMutation();
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
          <View style={styles.onboardProgressTrack}>
            <View style={[styles.onboardProgressFill, { width: "100%" }]} />
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("Tab" as never)}>
            <Text style={styles.onboardSkip}>{t("common.skip")}</Text>
          </TouchableOpacity>
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
                  selected === option.id && styles.onboardOptionTextActive,
                ]}
              >
                {getGenderLabel(option.id, locale)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={localStyles.videoWrap}>
          <Video
            source={require("../assets/videos/name.mp4")}
            style={localStyles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isMuted
          />
        </View>

        <View style={styles.onboardFooter}>
          <TouchableOpacity
            style={[
              styles.onboardNext,
              (!selected || completeMutation.isPending) &&
                styles.onboardNextDisabled,
            ]}
            disabled={!selected || completeMutation.isPending}
            onPress={async () => {
              const userId = session?.user?.id;
              if (!selected || !userId) {
                Alert.alert(t("common.error"), t("onboarding.onboardingError"));
                return;
              }
              updateDraft({ genderId: selected });

              try {
                await completeMutation.mutateAsync({
                  userId,
                  draft: {
                    ...draft,
                    genderId: selected,
                  },
                });
                resetDraft();
                navigation.navigate("Tab" as never);
              } catch (error) {
                const message =
                  error instanceof Error
                    ? error.message
                    : t("onboarding.onboardingError");
                Alert.alert(t("common.error"), message);
              }
            }}
          >
            {completeMutation.isPending ? (
              <ActivityIndicator color={DARK_GRAY} />
            ) : (
              <Text style={styles.onboardNextText}>{t("common.next")}</Text>
            )}
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
  video: {
    width: "100%",
    height: "100%",
  },
});
