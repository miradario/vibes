/** @format */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";
import OnboardingVideo from "../components/OnboardingVideo";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  useCompleteOnboardingMutation,
  useOnboardingDraft,
} from "../src/queries/onboarding.queries";
import { getIntentLabel, INTENTS } from "../src/constants/lookups";
import { useI18n } from "../src/i18n";
import { getOnboardingProgress } from "../src/lib/onboardingFlow";

const OnboardingInterested = () => {
  const { locale, t } = useI18n();
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const { draft, updateDraft, resetDraft } = useOnboardingDraft();
  const completeMutation = useCompleteOnboardingMutation();
  const progress = getOnboardingProgress("OnboardingInterested");
  const [selected, setSelected] = useState<number | null>(
    draft.intentId ?? null
  );

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

        <Text style={styles.onboardTitle}>{t("onboarding.interestedTitle")}</Text>

        <View style={styles.onboardOptions}>
          {INTENTS.map((option) => (
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
                {getIntentLabel(option.id, locale)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <OnboardingVideo containerStyle={localStyles.videoWrap} />

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
                Alert.alert(t("common.error"), t("onboarding.registrationError"));
                return;
              }

              console.log("onboarding:submit", { userId, selected, draft });
              updateDraft({ intentId: selected });

              try {
                await completeMutation.mutateAsync({
                  userId,
                  draft: {
                    ...draft,
                    intentId: selected,
                  },
                });
                resetDraft();
                navigation.navigate("Tab" as never);
              } catch (error) {
                console.log("onboarding:submit_error", error);
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

export default OnboardingInterested;

const localStyles = StyleSheet.create({
  videoWrap: {
    flex: 1,
    minHeight: 320,
    marginTop: 18,
    marginBottom: 12,
  },
});
