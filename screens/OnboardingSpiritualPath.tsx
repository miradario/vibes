/** @format */

import React, { useState } from "react";
import {
  Alert,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY, GRAY, WHITE } from "../assets/styles";
import AppHeader from "../components/AppHeader";
import OnboardingVideo from "../components/OnboardingVideo";
import OnboardingProgressBar from "../components/OnboardingProgressBar";
import VibesLoader from "../components/VibesLoader";
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
import { vibesTheme } from "../src/theme/vibesTheme";

const ONBOARDING_OTHER_DEFAULT_OPTIONS = ["Viajes", "Animales", "Arte"];

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
  const [aboutMe, setAboutMe] = useState(draft.aboutMe ?? "");
  const [vegetarian, setVegetarian] = useState<"Sí" | "No">(
    draft.vegetarian === "Sí" ? "Sí" : "No",
  );
  const [otherOptions, setOtherOptions] = useState<string[]>(
    Array.from(
      new Set([
        ...ONBOARDING_OTHER_DEFAULT_OPTIONS,
        ...(draft.otherTags ?? []),
      ]),
    ),
  );
  const [selectedOtherTags, setSelectedOtherTags] = useState<string[]>(
    draft.otherTags ?? [],
  );
  const [customTag, setCustomTag] = useState("");

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

  const toggleOther = (item: string) => {
    setSelectedOtherTags((prev) =>
      prev.includes(item) ? prev.filter((value) => value !== item) : [...prev, item],
    );
  };

  const addCustomTag = () => {
    const next = customTag.trim();
    if (!next) {
      Alert.alert(t("settings.missingInterestTitle"), t("settings.missingInterestMessage"));
      return;
    }
    if (otherOptions.includes(next)) {
      Alert.alert(t("settings.duplicateInterestTitle"), t("settings.duplicateInterestMessage"));
      setCustomTag("");
      return;
    }
    setOtherOptions((prev) => [...prev, next]);
    setSelectedOtherTags((prev) => [...prev, next]);
    setCustomTag("");
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
      aboutMe,
      vegetarian,
      otherTags: selectedOtherTags,
    };

    updateDraft({
      spiritualPath: selectedPaths,
      spiritualPathDetails: pathDetails,
      aboutMe,
      vegetarian,
      otherTags: selectedOtherTags,
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
        <AppHeader showBack onBack={() => navigation.goBack()} style={styles.onboardHeader} contentStyle={styles.onboardHeaderProgress}>
          <OnboardingProgressBar screenName="OnboardingSpiritualPath" />
        </AppHeader>

        <Text style={styles.onboardTitle} maxFontSizeMultiplier={1}>
          {t("onboarding.spiritualTitle")}
        </Text>
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

          <View style={localStyles.extraSection}>
            <Text style={localStyles.extraSectionTitle}>{t("settings.aboutMe")}</Text>
            <TextInput
              style={[styles.loginInput, localStyles.aboutInput]}
              placeholder={t("settings.aboutMePlaceholder")}
              placeholderTextColor={GRAY}
              value={aboutMe}
              onChangeText={setAboutMe}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={localStyles.extraSection}>
            <Text style={localStyles.extraSectionTitle}>{t("settings.vegetarian")}</Text>
            <View style={localStyles.chipRow}>
              <TouchableOpacity
                style={[
                  localStyles.choiceChip,
                  vegetarian === "Sí" && localStyles.choiceChipActive,
                ]}
                onPress={() => setVegetarian("Sí")}
              >
                <Text
                  style={[
                    localStyles.choiceChipText,
                    vegetarian === "Sí" && localStyles.choiceChipTextActive,
                  ]}
                >
                  {t("common.yes")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  localStyles.choiceChip,
                  vegetarian === "No" && localStyles.choiceChipActive,
                ]}
                onPress={() => setVegetarian("No")}
              >
                <Text
                  style={[
                    localStyles.choiceChipText,
                    vegetarian === "No" && localStyles.choiceChipTextActive,
                  ]}
                >
                  {t("common.no")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={localStyles.extraSection}>
            <Text style={localStyles.extraSectionTitle}>{t("settings.other")}</Text>
            <View style={localStyles.chipRow}>
              {otherOptions.map((item) => {
                const active = selectedOtherTags.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    style={[
                      localStyles.choiceChip,
                      active && localStyles.choiceChipActive,
                    ]}
                    onPress={() => toggleOther(item)}
                  >
                    <Text
                      style={[
                        localStyles.choiceChipText,
                        active && localStyles.choiceChipTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={localStyles.otherInputRow}>
              <TextInput
                style={[styles.loginInput, localStyles.otherInput]}
                placeholder={t("settings.newInterestPlaceholder")}
                placeholderTextColor={GRAY}
                returnKeyType="done"
                value={customTag}
                onChangeText={setCustomTag}
                onSubmitEditing={addCustomTag}
              />
              <TouchableOpacity
                style={localStyles.addButton}
                onPress={addCustomTag}
                activeOpacity={0.9}
              >
                <Text style={localStyles.addButtonText}>{t("settings.addInterest")}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
              <VibesLoader size={34} />
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
  extraSection: {
    marginTop: 18,
  },
  extraSectionTitle: {
    color: DARK_GRAY,
    fontSize: 18,
    marginBottom: 10,
    fontFamily: vibesTheme.fonts.semibold,
  },
  aboutInput: {
    minHeight: 104,
    paddingTop: 14,
    paddingBottom: 14,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  choiceChip: {
    borderWidth: 1,
    borderColor: "#E4B76E",
    backgroundColor: WHITE,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  choiceChipActive: {
    backgroundColor: "#E4B76E",
    borderColor: "#E4B76E",
  },
  choiceChipText: {
    color: DARK_GRAY,
    fontSize: 14,
  },
  choiceChipTextActive: {
    color: WHITE,
  },
  otherInputRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginTop: 12,
  },
  otherInput: {
    flex: 1,
  },
  addButton: {
    borderRadius: 18,
    backgroundColor: "#E4B76E",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  addButtonText: {
    color: WHITE,
    fontSize: 13,
    fontFamily: vibesTheme.fonts.semibold,
  },
  skipButton: {
    alignItems: "center",
    marginTop: 10,
  },
});
