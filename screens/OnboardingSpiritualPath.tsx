/** @format */

import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";
import OnboardingVideo from "../components/OnboardingVideo";
import SpiritualPathDetailsModal from "../components/SpiritualPathDetailsModal";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  getSelectedSpiritualPaths,
  hasSpiritualPathDetail,
  normalizeSpiritualPathDetail,
  normalizeSpiritualPathDetails,
  SPIRITUAL_PATH_OPTIONS,
  type SpiritualPathDetail,
  type SpiritualPathDetails,
} from "../src/lib/spiritualPaths";
import {
  useCompleteOnboardingMutation,
  useOnboardingDraft,
} from "../src/queries/onboarding.queries";
import { useI18n } from "../src/i18n";
import { translateSpiritualPathLabel } from "../src/i18n/translations";
import { getOnboardingProgress } from "../src/lib/onboardingFlow";

const OnboardingSpiritualPath = () => {
  const { locale, t } = useI18n();
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const { draft, updateDraft, resetDraft } = useOnboardingDraft();
  const completeMutation = useCompleteOnboardingMutation();
  const [selectedPaths, setSelectedPaths] = useState<string[]>(
    getSelectedSpiritualPaths(draft.spiritualPath, draft.spiritualPathDetails),
  );
  const [pathDetails, setPathDetails] = useState<SpiritualPathDetails>(
    normalizeSpiritualPathDetails(draft.spiritualPathDetails),
  );
  const [activePath, setActivePath] = useState<string | null>(null);

  const progress = getOnboardingProgress("OnboardingSpiritualPath");

  const openPathEditor = (path: string) => {
    setSelectedPaths((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setActivePath(path);
  };

  const updatePathDetail = (path: string, nextDetail: SpiritualPathDetail) => {
    setPathDetails((prev) => ({
      ...prev,
      [path]: normalizeSpiritualPathDetail(nextDetail),
    }));
  };

  const removePath = (path: string) => {
    setSelectedPaths((prev) => prev.filter((item) => item !== path));
    setPathDetails((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    setActivePath(null);
  };

  const continueOnboarding = async () => {
    const userId = session?.user?.id;
    if (!userId) {
      Alert.alert(t("common.error"), t("onboarding.onboardingError"));
      return;
    }

    const nextDraft = {
      ...draft,
      spiritualPath: selectedPaths,
      spiritualPathDetails: pathDetails,
    };

    updateDraft({
      spiritualPath: selectedPaths,
      spiritualPathDetails: pathDetails,
    });

    try {
      await completeMutation.mutateAsync({
        userId,
        draft: nextDraft,
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

        <Text style={styles.onboardTitle}>{t("onboarding.spiritualTitle")}</Text>
        <Text style={styles.onboardSubtitle}>{t("onboarding.spiritualSubtitle")}</Text>

        <ScrollView
          style={styles.onboardList}
          showsVerticalScrollIndicator={false}
        >
          {SPIRITUAL_PATH_OPTIONS.map((path) => (
            <TouchableOpacity
              key={path}
              style={styles.onboardListItem}
              onPress={() => openPathEditor(path)}
            >
              <View>
                <Text style={styles.onboardListText}>
                  {translateSpiritualPathLabel(locale, path)}
                </Text>
                {selectedPaths.includes(path) ? (
                  <Text style={localStyles.selectedPathHint}>
                    {hasSpiritualPathDetail(pathDetails[path])
                      ? t("onboarding.spiritualEditOptional")
                      : t("onboarding.spiritualAddOptional")}
                  </Text>
                ) : null}
              </View>
              <View
                style={[
                  styles.onboardCheck,
                  selectedPaths.includes(path) && styles.onboardCheckActive,
                ]}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <OnboardingVideo containerStyle={localStyles.videoWrap} />

        <View style={styles.onboardFooter}>
          <TouchableOpacity
            style={[
              styles.onboardNext,
              completeMutation.isPending && styles.onboardNextDisabled,
            ]}
            onPress={continueOnboarding}
            disabled={completeMutation.isPending}
          >
            {completeMutation.isPending ? (
              <ActivityIndicator color={DARK_GRAY} />
            ) : (
              <Text style={styles.onboardNextText}>{t("common.continue")}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={localStyles.skipButton}
            onPress={continueOnboarding}
            disabled={completeMutation.isPending}
          >
            <Text style={styles.onboardSkip}>{t("common.skip")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SpiritualPathDetailsModal
        visible={Boolean(activePath)}
        pathLabel={activePath}
        detail={activePath ? pathDetails[activePath] ?? {} : {}}
        onChange={(nextDetail) => {
          if (!activePath) return;
          updatePathDetail(activePath, nextDetail);
        }}
        onClose={() => setActivePath(null)}
        onRemove={activePath ? () => removePath(activePath) : undefined}
      />
    </View>
  );
};

export default OnboardingSpiritualPath;

const localStyles = StyleSheet.create({
  videoWrap: {
    width: "100%",
    height: 220,
    marginTop: 18,
    marginBottom: 12,
  },
  selectedPathHint: {
    color: "#8C7B63",
    fontSize: 13,
    marginTop: 2,
  },
  skipButton: {
    alignItems: "center",
    marginTop: 10,
  },
});
