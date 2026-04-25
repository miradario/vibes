/** @format */

import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from "react-native";
import VibesHeader from "../src/components/VibesHeader";
import { ResizeMode, Video } from "expo-av";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  useCompleteOnboardingMutation,
  useOnboardingDraft,
} from "../src/queries/onboarding.queries";
import { useI18n } from "../src/i18n";

const OPTIONS = [
  "Straight",
  "Gay",
  "Lesbian",
  "Bisexual",
  "Asexual",
  "Demisexual",
  "Pansexual",
  "Queer",
  "Questioning",
];

const OnboardingOrientation = () => {
  const { t } = useI18n();
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const { draft, updateDraft, resetDraft } = useOnboardingDraft();
  const completeMutation = useCompleteOnboardingMutation();
  const [selected, setSelected] = useState<string[]>(draft.orientation ?? []);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      setSelected(selected.filter((v) => v !== value));
      return;
    }
    if (selected.length >= 3) return;
    setSelected([...selected, value]);
  };

  return (
    <View style={styles.bg}>
      <View style={styles.onboardContainer}>
        <VibesHeader
          title={t("onboarding.orientationTitle")}
          subtitle={t("onboarding.orientationSubtitle")}
        />

        <View style={styles.onboardList}>
          {OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.onboardListItem}
              onPress={() => toggle(option)}
            >
              <Text style={styles.onboardListText}>{option}</Text>
              <View
                style={[
                  styles.onboardCheck,
                  selected.includes(option) && styles.onboardCheckActive,
                ]}
              />
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
              (selected.length === 0 || completeMutation.isPending) &&
                styles.onboardNextDisabled,
            ]}
            disabled={selected.length === 0 || completeMutation.isPending}
            onPress={async () => {
              const userId = session?.user?.id;
              if (!userId) {
                Alert.alert(t("common.error"), t("onboarding.onboardingError"));
                return;
              }

              updateDraft({ orientation: selected });
              try {
                await completeMutation.mutateAsync({
                  userId,
                  draft: {
                    ...draft,
                    orientation: selected,
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

export default OnboardingOrientation;

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
