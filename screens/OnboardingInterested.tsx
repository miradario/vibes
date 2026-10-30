import CancelOnboardingButton from "../components/CancelOnboardingButton";
/** @format */

import React, { useState } from "react";
import { View, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { Text } from "../components/Typography";
import { useNavigation } from "@react-navigation/native";
import styles from "../assets/styles";
import AppHeader from "../components/AppHeader";
import OnboardingProgressBar from "../components/OnboardingProgressBar";
import VibesLoader from "../components/VibesLoader";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  useCompleteOnboardingMutation,
  useOnboardingDraft,
} from "../src/queries/onboarding.queries";
import { getIntentLabel, INTENTS } from "../src/constants/lookups";
import { useI18n } from "../src/i18n";
import Icon from "../components/Icon";
import { optionCardCheck, optionCardStyles } from "../components/ui/optionCardStyles";
import * as ds from "../src/theme/tokens";

const OnboardingInterested = () => {
  const { locale, t } = useI18n();
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const { draft, updateDraft, resetDraft } = useOnboardingDraft();
  const completeMutation = useCompleteOnboardingMutation();
  const [selected, setSelected] = useState<number | null>(
    draft.intentId ?? null
  );

  return (
    <View style={styles.bg}>
      <View style={styles.onboardContainer}>
        <AppHeader right={<CancelOnboardingButton />} showBack onBack={() => navigation.goBack()} style={styles.onboardHeader} contentStyle={styles.onboardHeaderProgress}>
          <OnboardingProgressBar screenName="OnboardingInterested" />
        </AppHeader>

        <Text style={styles.onboardTitle} maxFontSizeMultiplier={1}>
          {t("onboarding.interestedTitle")}
        </Text>

        <View style={styles.onboardOptions}>
          {INTENTS.map((option) => {
            const isSelected = selected === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                activeOpacity={ds.opacity.pressed}
                style={[localStyles.option, isSelected && optionCardStyles.selected]}
                onPress={() => setSelected(option.id)}
              >
                <Text style={[optionCardStyles.label, optionCardStyles.copy]}>
                  {getIntentLabel(option.id, locale)}
                </Text>
                {isSelected ? (
                  <Icon name={optionCardCheck.name} size={optionCardCheck.size} color={optionCardCheck.color} />
                ) : null}
              </TouchableOpacity>
            );
          })}
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
              <VibesLoader />
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
  option: { ...optionCardStyles.base, marginBottom: ds.spacing[3] },
  videoWrap: {
    flex: 1,
    minHeight: 320,
    marginTop: ds.spacing[4],
    marginBottom: ds.spacing[3],
  },
});
