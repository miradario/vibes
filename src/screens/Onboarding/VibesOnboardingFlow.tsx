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
import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";
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
  AGE_RANGES,
  ENERGY_OPTIONS,
  PRACTICE_OPTIONS,
  PURPOSE_OPTIONS,
  STEP_COPY,
  VIBES_ONBOARDING_STEPS,
  type VibesOnboardingStep,
} from "./vibesOnboardingContent";
import {
  ONBOARDING_COLORS,
  onboardingStyles,
  toneColor,
} from "./vibesOnboardingStyles";
import VibesMinimalOnboarding from "./VibesMinimalOnboarding";

const DEFAULT_AGE_RANGE = "25-34";
const ANIMATION_DURATION = 240;

const getProgress = (stepIndex: number) =>
  (stepIndex + 1) / VIBES_ONBOARDING_STEPS.length;

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

const VibesOnboardingFlow = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const skipAccountCreation = Boolean(
    (route.params as { skipAccountCreation?: boolean } | undefined)
      ?.skipAccountCreation,
  );
  const { data: session } = useAuthSession();
  const { draft, updateDraft, resetDraft } = useOnboardingDraft();
  const completeMutation = useCompleteOnboardingMutation();
  const transition = useRef(new Animated.Value(1)).current;
  const [showWelcome, setShowWelcome] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [purposeIds, setPurposeIds] = useState<string[]>(draft.purpose ?? []);
  const [energyIds, setEnergyIds] = useState<string[]>(draft.energy ?? []);
  const [displayName, setDisplayName] = useState(draft.displayName ?? "");
  const [ageRange, setAgeRange] = useState(draft.ageRange ?? DEFAULT_AGE_RANGE);
  const [ageModalVisible, setAgeModalVisible] = useState(false);
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

  const step = VIBES_ONBOARDING_STEPS[stepIndex];
  const copy = STEP_COPY[step];

  useEffect(() => {
    transition.setValue(0);
    Animated.timing(transition, {
      toValue: 1,
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [stepIndex, transition]);

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
      purpose: purposeIds,
      energy: energyIds,
      displayName,
      ageRange,
      spiritualPath: selectedPractices,
      spiritualPathDetails: practiceDetails,
      aboutMe: buildAboutMe(purposeIds, energyIds),
      otherTags: [
        ...purposeIds,
        ...energyIds,
        ...selectedPractices,
        `age:${ageRange}`,
      ],
      photoUris: photoUri ? [photoUri] : [],
      primaryPhotoUri: photoUri,
    }),
    [
      ageRange,
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
    (step === "profile" && Boolean(displayName.trim())) ||
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
      setShowWelcome(true);
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
      return;
    }

    const userId = session?.user?.id;
    if (skipAccountCreation && !userId) {
      resetDraft();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Tab" as never }],
        }),
      );
      return;
    }

    if (!userId) {
      Alert.alert("Error", "No se pudo completar el onboarding.");
      return;
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
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "No se pudo completar el onboarding.",
      );
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

  const updatePracticeDetail = (practice: string, nextDetail: SpiritualPathDetail) => {
    setPracticeDetails((prev) => ({
      ...prev,
      [practice]: normalizeSpiritualPathDetail(nextDetail),
    }));
  };

  const renderTitle = (targetStep: VibesOnboardingStep) => (
    <>
      <Text
        style={[
          onboardingStyles.title,
          targetStep === "completion" && onboardingStyles.centeredTitle,
        ]}
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
            option={option}
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
              <Text style={onboardingStyles.energyLabel}>{option.label}</Text>
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
        <ProfilePhotoPicker uri={photoUri} onChange={setPhotoUri} />
        <View style={onboardingStyles.fieldGroup}>
          <View style={onboardingStyles.inputRow}>
            <Icon name="person-outline" size={20} color={ONBOARDING_COLORS.mustard} />
            <TextInput
              style={onboardingStyles.input}
              placeholder="Tu nombre"
              placeholderTextColor="rgba(110, 110, 110, 0.55)"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              maxLength={50}
            />
          </View>

          <View style={onboardingStyles.inputRow}>
            <Icon name="calendar-outline" size={20} color={ONBOARDING_COLORS.mustard} />
            <Text style={onboardingStyles.ageValue}>Rango de edad</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setAgeModalVisible(true)}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <Text style={[onboardingStyles.ageValue, { flex: 0, marginLeft: 0 }]}>
                {ageRange}
              </Text>
              <Icon name="chevron-down" size={18} color={ONBOARDING_COLORS.text} />
            </TouchableOpacity>
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
            label={practice}
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
      {showWelcome ? (
        <VibesMinimalOnboarding onContinue={() => setShowWelcome(false)} />
      ) : step === "completion" ? (
        <VibesMinimalOnboarding
          title={copy.title}
          body={copy.subtitle}
          ctaLabel={copy.button}
          onContinue={() => void goNext()}
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
          <ProgressHeader progress={getProgress(stepIndex)} onBack={goBack} />
          <Animated.View style={animatedStyle}>{renderStep()}</Animated.View>
        </OnboardingScreenContainer>
      )}

      <SpiritualPathDetailsModal
        visible={Boolean(activePractice)}
        pathLabel={activePractice}
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
        visible={ageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAgeModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={onboardingStyles.modalOverlay}
          onPress={() => setAgeModalVisible(false)}
        >
          <View style={onboardingStyles.modalCard}>
            {AGE_RANGES.map((range) => (
              <TouchableOpacity
                key={range}
                style={onboardingStyles.modalOption}
                onPress={() => {
                  setAgeRange(range);
                  setAgeModalVisible(false);
                }}
                activeOpacity={0.82}
              >
                <Text style={onboardingStyles.modalOptionText}>{range}</Text>
                {ageRange === range ? (
                  <Icon name="checkmark-circle" size={20} color={ONBOARDING_COLORS.mustard} />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

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
              Nombre de la práctica
            </Text>
            <TextInput
              style={onboardingStyles.customPracticeInput}
              placeholder="Ej. Qi Gong"
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
                  Cancelar
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
                  Agregar
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
