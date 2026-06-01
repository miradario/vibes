import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { CommonActions, useNavigation } from "@react-navigation/native";
import Icon from "../../../components/Icon";
import SpiritualPathDetailsModal from "../../../components/SpiritualPathDetailsModal";
import OnboardingScreenContainer from "../../../components/onboarding/OnboardingScreenContainer";
import OptionCard from "../../../components/onboarding/OptionCard";
import PrimaryButton from "../../../components/onboarding/PrimaryButton";
import ProfilePhotoPicker from "../../../components/onboarding/ProfilePhotoPicker";
import ProgressHeader from "../../../components/onboarding/ProgressHeader";
import SelectablePill from "../../../components/onboarding/SelectablePill";
import { useAuthSession } from "../../auth/auth.queries";
import type { SpiritualPathDetails } from "../../lib/spiritualPaths";
import {
  normalizeSpiritualPathDetail,
  normalizeSpiritualPathDetails,
  type SpiritualPathDetail,
} from "../../lib/spiritualPaths";
import {
  useCompleteOnboardingMutation,
  useOnboardingDraft,
} from "../../queries/onboarding.queries";
import {
  ENERGY_OPTIONS,
  PRACTICE_OPTIONS,
  PURPOSE_OPTIONS,
  VIBES_ONBOARDING_STEPS,
  type VibesOnboardingStep,
} from "./vibesOnboardingContent";
import {
  ONBOARDING_COLORS,
  onboardingStyles,
  toneColor,
} from "./vibesOnboardingStyles";
import VibesMinimalOnboarding from "./VibesMinimalOnboarding";
import { useI18n } from "../../i18n";

const ANIMATION_DURATION = 240;
const MIN_AGE = 18;
const MAX_AGE = 99;

const getProgress = (stepIndex: number) =>
  (stepIndex + 1) / VIBES_ONBOARDING_STEPS.length;
const getOpenAIModel = () =>
  process.env.EXPO_PUBLIC_OPENAI_MODEL?.trim() || "gpt-4o-mini";
const getOpenAIAPIKey = () => process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim();

