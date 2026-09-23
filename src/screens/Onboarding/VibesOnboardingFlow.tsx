import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  findNodeHandle,
  ScrollView,
  Platform,
  TouchableOpacity,
  View,
  type TextInput as NativeTextInput,
} from "react-native";
import { Text, TextInput } from "../../../components/Typography";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import { CommonActions, useNavigation } from "@react-navigation/native";
import KeyboardSheetModal from "../../../components/KeyboardSheetModal";
import ProfileQuestionsForm from "../../../components/onboarding/ProfileQuestionsForm";
import type { ProfileAnswers } from "../../lib/profileQuestions";
import Icon from "../../../components/Icon";
import SpiritualPathDetailsModal from "../../../components/SpiritualPathDetailsModal";
import OnboardingScreenContainer from "../../../components/onboarding/OnboardingScreenContainer";
import OptionCard from "../../../components/onboarding/OptionCard";
import PrimaryButton from "../../../components/onboarding/PrimaryButton";
import ProfilePhotoPicker from "../../../components/onboarding/ProfilePhotoPicker";
import EmailVerificationCard from "../../../components/EmailVerificationCard";
import ProgressHeader from "../../../components/onboarding/ProgressHeader";
import SelectablePill from "../../../components/onboarding/SelectablePill";
import { useAuthSession } from "../../auth/auth.queries";
import type { SpiritualPathDetails } from "../../lib/spiritualPaths";
import {
  calculateAge,
  formatBirthDate,
  parseBirthDate,
} from "../../lib/birthDate";
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
  PRACTICE_OPTIONS,
  PURPOSE_OPTIONS,
  VIBES_ONBOARDING_STEPS,
  type VibesOnboardingStep,
} from "./vibesOnboardingContent";
import { ONBOARDING_COLORS, onboardingStyles } from "./vibesOnboardingStyles";
import VibesMinimalOnboarding from "./VibesMinimalOnboarding";
import { useI18n } from "../../i18n";

const ANIMATION_DURATION = 240;
const MIN_AGE = 18;
const MAX_AGE = 99;