const buildAboutMe = (purposeIds: string[], energyIds: string[]) => {
  const purposeLabels = PURPOSE_OPTIONS
    .filter((option) => purposeIds.includes(option.id))
    .map((option) => option.label);
  const energyLabels = ENERGY_OPTIONS
    .filter((option) => energyIds.includes(option.id))
    .map((option) => option.label);

  return [
    purposeLabels.length ? `Me trae a Vibes: ${purposeLabels.join(", ")}.` : "",
    energyLabels.length ? `Hoy me siento: ${energyLabels.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
};

const getSelectedLabels = (
  selectedIds: string[],
  options: { id: string; label: string }[],
) =>
  options
    .filter((option) => selectedIds.includes(option.id))
    .map((option) => option.label);

const buildProfileAboutMe = (
  briefDescription: string,
  purposeIds: string[],
  energyIds: string[],
) =>
  [briefDescription.trim(), buildAboutMe(purposeIds, energyIds)]
    .filter(Boolean)
    .join(" ");

const normalizeAgeInput = (value: string) =>
  value.replace(/\D/g, "").slice(0, 2);

const getApproximateBirthDateFromAge = (ageValue: string) => {
  const age = Number.parseInt(ageValue, 10);
  if (!Number.isFinite(age) || age < MIN_AGE || age > MAX_AGE) return "";
  const now = new Date();
  return `${now.getFullYear() - age}-01-01`;
};

const getOptionLabels = (
  selectedIds: string[],
  options: { id: string; label: string }[],
) =>
  options
    .filter((option) => selectedIds.includes(option.id))
    .map((option) => option.label.toLowerCase());

const formatShortList = (items: string[], maxItems = 2) => {
  const visibleItems = items.slice(0, maxItems);
  if (!visibleItems.length) return "";
  if (visibleItems.length === 1) return visibleItems[0];
  return `${visibleItems.slice(0, -1).join(", ")} y ${visibleItems[visibleItems.length - 1]}`;
};

const buildCompletionSummary = ({
  displayName,
  purposeIds,
  energyIds,
  selectedPractices,
  briefDescription,
}: {
  displayName: string;
  purposeIds: string[];
  energyIds: string[];
  selectedPractices: string[];
  briefDescription: string;
}) => {
  const name = displayName.trim();
  const purposes = formatShortList(getOptionLabels(purposeIds, PURPOSE_OPTIONS));
  const energies = formatShortList(getOptionLabels(energyIds, ENERGY_OPTIONS));
  const practices = formatShortList(
    selectedPractices
      .filter((practice) => practice !== "Otras")
      .map((practice) => practice.toLowerCase()),
  );
  const selfDescription = briefDescription.trim();
  const intro = name ? `${name}, tu vibe combina` : "Tu vibe combina";
  const parts = [
    purposes || selfDescription
      ? `${purposes || selfDescription.toLowerCase()}`
      : "",
    energies ? `energía ${energies}` : "",
    practices ? `prácticas como ${practices}` : "",
  ].filter(Boolean);

  if (!parts.length) {
    return `${intro} calma, presencia y apertura.`;
  }

  return `${intro} ${parts.join(", ")}.`;
};

const generateCompletionSummaryWithAI = async ({
  displayName,
  purposeIds,
  energyIds,
  selectedPractices,
  briefDescription,
  ageRange,
}: {
  displayName: string;
  purposeIds: string[];
  energyIds: string[];
  selectedPractices: string[];
  briefDescription: string;
  ageRange: string;
}) => {
  const apiKey = getOpenAIAPIKey();
  if (!apiKey) {
    throw new Error("Missing OpenAI API key");
  }

  const purposeLabels = getOptionLabels(purposeIds, PURPOSE_OPTIONS);
  const energyLabels = getOptionLabels(energyIds, ENERGY_OPTIONS);
  const practiceLabels = selectedPractices.filter((practice) => practice !== "Otras");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getOpenAIModel(),
      temperature: 0.82,
      messages: [
        {
          role: "system",
          content:
            "Escribí sólo el texto final para una app espiritual premium llamada Vibes. Sin comillas, sin markdown, sin emojis.",
        },
        {
          role: "user",
          content: [
            "Creá un resumen breve, cálido y emocional de esta persona para cerrar su onboarding.",
            "Debe sonar humano, minimalista, espiritual y premium.",
            "Máximo 145 caracteres.",
            "No digas que fue creado con IA.",
            displayName.trim() ? `Nombre: ${displayName.trim()}.` : null,
            ageRange ? `Edad: ${ageRange} años.` : null,
            briefDescription.trim()
              ? `Descripción propia: ${briefDescription.trim()}.`
              : null,
            purposeLabels.length ? `Viene a Vibes por: ${purposeLabels.join(", ")}.` : null,
            energyLabels.length ? `Energía actual: ${energyLabels.join(", ")}.` : null,
            practiceLabels.length ? `Prácticas: ${practiceLabels.join(", ")}.` : null,
          ]
            .filter(Boolean)
            .join(" "),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI summary failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const summary = data.choices?.[0]?.message?.content?.trim();
  if (!summary) {
    throw new Error("OpenAI summary was empty");
  }

  return summary.replace(/\s+/g, " ");
};

const VibesOnboardingFlow = () => {
  const navigation = useNavigation();
  const { locale, t } = useI18n();
  const { data: session } = useAuthSession();
  const { draft, updateDraft, resetDraft } = useOnboardingDraft();
  const completeMutation = useCompleteOnboardingMutation();
  const transition = useRef(new Animated.Value(1)).current;
  const [stepIndex, setStepIndex] = useState(0);
  const [purposeIds, setPurposeIds] = useState<string[]>(draft.purpose ?? []);
  const [energyIds, setEnergyIds] = useState<string[]>(draft.energy ?? []);
  const [displayName, setDisplayName] = useState(draft.displayName ?? "");
  const [briefDescription, setBriefDescription] = useState(
    draft.briefDescription ?? "",
  );
  const [age, setAge] = useState(draft.age ?? "");
  const [photoUri, setPhotoUri] = useState(draft.primaryPhotoUri ?? "");
  const [selectedPractices, setSelectedPractices] = useState<string[]>(
    draft.spiritualPath ?? [],
  );
  const [practiceDetails, setPracticeDetails] = useState<SpiritualPathDetails>(
    normalizeSpiritualPathDetails(draft.spiritualPathDetails),
  );
  const [activePractice, setActivePractice] = useState<string | null>(null);
  const [customPracticeModalVisible, setCustomPracticeModalVisible] = useState(false);
  const [customPracticeName, setCustomPracticeName] = useState("");
  const [aiCompletionSummary, setAiCompletionSummary] = useState<string | null>(null);

  const step = VIBES_ONBOARDING_STEPS[stepIndex];
  const copy = {
    title: t(`vibesOnboarding.${step}.title`),
    subtitle: t(`vibesOnboarding.${step}.subtitle`),
    button: t(`vibesOnboarding.${step}.button`),
  };
  const fallbackCompletionSummary = useMemo(
    () => {
      if (locale === "en") {
        const name = displayName.trim();
        const purposes = formatShortList(
          PURPOSE_OPTIONS.filter((option) => purposeIds.includes(option.id)).map((option) =>
            t(`vibesOnboarding.purposeOptions.${option.id}`).toLowerCase(),
          ),
        );
        const energies = formatShortList(
          ENERGY_OPTIONS.filter((option) => energyIds.includes(option.id)).map((option) =>
            t(`vibesOnboarding.energyOptions.${option.id}`).toLowerCase(),
          ),
        );
        const practices = formatShortList(
          selectedPractices
            .filter((practice) => practice !== "Otras")
            .map((practice) =>
              t(`vibesOnboarding.practicesOptions.${practice}`).toLowerCase(),
            ),
        );
        const parts = [
          purposes,
          energies ? `${energies} energy` : "",
          practices ? `practices like ${practices}` : "",
        ].filter(Boolean);

        if (!parts.length) {
          return name
            ? `${name}, your vibe reflects presence, calm and openness.`
            : "Your vibe reflects presence, calm and openness.";
        }

        return `${name ? `${name}, your vibe brings` : "Your vibe brings"} ${parts.join(", ")}.`;
      }

      return buildCompletionSummary({
        displayName,
        purposeIds,
        energyIds,
        selectedPractices,
        briefDescription,
      });
    },
    [briefDescription, displayName, energyIds, locale, purposeIds, selectedPractices, t],
  );
  const completionSummary = aiCompletionSummary ?? fallbackCompletionSummary;

  useEffect(() => {
    transition.setValue(0);
    Animated.timing(transition, {
      toValue: 1,
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [stepIndex, transition]);

  useEffect(() => {
    if (step !== "completion") return undefined;

    let cancelled = false;
    setAiCompletionSummary(null);

    if (locale === "en") {
      setAiCompletionSummary(fallbackCompletionSummary);
      return undefined;
    }

    generateCompletionSummaryWithAI({
      displayName,
      purposeIds,
      energyIds,
      selectedPractices,
      briefDescription,
      ageRange: age,
    })
      .then((summary) => {
        if (!cancelled) setAiCompletionSummary(summary);
      })
      .catch(() => {
        if (!cancelled) setAiCompletionSummary(fallbackCompletionSummary);
      });

    return () => {
      cancelled = true;
    };
  }, [
    age,
    briefDescription,
    displayName,
    energyIds,
    fallbackCompletionSummary,
    locale,
    purposeIds,
    selectedPractices,
    step,
  ]);

  const animatedStyle = {
    opacity: transition,
    transform: [
      {
        translateY: transition.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
    ],
  };

  const currentDraft = useMemo(
    () => ({
      ...draft,
      purposeIds,
      energyIds,
      displayName,
      briefDescription,
      age,
      ageRange: age,
      birthDate: getApproximateBirthDateFromAge(age),
      spiritualPath: selectedPractices,
      spiritualPathDetails: practiceDetails,
      aboutMe: buildProfileAboutMe(briefDescription, purposeIds, energyIds),
      purpose: getSelectedLabels(purposeIds, PURPOSE_OPTIONS),
      energy: getSelectedLabels(energyIds, ENERGY_OPTIONS),
      otherTags: [
        ...getSelectedLabels(purposeIds, PURPOSE_OPTIONS),
        ...getSelectedLabels(energyIds, ENERGY_OPTIONS),
        ...selectedPractices,
        age ? `age:${age}` : "",
      ].filter(Boolean),
      photoUris: photoUri ? [photoUri] : [],
      primaryPhotoUri: photoUri,
    }),
    [
      age,
      briefDescription,
      displayName,
      draft,
      energyIds,
      photoUri,
      practiceDetails,
      purposeIds,
      selectedPractices,
    ],
  );

  const canContinue =
    (step === "purpose" && purposeIds.length > 0) ||
    (step === "energy" && energyIds.length > 0) ||
    (step === "profile" &&
      Boolean(displayName.trim()) &&
      Number.parseInt(age, 10) >= MIN_AGE &&
      Number.parseInt(age, 10) <= MAX_AGE) ||
    step === "practices" ||
    step === "completion";

  const practiceOptions = useMemo(() => {
    const baseOptions = PRACTICE_OPTIONS.filter((practice) => practice !== "Otras");
    const customOptions = selectedPractices.filter(
      (practice) => !PRACTICE_OPTIONS.includes(practice as never),
    );

    return [...baseOptions, ...customOptions, "Otras"];
  }, [selectedPractices]);

  const goBack = () => {
    if (stepIndex === 0) {
      navigation.goBack();
      return;
    }
    setStepIndex((prev) => Math.max(0, prev - 1));
  };

  const goNext = async () => {
    updateDraft(currentDraft);

    if (step !== "completion") {
      setStepIndex((prev) =>
        Math.min(VIBES_ONBOARDING_STEPS.length - 1, prev + 1),
      );
      return true;
    }

    const userId = session?.user?.id;
    if (!userId) {
      Alert.alert(
        t("vibesOnboarding.missingSessionTitle"),
        t("vibesOnboarding.missingSessionMessage"),
      );
      return false;
    }

    try {
      await completeMutation.mutateAsync({
        userId,
        draft: currentDraft,
      });
      resetDraft();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Tab" as never }],
        }),
      );
      return true;
    } catch (error) {
      Alert.alert(
        t("common.error"),
        error instanceof Error ? error.message : t("onboarding.onboardingError"),
      );
      return false;
    }
  };

  const togglePurpose = (id: string) => {
    setPurposeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleEnergy = (id: string) => {
    setEnergyIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const togglePractice = (practice: string) => {
    if (practice === "Otras") {
      setCustomPracticeName("");
      setCustomPracticeModalVisible(true);
      return;
    }

    setSelectedPractices((prev) => {
      if (prev.includes(practice)) {
        setPracticeDetails((details) => {
          const next = { ...details };
          delete next[practice];
          return next;
        });
        return prev.filter((item) => item !== practice);
      }
      setActivePractice(practice);
      return [...prev, practice];
    });
  };

  const addCustomPractice = () => {
    const nextPractice = customPracticeName.trim();
    if (!nextPractice) return;

    setSelectedPractices((prev) =>
      prev.includes(nextPractice) ? prev : [...prev, nextPractice],
    );
    setCustomPracticeModalVisible(false);
    setCustomPracticeName("");
    setActivePractice(nextPractice);
  };

  const handlePhotoChange = (nextUri: string) => {
    setPhotoUri(nextUri);
    updateDraft({
      primaryPhotoUri: nextUri,
      photoUris: nextUri ? [nextUri] : [],
    });
  };

  const updatePracticeDetail = (practice: string, nextDetail: SpiritualPathDetail) => {
    setPracticeDetails((prev) => ({
      ...prev,
      [practice]: normalizeSpiritualPathDetail(nextDetail),
    }));
  };

  const getPracticeLabel = (practice: string) =>
    t(`vibesOnboarding.practicesOptions.${practice}`);

  const renderTitle = (targetStep: VibesOnboardingStep) => (
    <>
      <Text
        style={[
          onboardingStyles.title,
          targetStep === "completion" && onboardingStyles.centeredTitle,
        ]}
        maxFontSizeMultiplier={1}
      >
        {copy.title}
      </Text>
      <Text
        style={[
          onboardingStyles.subtitle,
          targetStep === "completion" && onboardingStyles.centeredSubtitle,
        ]}
      >
        {copy.subtitle}
      </Text>
    </>
  );

  const renderPurpose = () => (
    <>
      {renderTitle("purpose")}
      <View style={onboardingStyles.optionList}>
        {PURPOSE_OPTIONS.map((option) => (
          <OptionCard
            key={option.id}
            option={{
              ...option,
              label: t(`vibesOnboarding.purposeOptions.${option.id}`),
            }}
            selected={purposeIds.includes(option.id)}
            onPress={() => togglePurpose(option.id)}
          />
        ))}
      </View>
    </>
  );

  const renderEnergy = () => (
    <>
      {renderTitle("energy")}
      <View style={onboardingStyles.energyGrid}>
        {ENERGY_OPTIONS.map((option) => {
          const selected = energyIds.includes(option.id);
          return (
            <TouchableOpacity
              key={option.id}
              style={onboardingStyles.energyItem}
              onPress={() => toggleEnergy(option.id)}
              activeOpacity={0.82}
            >
              <View
                style={[
                  onboardingStyles.energyCircle,
                  { backgroundColor: `${toneColor(option.tone)}42` },
                  selected && { borderWidth: 1, borderColor: ONBOARDING_COLORS.mustard },
                ]}
              >
                <Icon
                  name={option.icon as never}
                  size={26}
                  color={selected ? ONBOARDING_COLORS.mustard : ONBOARDING_COLORS.text}
                />
              </View>
              <Text style={onboardingStyles.energyLabel}>
                {t(`vibesOnboarding.energyOptions.${option.id}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  const renderProfile = () => (
    <>
      {renderTitle("profile")}
      <View style={onboardingStyles.profileWrap}>
        <ProfilePhotoPicker uri={photoUri} onChange={handlePhotoChange} />
        <View style={onboardingStyles.fieldGroup}>
          <View style={onboardingStyles.inputRow}>
            <Icon name="person-outline" size={20} color={ONBOARDING_COLORS.mustard} />
            <TextInput
              style={onboardingStyles.input}
              placeholder={t("vibesOnboarding.profile.namePlaceholder")}
              placeholderTextColor="rgba(110, 110, 110, 0.55)"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              maxLength={50}
            />
          </View>

          <View style={[onboardingStyles.inputRow, onboardingStyles.textAreaRow]}>
            <Icon name="document-text-outline" size={20} color={ONBOARDING_COLORS.mustard} />
            <TextInput
              style={[onboardingStyles.input, onboardingStyles.textAreaInput]}
              placeholder={t("vibesOnboarding.profile.descriptionPlaceholder")}
              placeholderTextColor="rgba(110, 110, 110, 0.55)"
              value={briefDescription}
              onChangeText={setBriefDescription}
              multiline
              maxLength={160}
              textAlignVertical="top"
            />
          </View>

          <View style={onboardingStyles.inputRow}>
            <Icon name="calendar-outline" size={20} color={ONBOARDING_COLORS.mustard} />
            <TextInput
              style={onboardingStyles.input}
              placeholder={t("vibesOnboarding.profile.agePlaceholder")}
              placeholderTextColor="rgba(110, 110, 110, 0.55)"
              value={age}
              onChangeText={(value) => setAge(normalizeAgeInput(value))}
              keyboardType="number-pad"
              maxLength={2}
            />
            {age ? (
              <Text style={[onboardingStyles.ageValue, { flex: 0, marginLeft: 8 }]}>
                {t("vibesOnboarding.profile.years")}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </>
  );

  const renderPractices = () => (
    <>
      {renderTitle("practices")}
      <View style={onboardingStyles.pillGrid}>
        {practiceOptions.map((practice) => (
          <SelectablePill
            key={practice}
            label={getPracticeLabel(practice)}
            selected={selectedPractices.includes(practice)}
            isAddOption={practice === "Otras"}
            onPress={() => togglePractice(practice)}
          />
        ))}
      </View>
    </>
  );

  const renderStep = () => {
    if (step === "purpose") return renderPurpose();
    if (step === "energy") return renderEnergy();
    if (step === "profile") return renderProfile();
    if (step === "practices") return renderPractices();
    return null;
  };

  const activePracticeDetail = activePractice
    ? practiceDetails[activePractice] ?? {}
    : {};

  return (
    <>
      {step === "completion" ? (
        <VibesMinimalOnboarding
          title=""
          body={completionSummary}
          ctaLabel={copy.button}
          reverseVideoOnContinue
          onContinue={goNext}
        />
      ) : (
        <OnboardingScreenContainer
          footer={
            <PrimaryButton
              label={copy.button}
              onPress={() => void goNext()}
              disabled={!canContinue}
              loading={completeMutation.isPending}
            />
          }
        >
          <ProgressHeader
            progress={getProgress(stepIndex)}
            onBack={goBack}
            showBack={stepIndex > 0}
          />
          <Animated.View style={animatedStyle}>{renderStep()}</Animated.View>
        </OnboardingScreenContainer>
      )}

      <SpiritualPathDetailsModal
        visible={Boolean(activePractice)}
        pathLabel={activePractice ? getPracticeLabel(activePractice) : activePractice}
        detail={activePracticeDetail}
        onClose={() => setActivePractice(null)}
        onChange={(next) => {
          if (activePractice) updatePracticeDetail(activePractice, next);
        }}
        onRemove={() => {
          if (!activePractice) return;
          setSelectedPractices((prev) => prev.filter((item) => item !== activePractice));
          setPracticeDetails((prev) => {
            const next = { ...prev };
            delete next[activePractice];
            return next;
          });
          setActivePractice(null);
        }}
      />

      <Modal
        visible={customPracticeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomPracticeModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={onboardingStyles.modalOverlay}
          onPress={() => setCustomPracticeModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={onboardingStyles.customPracticeCard}
            onPress={() => undefined}
          >
            <Text style={onboardingStyles.customPracticeTitle}>
              {t("vibesOnboarding.practices.customPracticeTitle")}
            </Text>
            <TextInput
              style={onboardingStyles.customPracticeInput}
              placeholder={t("vibesOnboarding.practices.customPracticePlaceholder")}
              placeholderTextColor="rgba(110, 110, 110, 0.48)"
              value={customPracticeName}
              onChangeText={setCustomPracticeName}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={addCustomPractice}
            />
            <View style={onboardingStyles.customPracticeFooter}>
              <TouchableOpacity
                style={onboardingStyles.customPracticeSecondary}
                onPress={() => setCustomPracticeModalVisible(false)}
              >
                <Text style={onboardingStyles.customPracticeSecondaryText}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  onboardingStyles.customPracticePrimary,
                  !customPracticeName.trim() &&
                    onboardingStyles.customPracticePrimaryDisabled,
                ]}
                disabled={!customPracticeName.trim()}
                onPress={addCustomPractice}
              >
                <Text style={onboardingStyles.customPracticePrimaryText}>
                  {t("vibesOnboarding.practices.add")}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export default VibesOnboardingFlow;