const getUniqueLocationParts = (...parts: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .filter((part) => {
      const key = part.toLocaleLowerCase("es-AR");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const getProgress = (stepIndex: number) =>
  (stepIndex + 1) / VIBES_ONBOARDING_STEPS.length;

const getSelectedLabels = (
  selectedIds: string[],
  options: { id: string; label: string }[]
) =>
  options
    .filter((option) => selectedIds.includes(option.id))
    .map((option) => option.label);

const VibesOnboardingFlow = () => {
  const navigation = useNavigation();
  const { locale, t } = useI18n();
  const { data: session } = useAuthSession();
  const { draft, updateDraft, resetDraft } = useOnboardingDraft();
  const completeMutation = useCompleteOnboardingMutation();
  const transition = useRef(new Animated.Value(1)).current;
  const onboardingScrollRef = useRef<ScrollView | null>(null);
  const displayNameInputRef = useRef<NativeTextInput | null>(null);
  const descriptionInputRef = useRef<NativeTextInput | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [purposeIds, setPurposeIds] = useState<string[]>(
    draft.purposeIds ?? []
  );
  const [answers, setAnswers] = useState<ProfileAnswers>(
    draft.profileAnswers ?? {}
  );
  const [displayName, setDisplayName] = useState(draft.displayName ?? "");
  const [briefDescription, setBriefDescription] = useState(
    draft.briefDescription ?? ""
  );
  const [birthDate, setBirthDate] = useState<Date | null>(() =>
    parseBirthDate(draft.birthDate)
  );
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [photoUris, setPhotoUris] = useState<string[]>(() =>
    Array.from(
      new Set(
        [draft.primaryPhotoUri, ...(draft.photoUris ?? [])].filter(
          (uri): uri is string => Boolean(uri)
        )
      )
    ).slice(0, 6)
  );
  const [city, setCity] = useState(draft.city ?? "");
  const [country, setCountry] = useState(draft.country ?? "");
  const [locationLabel, setLocationLabel] = useState(
    draft.locationLabel ?? ""
  );
  const [latitude, setLatitude] = useState<number | undefined>(draft.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(
    draft.longitude
  );
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedPractices, setSelectedPractices] = useState<string[]>(
    draft.spiritualPath ?? []
  );
  const [practiceDetails, setPracticeDetails] = useState<SpiritualPathDetails>(
    normalizeSpiritualPathDetails(draft.spiritualPathDetails)
  );
  const [activePractice, setActivePractice] = useState<string | null>(null);
  const [customPracticeModalVisible, setCustomPracticeModalVisible] =
    useState(false);
  const [customPracticeName, setCustomPracticeName] = useState("");

  const age = birthDate ? String(calculateAge(birthDate)) : "";
  const hasAgeAssuranceBirthDate = Boolean(parseBirthDate(draft.birthDate));
  const birthDateLimits = useMemo(() => {
    const today = new Date();
    const maximumDate = new Date(
      today.getFullYear() - MIN_AGE,
      today.getMonth(),
      today.getDate()
    );
    const minimumDate = new Date(
      today.getFullYear() - MAX_AGE - 1,
      today.getMonth(),
      today.getDate() + 1
    );
    return { minimumDate, maximumDate };
  }, []);

  const step = VIBES_ONBOARDING_STEPS[stepIndex];
  const copy = {
    title: t(`vibesOnboarding.${step}.title`),
    subtitle: t(`vibesOnboarding.${step}.subtitle`),
    button: t(`vibesOnboarding.${step}.button`),
  };
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
      purposeIds,
      profileAnswers: answers,
      displayName,
      briefDescription,
      age,
      ageRange: age,
      birthDate: birthDate ? formatBirthDate(birthDate) : "",
      spiritualPath: selectedPractices,
      spiritualPathDetails: practiceDetails,
      aboutMe: briefDescription.trim(),
      city: city.trim(),
      country: country.trim(),
      locationLabel:
        locationLabel.trim() ||
        getUniqueLocationParts(city.trim(), country.trim()).join(", "),
      latitude,
      longitude,
      purpose: getSelectedLabels(purposeIds, PURPOSE_OPTIONS),
      energy: [],
      energyIds: [],
      otherTags: [
        ...getSelectedLabels(purposeIds, PURPOSE_OPTIONS),
        ...selectedPractices,
        age ? `age:${age}` : "",
      ].filter(Boolean),
      photoUris,
      primaryPhotoUri: photoUris[0] ?? "",
    }),
    [
      age,
      birthDate,
      briefDescription,
      city,
      country,
      displayName,
      draft,
      answers,
      latitude,
      locationLabel,
      longitude,
      photoUris,
      practiceDetails,
      purposeIds,
      selectedPractices,
    ]
  );

  const canContinue =
    (step === "purpose" && purposeIds.length > 0) ||
    (step === "profile" &&
      Boolean(displayName.trim()) &&
      Boolean(birthDate) &&
      Number(age) >= MIN_AGE &&
      Number(age) <= MAX_AGE) ||
    (step === "location" && Boolean(city.trim() || country.trim())) ||
    step === "practices" ||
    ["identity", "interests", "plans", "completion"].includes(step);

  const practiceOptions = useMemo(() => {
    const baseOptions = PRACTICE_OPTIONS.filter(
      (practice) => practice !== "Otras"
    );
    const customOptions = selectedPractices.filter(
      (practice) => !PRACTICE_OPTIONS.includes(practice as never)
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

  const handleBirthDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setShowBirthDatePicker(false);
    if (date) setBirthDate(date);
  };

  const goNext = async () => {
    updateDraft(currentDraft);

    if (step !== "completion") {
      setStepIndex((prev) =>
        Math.min(VIBES_ONBOARDING_STEPS.length - 1, prev + 1)
      );
      return true;
    }

    const userId = session?.user?.id;
    if (!userId) {
      Alert.alert(
        t("vibesOnboarding.missingSessionTitle"),
        t("vibesOnboarding.missingSessionMessage")
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
        })
      );
      return true;
    } catch (error) {
      Alert.alert(
        t("common.error"),
        error instanceof Error ? error.message : t("onboarding.onboardingError")
      );
      return false;
    }
  };

  const togglePurpose = (id: string) => {
    setPurposeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
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
      return [...prev, practice];
    });
  };

  const addCustomPractice = () => {
    const nextPractice = customPracticeName.trim();
    if (!nextPractice) return;

    setSelectedPractices((prev) =>
      prev.includes(nextPractice) ? prev : [...prev, nextPractice]
    );
    setCustomPracticeModalVisible(false);
    setCustomPracticeName("");
  };

  const handlePhotoChange = (nextUris: string[]) => {
    const photos = Array.from(new Set(nextUris)).slice(0, 6);
    setPhotoUris(photos);
    updateDraft({ primaryPhotoUri: photos[0] ?? "", photoUris: photos });
  };

  const scrollInputIntoView = (input: NativeTextInput | null) => {
    if (Platform.OS !== "ios" || !input) return;
    const node = findNodeHandle(input);
    const scrollResponder = onboardingScrollRef.current?.getScrollResponder?.();
    if (!node || !scrollResponder) return;

    setTimeout(() => {
      scrollResponder.scrollResponderScrollNativeHandleToKeyboard(
        node,
        130,
        true
      );
    }, 80);
  };

  const requestLocation = async () => {
    if (locationLoading) return;
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("onboarding.locationPermissionDeniedTitle"),
          t("onboarding.locationPermissionDeniedMessage")
        );
        return;
      }

      const current = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });

      const nextCity =
        address?.city ?? address?.subregion ?? address?.region ?? "";
      const nextCountry = address?.country ?? "";
      const nextLocationLabel = getUniqueLocationParts(
        nextCity,
        nextCountry
      ).join(", ");

      setCity(nextCity);
      setCountry(nextCountry);
      setLocationLabel(nextLocationLabel);
      setLatitude(current.coords.latitude);
      setLongitude(current.coords.longitude);
      updateDraft({
        city: nextCity,
        country: nextCountry,
        locationLabel: nextLocationLabel,
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
    } catch (_error) {
      Alert.alert(t("common.error"), t("onboarding.locationError"));
    } finally {
      setLocationLoading(false);
    }
  };

  const updatePracticeDetail = (
    practice: string,
    nextDetail: SpiritualPathDetail
  ) => {
    setPracticeDetails((prev) => ({
      ...prev,
      [practice]: normalizeSpiritualPathDetail(nextDetail),
    }));
  };

  const getPracticeLabel = (practice: string) => {
    const key = `vibesOnboarding.practicesOptions.${practice}`;
    const translated = t(key);
    return translated === key ? practice : translated;
  };

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

  const renderProfile = () => (
    <>
      {renderTitle("profile")}
      <View style={onboardingStyles.profileWrap}>
        <ProfilePhotoPicker uris={photoUris} onChange={handlePhotoChange} />
        <View style={onboardingStyles.fieldGroup}>
          <View style={onboardingStyles.emailVerificationSection}>
            <Text style={onboardingStyles.emailVerificationLabel}>
              {t("common.email")}
            </Text>
            <Text style={onboardingStyles.emailVerificationAddress}>
              {session?.user?.email}
            </Text>
            <EmailVerificationCard userId={session?.user?.id} />
          </View>
          <View style={onboardingStyles.inputRow}>
            <Icon
              name="person-outline"
              size={20}
              color={ONBOARDING_COLORS.mustard}
            />
            <TextInput
              ref={displayNameInputRef}
              style={onboardingStyles.input}
              placeholder={t("vibesOnboarding.profile.namePlaceholder")}
              placeholderTextColor="rgba(110, 110, 110, 0.55)"
              value={displayName}
              onChangeText={setDisplayName}
              onFocus={() => scrollInputIntoView(displayNameInputRef.current)}
              autoCapitalize="words"
              maxLength={50}
            />
          </View>

          <View
            style={[onboardingStyles.inputRow, onboardingStyles.textAreaRow]}
          >
            <Icon
              name="document-text-outline"
              size={20}
              color={ONBOARDING_COLORS.mustard}
            />
            <TextInput
              ref={descriptionInputRef}
              style={[onboardingStyles.input, onboardingStyles.textAreaInput]}
              placeholder={t("vibesOnboarding.profile.descriptionPlaceholder")}
              placeholderTextColor="rgba(110, 110, 110, 0.55)"
              value={briefDescription}
              onChangeText={setBriefDescription}
              onFocus={() => scrollInputIntoView(descriptionInputRef.current)}
              multiline
              maxLength={160}
              textAlignVertical="top"
            />
          </View>

          {!hasAgeAssuranceBirthDate ? (
            <>
              <TouchableOpacity
                style={onboardingStyles.inputRow}
                activeOpacity={0.7}
                onPress={() => setShowBirthDatePicker(true)}
              >
                <Icon
                  name="calendar-outline"
                  size={20}
                  color={ONBOARDING_COLORS.mustard}
                />
                <Text
                  style={[
                    onboardingStyles.ageValue,
                    !birthDate && { color: "rgba(110, 110, 110, 0.55)" },
                  ]}
                >
                  {birthDate
                    ? birthDate.toLocaleDateString(
                        locale === "en" ? "en-US" : "es-AR"
                      )
                    : t("vibesOnboarding.profile.birthDatePlaceholder")}
                </Text>
                {age ? (
                  <Text
                    style={[
                      onboardingStyles.ageValue,
                      { flex: 0, marginLeft: 8 },
                    ]}
                  >
                    {age} {t("vibesOnboarding.profile.years")}
                  </Text>
                ) : null}
              </TouchableOpacity>
              {showBirthDatePicker ? (
                <DateTimePicker
                  value={birthDate ?? birthDateLimits.maximumDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  minimumDate={birthDateLimits.minimumDate}
                  maximumDate={birthDateLimits.maximumDate}
                  onChange={handleBirthDateChange}
                />
              ) : null}
            </>
          ) : null}
        </View>
      </View>
    </>
  );

  const renderLocation = () => (
    <>
      {renderTitle("location")}
      <View style={onboardingStyles.locationWrap}>
        <View style={onboardingStyles.fieldGroup}>
          <View style={onboardingStyles.inputRow}>
            <Icon
              name="business-outline"
              size={20}
              color={ONBOARDING_COLORS.mustard}
            />
            <TextInput
              style={onboardingStyles.input}
              placeholder={t("onboarding.cityPlaceholder")}
              placeholderTextColor="rgba(110, 110, 110, 0.55)"
              value={city}
              onChangeText={(value) => {
                setCity(value);
                setLocationLabel("");
              }}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>
          <View style={onboardingStyles.inputRow}>
            <Icon
              name="earth-outline"
              size={20}
              color={ONBOARDING_COLORS.mustard}
            />
            <TextInput
              style={onboardingStyles.input}
              placeholder={t("onboarding.countryPlaceholder")}
              placeholderTextColor="rgba(110, 110, 110, 0.55)"
              value={country}
              onChangeText={(value) => {
                setCountry(value);
                setLocationLabel("");
              }}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={() => {
                if (city.trim() || country.trim()) void goNext();
              }}
            />
          </View>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.84}
          disabled={locationLoading}
          onPress={() => void requestLocation()}
          style={onboardingStyles.locationButton}
        >
          <Icon
            name="location"
            size={18}
            color={ONBOARDING_COLORS.blue}
          />
          <Text style={onboardingStyles.locationButtonText}>
            {locationLoading
              ? t("onboarding.gettingLocation")
              : t("onboarding.useMyLocation")}
          </Text>
        </TouchableOpacity>
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
      {selectedPractices.map((practice) => (
        <TouchableOpacity
          key={practice}
          accessibilityRole="button"
          activeOpacity={0.8}
          onPress={() => setActivePractice(practice)}
          style={onboardingStyles.practiceDetailsButton}
        >
          <Icon name="create-outline" size={20} color={ONBOARDING_COLORS.text} />
          <Text style={onboardingStyles.practiceDetailsButtonText}>
            {locale === "en" ? "Add details" : "Agregar detalles"} · {getPracticeLabel(practice)}
          </Text>
        </TouchableOpacity>
      ))}
    </>
  );

  const renderStep = () => {
    if (step === "purpose") return renderPurpose();
    const questionGroup = ["identity", "interests", "plans"].indexOf(step);
    if (questionGroup >= 0)
      return (
        <ProfileQuestionsForm
          group={questionGroup}
          value={answers}
          onChange={setAnswers}
        />
      );
    if (step === "profile") return renderProfile();
    if (step === "location") return renderLocation();
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
          title={
            locale === "en"
              ? "Start your journey through Vibes"
              : "Comenzá el viaje por Vibes"
          }
          body=""
          ctaLabel={copy.button}
          onContinue={goNext}
        />
      ) : (
        <OnboardingScreenContainer
          scrollViewRef={onboardingScrollRef}
          footer={
            <>
              <PrimaryButton
                label={
                  ["identity", "interests", "plans"].includes(step)
                    ? "Siguiente"
                    : copy.button
                }
                onPress={() => void goNext()}
                disabled={!canContinue}
                loading={completeMutation.isPending}
              />
              {["identity", "interests", "plans"].includes(step) ? (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <TouchableOpacity
                    onPress={() => void goNext()}
                    accessibilityRole="button"
                    style={{ padding: 12, minHeight: 48, justifyContent: "center" }}
                  >
                    <Text>{locale === "en" ? "Skip" : "Omitir"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      updateDraft(currentDraft);
                      setStepIndex(
                        VIBES_ONBOARDING_STEPS.indexOf("completion")
                      );
                    }}
                    accessibilityRole="button"
                    style={{ padding: 12, minHeight: 48, justifyContent: "center" }}
                  >
                    <Text>{locale === "en" ? "Complete later" : "Completar después"}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
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
        pathLabel={
          activePractice ? getPracticeLabel(activePractice) : activePractice
        }
        detail={activePracticeDetail}
        onClose={() => setActivePractice(null)}
        onChange={(next) => {
          if (activePractice) updatePracticeDetail(activePractice, next);
        }}
        onRemove={() => {
          if (!activePractice) return;
          setSelectedPractices((prev) =>
            prev.filter((item) => item !== activePractice)
          );
          setPracticeDetails((prev) => {
            const next = { ...prev };
            delete next[activePractice];
            return next;
          });
          setActivePractice(null);
        }}
      />

      <KeyboardSheetModal
        visible={customPracticeModalVisible}
        onClose={() => setCustomPracticeModalVisible(false)}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
        >
          <View style={onboardingStyles.customPracticeCard}>
            <Text style={onboardingStyles.customPracticeTitle}>
              {t("vibesOnboarding.practices.customPracticeTitle")}
            </Text>
            <TextInput
              style={onboardingStyles.customPracticeInput}
              placeholder={t(
                "vibesOnboarding.practices.customPracticePlaceholder"
              )}
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
          </View>
        </ScrollView>
      </KeyboardSheetModal>
    </>
  );
};

export default VibesOnboardingFlow;
