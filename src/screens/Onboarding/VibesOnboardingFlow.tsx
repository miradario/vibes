import { defaultCommunities } from "../../lib/communities";
import MeetPeopleChoice from "../../../components/MeetPeopleChoice";
import VibesWordmark from "../../../components/VibesWordmark";
import { useQuery } from "@tanstack/react-query";
import { useUserPreferencesQuery } from "../../queries/userPreferences.queries";
import { buildResumeOnboardingDraft, getCompletedResumeSteps } from "../../lib/resumeOnboarding";
import { readProfileAnswers } from "../../lib/profileQuestions";
import ScreenContainer from "../../../components/ScreenContainer";
import OnboardingPlayfulShapes from "../../../components/OnboardingPlayfulShapes";
import OnboardingGlobe from "../../../components/OnboardingGlobe";
import ProfileReadyIllustration from "../../../components/ProfileReadyIllustration";
import Svg, { Path } from "react-native-svg";
import PlayfulVibesLogo from "../../../components/PlayfulVibesLogo";
import { hasOnboardingBasics, onboardingFullName, splitOnboardingName } from "../../lib/onboardingBasics";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { revealFocusedInput as revealInputInViewport } from "../../lib/revealFocusedInput";
import {
  Alert,
  Animated,
  Easing,
  Keyboard,
  ScrollView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  type TextInput as NativeTextInput,
} from "react-native";
import { Text, TextInput } from "../../../components/Typography";
import BirthDateWheel from "../../../components/BirthDateWheel";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";
import AnimatedSheetModal from "../../../components/AnimatedSheetModal";
import KeyboardSheetModal from "../../../components/KeyboardSheetModal";
import ProfileQuestionsForm from "../../../components/onboarding/ProfileQuestionsForm";
import { QUESTION_GROUPS, type ProfileAnswers } from "../../lib/profileQuestions";
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
  togglePurposeSelection,
  VIBES_ONBOARDING_STEPS,
  type VibesOnboardingStep,
} from "./vibesOnboardingContent";
import { ONBOARDING_COLORS, onboardingStyles } from "./vibesOnboardingStyles";
import { ensureAccountCreatedTracked, signupErrorCode, trackSignupEvent } from "../../lib/signupEvents";
import { useSignupBackgroundTracking } from "../../lib/useSignupBackgroundTracking";
import { useI18n } from "../../i18n";
import VibesLoader from "../../../components/VibesLoader";
import { useProfileQuery } from "../../queries/profile.queries";
import { vibesTheme } from "../../theme/vibesTheme";

const ANIMATION_DURATION = 240;
const MIN_AGE = 18;
const MAX_AGE = 99;
const COMPLETION_MIN_LOADING_MS = 400;

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

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

const getSelectedLabels = (
  selectedIds: string[],
  options: { id: string; label: string }[]
) =>
  options
    .filter((option) => selectedIds.includes(option.id))
    .map((option) => option.label);

const VibesOnboardingContent = ({ skipContinueChoice = false }: { skipContinueChoice?: boolean }) => {
  const navigation = useNavigation();
  const { locale, t } = useI18n();
  const { data: session } = useAuthSession();
  const { draft, updateDraft, resetDraft } = useOnboardingDraft();
  const savedProfile = useProfileQuery(session?.user?.id);
  const [hadBirthDateOnEntry] = useState(() => Boolean(parseBirthDate(draft.birthDate)));
  const completeMutation = useCompleteOnboardingMutation();
  const transition = useRef(new Animated.Value(1)).current;
  const onboardingScrollRef = useRef<ScrollView | null>(null);
  const onboardingScrollY = useRef(0);
  const displayNameInputRef = useRef<NativeTextInput | null>(null);
  const lastNameInputRef = useRef<NativeTextInput | null>(null);
  const descriptionInputRef = useRef<NativeTextInput | null>(null);
  const cityInputRef = useRef<NativeTextInput | null>(null);
  const neighborhoodInputRef = useRef<NativeTextInput | null>(null);
  const countryInputRef = useRef<NativeTextInput | null>(null);
  const focusedProfileInput = useRef<NativeTextInput | null>(null);
  const completionStartedRef = useRef(false);
  const [completedEntrySteps] = useState(() => getCompletedResumeSteps(draft));
  const availableStepIndices = VIBES_ONBOARDING_STEPS.map((_, index) => index).filter(index => {
    const candidate = VIBES_ONBOARDING_STEPS[index];
    return !completedEntrySteps.some(completed => completed === candidate) && !(skipContinueChoice && candidate === "continueChoice");
  });
  const [stepIndex, setStepIndex] = useState(() => availableStepIndices[0]);
  const [meetPeopleEnabled, setMeetPeopleEnabled] = useState(draft.meetPeopleEnabled !== false);
  const [purposeIds, setPurposeIds] = useState<string[]>(
    draft.purposeIds ?? []
  );
  const [answers, setAnswers] = useState<ProfileAnswers>(
    draft.profileAnswers ?? {}
  );
  const [firstName, setFirstName] = useState(draft.firstName ?? splitOnboardingName(draft.displayName).firstName);
  const [lastName, setLastName] = useState(draft.lastName ?? splitOnboardingName(draft.displayName).lastName);
  const displayName = onboardingFullName(firstName, lastName);
  const [briefDescription, setBriefDescription] = useState(
    draft.briefDescription ?? ""
  );
  const [birthDate, setBirthDate] = useState<Date | null>(() =>
    parseBirthDate(draft.birthDate)
  );
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [pendingBirthDate, setPendingBirthDate] = useState<Date | null>(null);
  const [photoUris, setPhotoUris] = useState<string[]>(() =>
    Array.from(
      new Set(
        [draft.primaryPhotoUri, ...(draft.photoUris ?? [])].filter(
          (uri): uri is string => Boolean(uri)
        )
      )
    ).slice(0, 6)
  );
  const [photoOriginalUris, setPhotoOriginalUris] = useState<Record<string, string>>(draft.photoOriginalUris ?? {});
  const [city, setCity] = useState(draft.city ?? "");
  const [neighborhood, setNeighborhood] = useState(draft.neighborhood ?? "");
  const [country, setCountry] = useState(draft.country ?? "");
  const [locationLabel, setLocationLabel] = useState(
    draft.locationLabel ?? ""
  );
  const [latitude, setLatitude] = useState<number | undefined>(draft.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(
    draft.longitude
  );
  const [locationLoading, setLocationLoading] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<Array<{
    city: string; country: string; latitude: number; longitude: number;
  }>>([]);
  const locationSearchVersion = useRef(0);
  const searchCity = async () => {
    if (!city.trim() || locationLoading) return;
    const version = ++locationSearchVersion.current;
    setLocationLoading(true);
    setCitySuggestions([]);
    try {
      if (Platform.OS === "android") {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Ubicación", "Para buscar ciudades, habilitá el permiso de ubicación. También podés escribir ciudad y país.");
          return;
        }
      }
      const results = await Location.geocodeAsync([city.trim(), country.trim()].filter(Boolean).join(", "));
      const suggestions = await Promise.all(results.slice(0, 5).map(async (point) => {
        const [address] = await Location.reverseGeocodeAsync(point);
        return {
          city: address?.city || address?.subregion || address?.region || city.trim(),
          country: address?.country || country.trim(),
          latitude: point.latitude, longitude: point.longitude,
        };
      }));
      if (version !== locationSearchVersion.current) return;
      setCitySuggestions(suggestions);
      if (!suggestions.length) Alert.alert("Sin resultados", "Probá con el nombre completo de la ciudad y el país.");
    } catch {
      if (version === locationSearchVersion.current) Alert.alert("No se pudo buscar", "Intentá de nuevo o completá ciudad y país manualmente.");
    } finally {
      setLocationLoading(false);
    }
  };
  const [selectedPractices, setSelectedPractices] = useState<string[]>(
    defaultCommunities(draft)
  );
  const [practiceDetails, setPracticeDetails] = useState<SpiritualPathDetails>(
    normalizeSpiritualPathDetails(draft.spiritualPathDetails)
  );
  const [activePractice, setActivePractice] = useState<string | null>(null);
  const [customPracticeModalVisible, setCustomPracticeModalVisible] =
    useState(false);
  const [customPracticeName, setCustomPracticeName] = useState("");

  const age = birthDate ? String(calculateAge(birthDate)) : "";
  const savedBirthDate = savedProfile.data?.birthDate ?? savedProfile.data?.birth_date;
  const hasAgeAssuranceBirthDate = hadBirthDateOnEntry || Boolean(parseBirthDate(savedBirthDate));
  useEffect(() => {
    const savedDate = parseBirthDate(savedBirthDate);
    if (savedDate) setBirthDate(savedDate);
  }, [savedBirthDate]);
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
  const onboardingStartedAt = useRef(Date.now());
  useEffect(() => {
    trackSignupEvent("onboarding_step_viewed", { step, stepIndex });
  }, [stepIndex]);
  useEffect(() => {
    if (!draft.editingExistingProfile) ensureAccountCreatedTracked(session?.user);
  }, [session?.user?.id]);
  useSignupBackgroundTracking(step, stepIndex, !draft.editingExistingProfile);
  useEffect(() => {
    focusedProfileInput.current = null;
    Keyboard.dismiss();
    onboardingScrollY.current = 0;
    onboardingScrollRef.current?.scrollTo({ y: 0, animated: false });
    transition.setValue(0);
    const animation = Animated.timing(transition, {
      toValue: 1,
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [stepIndex, transition]);

  const animatedStyle = {
    // The questions must stay visible even if the native entrance animation
    // is interrupted while navigating or resuming the app.
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
      meetPeopleEnabled,
      profileAnswers: answers,
      displayName,
      firstName,
      lastName,
      briefDescription,
      age,
      ageRange: age,
      birthDate: birthDate ? formatBirthDate(birthDate) : "",
      spiritualPath: selectedPractices,
      spiritualPathDetails: practiceDetails,
      aboutMe: briefDescription.trim(),
      city: city.trim(),
      neighborhood: neighborhood.trim(),
      country: country.trim(),
      locationLabel:
        locationLabel.trim() ||
        getUniqueLocationParts(city.trim(), country.trim()).join(", "),
      latitude,
      longitude,
      purpose: Array.from(new Set([...(draft.purpose ?? []).filter(label => !PURPOSE_OPTIONS.some(option => option.label === label)), ...getSelectedLabels(purposeIds, PURPOSE_OPTIONS)])),
      energy: [],
      energyIds: [],
      otherTags: Array.from(new Set([
        ...(draft.otherTags ?? []).filter(tag => !PURPOSE_OPTIONS.some(option => option.label === tag) && !(draft.spiritualPath ?? []).includes(tag) && !tag.startsWith("age:")),
        ...getSelectedLabels(purposeIds, PURPOSE_OPTIONS),
        ...selectedPractices,
        age ? `age:${age}` : "",
      ].filter(Boolean))),
      photoUris,
      photoOriginalUris,
      primaryPhotoUri: photoUris[0] ?? "",
    }),
    [
      age,
      birthDate,
      briefDescription,
      city,
      neighborhood,
      country,
      displayName,
      firstName,
      lastName,
      draft,
      answers,
      latitude,
      locationLabel,
      longitude,
      photoUris,
      photoOriginalUris,
      practiceDetails,
      purposeIds,
      meetPeopleEnabled,
      selectedPractices,
    ]
  );

  const canContinue =
    (step === "purpose" && (!meetPeopleEnabled || purposeIds.length > 0)) ||
    (step === "profile" &&
      hasOnboardingBasics(firstName, lastName) &&
      Boolean(birthDate) &&
      Number(age) >= MIN_AGE &&
      Number(age) <= MAX_AGE) ||
    (step === "profileText" && hasOnboardingBasics(firstName, lastName)) ||
    step === "continueChoice" ||
    (step === "location" && Boolean(city.trim() || country.trim())) ||
    step === "practices" ||
    ["identity", "interests", "completion"].includes(step);

  const practiceOptions = PRACTICE_OPTIONS;

  const goBack = () => {
    const previous = availableStepIndices.filter(index => index < stepIndex).pop();
    if (previous === undefined) navigation.goBack();
    else setStepIndex(previous);
  };

  const goNext = async () => {
    if (["profile", "profileText"].includes(step) && !canContinue) return false;
    updateDraft(currentDraft);
    if (step !== "completion") trackSignupEvent("onboarding_step_completed", { step, stepIndex });

    if (step !== "completion") {
      setStepIndex(availableStepIndices.find(index => index > stepIndex) ?? stepIndex);
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

    const navigateHome = () => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Tab" as never }],
        })
      );
    };

    const completion = completeMutation
      .mutateAsync({
        userId,
        draft: currentDraft,
      })
      .then(() => {
        resetDraft();
        trackSignupEvent("onboarding_completed", {
          props: { duration_s: Math.round((Date.now() - onboardingStartedAt.current) / 1000) },
        });
        return true;
      })
      .catch((error) => {
        trackSignupEvent("onboarding_failed", { props: { error_code: signupErrorCode(error) } });
        setStepIndex(VIBES_ONBOARDING_STEPS.indexOf(skipContinueChoice ? "interests" : "continueChoice"));
        Alert.alert(
          t("common.error"),
          error instanceof Error
            ? error.message
            : t("onboarding.onboardingError")
        );
        return false;
      });

    const [shouldNavigate] = await Promise.all([
      completion,
      wait(COMPLETION_MIN_LOADING_MS),
    ]);
    if (shouldNavigate) {
      navigateHome();
      trackSignupEvent("first_home_viewed");
    }
    return shouldNavigate;
  };

  useEffect(() => {
    if (step !== "completion") {
      completionStartedRef.current = false;
      return;
    }
    if (completionStartedRef.current) return;
    completionStartedRef.current = true;
    void goNext();
  }, [step]);

  const togglePurpose = (id: string) => {
    setPurposeIds(previous => togglePurposeSelection(previous, id));
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

  const handlePhotoChange = (nextUris: string[], originals = photoOriginalUris) => {
    const photos = Array.from(new Set(nextUris)).slice(0, 6);
    const nextOriginals = Object.fromEntries(photos.map(uri => [uri, originals[uri] ?? uri]));
    setPhotoUris(photos);
    setPhotoOriginalUris(nextOriginals);
    updateDraft({ primaryPhotoUri: photos[0] ?? "", photoUris: photos, photoOriginalUris: nextOriginals });
  };

  const revealFocusedInput = () => {
    revealInputInViewport(focusedProfileInput.current, onboardingScrollRef.current,
      onboardingScrollY, focusedProfileInput);
  };
  const scrollInputIntoView = (input: NativeTextInput | null) => {
    focusedProfileInput.current = input;
    requestAnimationFrame(revealFocusedInput);
  };
  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", () => requestAnimationFrame(revealFocusedInput));
    return () => shown.remove();
  }, []);

  const requestLocation = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (locationLoading) return;
    // Si el usuario escribe mientras buscamos, no pisamos lo que cargó a mano.
    const version = ++locationSearchVersion.current;
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (silent) return;
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

      if (version !== locationSearchVersion.current) return;

      const nextCity =
        address?.city ?? address?.subregion ?? address?.region ?? "";
      const nextNeighborhood = address?.district?.trim() ?? "";
      const nextCountry = address?.country ?? "";
      const nextLocationLabel = getUniqueLocationParts(
        nextCity,
        nextCountry
      ).join(", ");

      setCity(nextCity);
      setNeighborhood(nextNeighborhood);
      setCountry(nextCountry);
      setLocationLabel(nextLocationLabel);
      setLatitude(current.coords.latitude);
      setLongitude(current.coords.longitude);
      updateDraft({
        city: nextCity,
        neighborhood: nextNeighborhood,
        country: nextCountry,
        locationLabel: nextLocationLabel,
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
    } catch (_error) {
      if (!silent) Alert.alert(t("common.error"), t("onboarding.locationError"));
    } finally {
      setLocationLoading(false);
    }
  };

  // Por defecto usamos la ubicación actual al llegar al paso, si todavía no hay datos.
  // El botón queda para volver a aplicarla a mano. Sin permiso, se completa a mano.
  const autoLocationRequested = useRef(false);
  useEffect(() => {
    if (step !== "location" || autoLocationRequested.current) return;
    autoLocationRequested.current = true;
    if (city.trim() || country.trim()) return;
    void requestLocation({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

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
          ["profile", "profileText"].includes(targetStep) && { fontSize: 28, lineHeight: 34, marginTop: 16 },
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
      <View style={localStyles.purposeHero}>
        <View style={localStyles.introCopy}>
          <View accessible accessibilityRole="header" accessibilityLabel={copy.title} style={localStyles.purposeHeading}>
            <Text style={[localStyles.purposeTitle, {marginBottom:0,flexShrink:1,fontSize:26}]} numberOfLines={1} adjustsFontSizeToFit>{locale.startsWith("en") ? "What brings you to" : "¿Qué te trae a"}</Text>
            <VibesWordmark fontSize={30} style={{ transform: [{ translateY: -4 }] }} />
            <Text style={[localStyles.purposeTitle, {marginBottom:0,fontSize:26}]}>?</Text>
          </View>
          <Text style={localStyles.aboutHint}>{copy.subtitle}</Text>
        </View>
      </View>
      <View style={[onboardingStyles.optionList, localStyles.purposeGrid]}>
        {PURPOSE_OPTIONS.filter(option => meetPeopleEnabled || !["discover", "dating", "all"].includes(option.id)).map((option) => (
          <OptionCard
            tile
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
      <MeetPeopleChoice enabled={meetPeopleEnabled} english={locale === "en"} onChange={enabled => {
        setMeetPeopleEnabled(enabled);
        if (!enabled) setPurposeIds(current => current.filter(id => !["discover", "dating", "all"].includes(id)));
      }} />
    </>
  );

  const renderProfile = () => (
    <>
      <View style={localStyles.photoHero}>
        <View style={localStyles.introCopy}>
          <Text accessibilityRole="header" style={localStyles.photoTitle}>{locale === "en" ? "Show your vibe" : "Mostrá tu vibe"}</Text>
          <Text style={localStyles.aboutHint}>{locale === "en" ? "Add a photo now or later." : "Sumá una foto ahora o más adelante."}</Text>
        </View>
        <View style={localStyles.photoMascot}>
          <PlayfulVibesLogo style={{ width: 60, height: 72 }} />
          <View style={localStyles.photoGreeting}><Text style={localStyles.photoGreetingText}>{locale === "en" ? "Your profile is taking shape!" : "¡Ese perfil toma forma!"}</Text></View>
        </View>
      </View>
      <View style={{ alignItems: "center" }}>
        <ProfilePhotoPicker uris={photoUris} originalUris={photoOriginalUris} onChange={handlePhotoChange} />
        {photoUris.length === 0 ? (
          <View style={localStyles.photoExperienceNotice}>
            <Icon name="information-circle-outline" size={22} color={vibesTheme.colors.accentBlue} />
            <Text accessibilityLiveRegion="polite" style={localStyles.photoExperienceNoticeText}>
              {locale === "en" ? "Improve your experience by adding a photo of yourself." : "Mejorá tu experiencia subiendo una foto de vos."}
            </Text>
          </View>
        ) : null}
        <View style={onboardingStyles.fieldGroup}>
          {!hasAgeAssuranceBirthDate && !savedProfile.isLoading ? (
            <>
            <Text accessibilityRole="header" style={onboardingStyles.birthDateLabel}>
              {t("vibesOnboarding.profile.birthDatePlaceholder")}
            </Text>
            {Platform.OS === "ios" ? (
              <>
                <TouchableOpacity
                  style={onboardingStyles.inputRow}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  onPress={() => { Keyboard.dismiss(); setPendingBirthDate(birthDate ?? birthDateLimits.maximumDate); setShowBirthDatePicker(true); }}
                >
                  <Icon name="calendar-outline" size={20} color={ONBOARDING_COLORS.mustard} />
                  <Text style={[onboardingStyles.ageValue, !birthDate && { color: "rgba(110, 110, 110, 0.55)" }]}>
                    {birthDate
                      ? birthDate.toLocaleDateString(locale === "en" ? "en-US" : "es-AR")
                      : t("vibesOnboarding.profile.birthDatePlaceholder")}
                  </Text>
                  {age ? (
                    <Text style={[onboardingStyles.ageValue, { flex: 0, marginLeft: 8 }]}>
                      {age} {t("vibesOnboarding.profile.years")}
                    </Text>
                  ) : null}
                </TouchableOpacity>

              </>
            ) : (
              <BirthDateWheel value={birthDate} onChange={setBirthDate}
                minimumDate={birthDateLimits.minimumDate} maximumDate={birthDateLimits.maximumDate} locale={locale} />
            )}
            </>
          ) : null}
        </View>
      </View>
    </>
  );

  const renderProfileText = () => {
    const english = locale === "en";
    return (
      <>
        <View style={localStyles.introHero}>
          <View style={localStyles.introCopy}>
            <View pointerEvents="none" accessible={false} style={localStyles.introConfetti}>
              <Svg width="36" height="30" viewBox="0 0 48 40">
                <Path d="M9 28 Q18 29 25 37 Q11 36 4 30 Q1 24 9 28 Z" fill={vibesTheme.colors.accentMustard} />
                <Path d="M29 5 Q36 7 42 28 Q34 27 27 13 Q24 5 29 5 Z" fill={vibesTheme.colors.accentCoral} />
              </Svg>
            </View>
            <View accessibilityRole="header" accessible accessibilityLabel={english ? "Let’s start with you" : "Empecemos por vos"}>
              <Text style={localStyles.introTitle} numberOfLines={1} adjustsFontSizeToFit>
                {english ? "Let’s start" : "Empecemos"}
              </Text>
              <Text style={localStyles.introTitle} numberOfLines={1} adjustsFontSizeToFit>
                {english ? "with you" : "por vos"}
              </Text>
            </View>
            <Text style={localStyles.introSubtitle}>{english ? "What’s your name?" : "¿Cómo te llamás?"}</Text>
          </View>
          <View style={localStyles.introMascot}>
            <PlayfulVibesLogo style={localStyles.introLogo} />
            <View style={localStyles.greetingBubble}>
              <Text style={localStyles.greetingText} numberOfLines={2}>
                {firstName.trim() ? (english ? `Hi, ${firstName.trim()}!` : `¡Hola, ${firstName.trim()}!`) : (english ? "Hi there!" : "¡Hola!")}
              </Text>
            </View>
          </View>
        </View>
        <View style={localStyles.introFields}>
          <View style={localStyles.introField}>
            <Text style={localStyles.introLabel}>{english ? "First name" : "Nombre"}</Text>
            <TextInput
              ref={displayNameInputRef} style={localStyles.introInput}
              accessibilityLabel={english ? "First name" : "Nombre"}
              placeholder={t("vibesOnboarding.profile.namePlaceholder")}
              placeholderTextColor={vibesTheme.colors.secondaryText}
              value={firstName} onChangeText={setFirstName}
              onFocus={() => scrollInputIntoView(displayNameInputRef.current)}
              onBlur={() => { if (focusedProfileInput.current === displayNameInputRef.current) focusedProfileInput.current = null; }}
              autoCorrect={false} autoComplete="given-name" autoCapitalize="words" maxLength={50}
              returnKeyType="next" onSubmitEditing={() => lastNameInputRef.current?.focus()}
            />
          </View>
          <View style={localStyles.introField}>
            <Text style={localStyles.introLabel}>{english ? "Last name" : "Apellido"} <Text style={localStyles.optionalLabel}>{english ? "Optional" : "Opcional"}</Text></Text>
            <TextInput
              ref={lastNameInputRef} style={localStyles.introInput}
              accessibilityLabel={english ? "Last name, optional" : "Apellido, opcional"}
              placeholder={t("vibesOnboarding.profile.lastNamePlaceholder")}
              placeholderTextColor={vibesTheme.colors.secondaryText}
              value={lastName} onChangeText={setLastName}
              onFocus={() => scrollInputIntoView(lastNameInputRef.current)}
              onBlur={() => { if (focusedProfileInput.current === lastNameInputRef.current) focusedProfileInput.current = null; }}
              autoCorrect={false} autoComplete="family-name" autoCapitalize="words" maxLength={50}
              returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()}
            />
          </View>
          <View style={localStyles.introField}>
            <Text style={localStyles.introLabel}>{english ? "Gender" : "Género"} <Text style={localStyles.optionalLabel}>{english ? "Optional" : "Opcional"}</Text></Text>
            <View style={localStyles.ideaChips}>
              {QUESTION_GROUPS[0].fields.find(field => field.key === "gender")?.options?.map(option => (
                <SelectablePill key={option} label={english ? ({ Hombre: "Man", Mujer: "Woman", Otro: "Other" }[option] ?? option) : option}
                  selected={answers.gender === option}
                  onPress={() => {
                    Keyboard.dismiss();
                    setAnswers(previous => ({ ...previous, gender: previous.gender === option ? "" : option }));
                  }} />
              ))}
            </View>
          </View>
          {renderCommunities()}
        </View>
      </>
    );
  };

  const renderLocation = () => (
    <>
      <View style={localStyles.purposeHero}>
        <View style={localStyles.introCopy}>
          <Text accessibilityRole="header" style={localStyles.purposeTitle}>{copy.title}</Text>
          <Text style={localStyles.aboutHint}>{copy.subtitle}</Text>
        </View>
        <OnboardingGlobe style={{ width: 66, height: 72 }} />
      </View>
      <View style={onboardingStyles.locationWrap}>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.84}
          disabled={locationLoading}
          onPress={() => void requestLocation()}
          style={[
            onboardingStyles.locationButton,
            locationLoading && onboardingStyles.locationButtonDisabled,
          ]}
        >
          <Icon
            name="location"
            size={18}
            color={ONBOARDING_COLORS.text}
          />
          <Text style={onboardingStyles.locationButtonText}>
            {locationLoading
              ? t("onboarding.gettingLocation")
              : t("onboarding.useMyLocation")}
          </Text>
        </TouchableOpacity>
        <View style={onboardingStyles.fieldGroup}>
          <View style={onboardingStyles.inputRow}>
            <Icon
              name="earth-outline"
              size={20}
              color={ONBOARDING_COLORS.mustard}
            />
            <TextInput
              ref={countryInputRef}
              style={[onboardingStyles.input, localStyles.locationInput]}
              placeholder={t("onboarding.countryPlaceholder")}
              placeholderTextColor="rgba(110, 110, 110, 0.55)"
              value={country}
              onChangeText={(value) => {
                setCountry(value);
                setLocationLabel("");
                setLatitude(undefined);
                setLongitude(undefined);
                setCitySuggestions([]);
                locationSearchVersion.current += 1;
              }}
              autoCapitalize="words"
              onFocus={() => scrollInputIntoView(countryInputRef.current)}
              returnKeyType="next"
              onSubmitEditing={() => cityInputRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>
          <View style={onboardingStyles.inputRow}>
            <Icon
              name="business-outline"
              size={20}
              color={ONBOARDING_COLORS.mustard}
            />
            <TextInput
              ref={cityInputRef}
              style={[onboardingStyles.input, localStyles.locationInput]}
              placeholder={t("onboarding.cityPlaceholder")}
              placeholderTextColor="rgba(110, 110, 110, 0.55)"
              value={city}
              onChangeText={(value) => {
                setCity(value);
                setLocationLabel("");
                setLatitude(undefined);
                setLongitude(undefined);
                setCitySuggestions([]);
                locationSearchVersion.current += 1;
              }}
              autoCapitalize="words"
              returnKeyType="next"
              onFocus={() => scrollInputIntoView(cityInputRef.current)}
              onSubmitEditing={() => neighborhoodInputRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>
          <View style={onboardingStyles.inputRow}>
            <Icon name="location-outline" size={20} color={ONBOARDING_COLORS.mustard} />
            <TextInput
              ref={neighborhoodInputRef}
              style={[onboardingStyles.input, localStyles.locationInput]}
              placeholder={locale === "en" ? "Neighborhood (optional)" : "Barrio (opcional)"}
              accessibilityLabel={locale === "en" ? "Neighborhood (optional)" : "Barrio (opcional)"}
              placeholderTextColor="rgba(110, 110, 110, 0.55)"
              value={neighborhood}
              onChangeText={setNeighborhood}
              maxLength={100}
              autoCapitalize="words"
              returnKeyType="done"
              onFocus={() => scrollInputIntoView(neighborhoodInputRef.current)}
              onSubmitEditing={() => {
                if (city.trim() || country.trim()) void goNext();
              }}
            />
          </View>
        </View>
        {citySuggestions.map((suggestion, index) => (
          <TouchableOpacity key={`${suggestion.latitude}-${suggestion.longitude}-${index}`}
            accessibilityRole="button" style={onboardingStyles.inputRow}
            onPress={() => {
              setCity(suggestion.city); setCountry(suggestion.country);
              setLocationLabel(`${suggestion.city}, ${suggestion.country}`);
              setLatitude(suggestion.latitude); setLongitude(suggestion.longitude);
              setCitySuggestions([]);
            }}>
            <Icon name="location-outline" size={20} color={ONBOARDING_COLORS.mustard} />
            <Text style={onboardingStyles.input}>{suggestion.city}, {suggestion.country}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  const renderCommunities = () => (
    <>
      <View style={[localStyles.purposeHero, { marginTop: 0 }]}>
        <View style={localStyles.introCopy}>
          <Text accessibilityRole="header" style={[localStyles.purposeTitle, { fontSize: 22, lineHeight: 28, marginBottom: 4 }]}>{t("vibesOnboarding.practices.title")}</Text>
          <Text style={localStyles.aboutHint}>{t("vibesOnboarding.practices.subtitle")}</Text>
        </View>
        <OnboardingPlayfulShapes kind="practices" style={{ width: 44, height: 48 }} />
      </View>
      <View style={[onboardingStyles.pillGrid, { marginTop: 6, gap: 8 }]}>
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
      {selectedPractices.length ? <Text style={localStyles.experienceHint}>{locale.startsWith("en") ? "Tell us more about your communities" : "Contanos más de tus comunidades"}</Text> : null}
      {selectedPractices.map((practice) => {
        const hasDetails = Object.values(practiceDetails[practice] ?? {}).some(value => Boolean(value?.trim()));
        return (
          <TouchableOpacity
            key={practice}
            accessibilityRole="button"
            accessibilityLabel={`${getPracticeLabel(practice)}. ${locale.startsWith("en") ? (hasDetails ? "Has details. Edit" : "No details. Add") : (hasDetails ? "Con detalles. Editar" : "Sin detalles. Agregar")}`}
            activeOpacity={0.8}
            onPress={() => setActivePractice(practice)}
            style={[onboardingStyles.practiceDetailsButton, hasDetails && localStyles.practiceWithDetails]}
          >
            <View style={[localStyles.practiceDot, hasDetails && {backgroundColor:vibesTheme.colors.accentBlue}]} />
            <Text style={onboardingStyles.practiceDetailsButtonText}>{getPracticeLabel(practice)}</Text>
            <Icon name={hasDetails ? "checkmark-circle" : "add"} size={24}
              color={hasDetails ? vibesTheme.colors.accentBlue : vibesTheme.colors.accentMustard} />
          </TouchableOpacity>
        );
      })}
    </>
  );

  const renderPractices = () => {
    const english = locale === "en";
    const ideas = english ? ["I’m excited about…", "My ideal plan…", "I could talk for hours about…"]
      : ["Me entusiasma…", "Mi plan ideal…", "Podría hablar horas de…"];
    return (
      <>
          <View style={localStyles.aboutSection}>
            <Text accessibilityRole="header" style={localStyles.aboutHeading}>{english ? "Something about you" : "Algo muy vos"} <Text style={localStyles.optionalLabel}>{english ? "Optional" : "Opcional"}</Text></Text>
            <Text style={localStyles.aboutHint}>{english ? "A passion, a favorite activity or a plan you’re always up for…" : "Un gusto, una pasión o ese plan al que siempre te sumás…"}</Text>
            <TextInput
              ref={descriptionInputRef} style={[localStyles.introInput, localStyles.introDescription]}
              accessibilityLabel={english ? "About you, optional" : "Algo muy vos, opcional"}
              placeholder={english ? "Tell us a little about yourself" : "Contanos un poquito de vos"}
              placeholderTextColor={vibesTheme.colors.secondaryText}
              value={briefDescription} onChangeText={setBriefDescription}
              onFocus={() => scrollInputIntoView(descriptionInputRef.current)}
              onBlur={() => { if (focusedProfileInput.current === descriptionInputRef.current) focusedProfileInput.current = null; }}
              multiline maxLength={1000} textAlignVertical="top"
            />
            <Text style={localStyles.aboutHint}>{english ? "Need an idea?" : "¿Necesitás una idea?"}</Text>
            <View style={localStyles.ideaChips}>
              {ideas.map(idea => <TouchableOpacity key={idea} accessibilityRole="button" style={localStyles.ideaChip}
                onPress={() => {
                  const prefix = idea.replace(/…$/, "");
                  setBriefDescription(previous => `${previous.trim() ? `${previous.trim()}\n` : ""}${prefix} `.slice(0, 1000));
                  requestAnimationFrame(() => descriptionInputRef.current?.focus());
                }}>
                <Text style={localStyles.ideaText}>{idea}</Text>
              </TouchableOpacity>)}
            </View>
          </View>
      </>
    );
  };

  const renderStep = () => {
    if (step === "continueChoice") return (
      <>
        <Text accessibilityRole="header" style={localStyles.choiceTitle}>{copy.title}</Text>
        <Text style={localStyles.choiceSubtitle}>{copy.subtitle}</Text>
        <ProfileReadyIllustration english={locale === "en"} />
      </>
    );
    if (step === "purpose") return renderPurpose();
    const questionGroup = ["identity", "interests"].indexOf(step);
    if (questionGroup >= 0)
      return (
        <>
          <View style={localStyles.purposeHero}>
            <View style={localStyles.introCopy}>
              <Text accessibilityRole="header" style={localStyles.purposeTitle}>{copy.title}</Text>
              <Text style={localStyles.aboutHint}>{locale === "en" ? "Everything is optional. Share only what you want." : "Todo es opcional. Compartí solo lo que quieras."}</Text>
            </View>
            <OnboardingPlayfulShapes kind={step === "identity" ? "identity" : "interests"} style={{ width: 64, height: 70 }} />
          </View>
          <ProfileQuestionsForm
            hiddenFields={["gender", "lookingFor", "habits"]}
            showHeader={false}
            onInputFocus={scrollInputIntoView}
            group={questionGroup}
            value={answers}
            onChange={setAnswers}
          />
        </>
      );
    if (step === "profile") return renderProfile();
    if (step === "profileText") return renderProfileText();
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
        <View style={localStyles.completionLoadingScreen}>
          <VibesLoader />
        </View>
      ) : (
        <OnboardingScreenContainer
          scrollViewRef={onboardingScrollRef}
          onScroll={event => { onboardingScrollY.current = event.nativeEvent.contentOffset.y; }}
          onViewportChange={() => requestAnimationFrame(revealFocusedInput)}
          footer={
            <>
              <PrimaryButton
                label={
                  ["profileText", "profile"].includes(step) ? (locale === "en" ? "Continue" : "Continuar") : ["identity", "interests"].includes(step)
                    ? "Siguiente"
                    : copy.button
                }
                onPress={() => void goNext()}
                disabled={!canContinue}
                loading={completeMutation.isPending}
              />
              {step === "profile" ? <TouchableOpacity accessibilityRole="button" onPress={() => void goNext()}
                disabled={!canContinue || completeMutation.isPending} style={localStyles.completeLaterButton}>
                <Text style={localStyles.photoLaterText}>{locale === "en" ? "Add photos later" : "Agregar fotos más adelante"}</Text>
              </TouchableOpacity> : null}
              {["continueChoice", "purpose", "location", "practices", "identity", "interests"].includes(step) ? (
                <TouchableOpacity
                  onPress={() => {
                    updateDraft(currentDraft);
                    trackSignupEvent("onboarding_skipped", { step, stepIndex });
                    setStepIndex(VIBES_ONBOARDING_STEPS.indexOf("completion"));
                  }}
                  accessibilityRole="button"
                  disabled={completeMutation.isPending || !displayName.trim()}
                  style={[localStyles.completeLaterButton, !displayName.trim() && { opacity: 0.42 }]}
                >
                  <Text style={localStyles.completeLaterText}>
                    {locale === "en" ? "Complete later" : "Completar después"}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          }
        >
          <ProgressHeader
            intro={["profileText", "continueChoice"].includes(step)}
            cancelDisabled={completeMutation.isPending}
            onCancel={draft.editingExistingProfile ? () => {
              resetDraft();
              navigation.dispatch(CommonActions.reset({
                index: 0,
                routes: [{name: "Tab", params: {screen: "Home"}}],
              }));
            } : undefined}
            progress={(availableStepIndices.indexOf(stepIndex) + 1) / availableStepIndices.length}
            onBack={goBack}
            showBack={availableStepIndices.indexOf(stepIndex) > 0}
            hideBackIcon={false}
          />
          <Animated.View style={animatedStyle}>
            {renderStep()}

          </Animated.View>
        </OnboardingScreenContainer>
      )}

      {Platform.OS === "ios" ? (
        <AnimatedSheetModal
          visible={showBirthDatePicker}
          placement="center"
          onClose={() => setShowBirthDatePicker(false)}
          sheetStyle={localStyles.birthDateSheet}
        >
          <Text accessibilityRole="header" style={localStyles.birthDateTitle}>
            {t("vibesOnboarding.profile.birthDatePlaceholder")}
          </Text>
          {showBirthDatePicker ? <DateTimePicker
            style={onboardingStyles.nativeBirthDatePicker}
            value={pendingBirthDate ?? birthDateLimits.maximumDate}
            mode="date"
            display="spinner"
            themeVariant="light"
            textColor={vibesTheme.colors.primaryText}
            locale={locale === "en" ? "en-US" : "es-AR"}
            minimumDate={birthDateLimits.minimumDate}
            maximumDate={birthDateLimits.maximumDate}
            onChange={(_event, date) => { if (date) setPendingBirthDate(date); }}
          /> : null}
          <PrimaryButton label={t("common.done")} onPress={() => {
            setBirthDate(pendingBirthDate ?? birthDateLimits.maximumDate);
            setShowBirthDatePicker(false);
          }} />
          <TouchableOpacity accessibilityRole="button" style={localStyles.completeLaterButton}
            onPress={() => setShowBirthDatePicker(false)}>
            <Text style={localStyles.completeLaterText}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        </AnimatedSheetModal>
      ) : null}

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
          automaticallyAdjustKeyboardInsets={false}
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
          removeClippedSubviews={false}
          style={{ flex: 1 }}
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

const VibesOnboardingFlow = () => {
  const route = useRoute();
  const resume = Boolean((route.params as {resume?: boolean} | undefined)?.resume);
  const {data:session} = useAuthSession();
  const profile = useProfileQuery(session?.user?.id);
  const preferences = useUserPreferencesQuery(resume ? session?.user?.id : undefined);
  const answers = useQuery({queryKey:["profileAnswers",session?.user?.id],
    queryFn:()=>readProfileAnswers(session!.user.id), enabled:resume && Boolean(session?.user?.id)});
  const {setDraft,resetDraft} = useOnboardingDraft();
  useEffect(() => () => { if (resume) resetDraft(); }, [resume]);
  const [ready, setReady] = useState(!resume);
  useEffect(() => {
    if (!resume || ready || !profile.data || !preferences.isSuccess || !answers.isSuccess) return;
    setDraft(buildResumeOnboardingDraft(profile.data, preferences.data, answers.data));
    setReady(true);
  }, [resume,ready,profile.data,preferences.isSuccess,preferences.data,answers.isSuccess,answers.data]);
  if (!ready) return <ScreenContainer><View style={{flex:1,justifyContent:"center",alignItems:"center",padding:24}}>
    {profile.isError || preferences.isError || answers.isError || (profile.isSuccess && !profile.data)
      ? <PrimaryButton label="Reintentar cargar tu perfil" onPress={()=>{void profile.refetch();void preferences.refetch();void answers.refetch();}} />
      : <VibesLoader size={48} accessibilityLabel="Cargando tu perfil" />}
  </View></ScreenContainer>;
  return <VibesOnboardingContent skipContinueChoice={Boolean((route.params as {skipContinueChoice?:boolean} | undefined)?.skipContinueChoice)} />;
};
export default VibesOnboardingFlow;

const localStyles = StyleSheet.create({
  locationInput: {
    // Let single-line native inputs center the font without extra line leading.
    lineHeight: undefined,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  experienceHint: {marginTop:12,marginBottom:2,fontSize:14,lineHeight:20,color:vibesTheme.colors.secondaryText},
  practiceWithDetails: {borderColor:vibesTheme.colors.accentBlue,backgroundColor:`${vibesTheme.colors.accentBlue}0C`},
  practiceDot: {width:10,height:10,borderRadius:5,backgroundColor:vibesTheme.colors.accentMustard},
  purposeGrid: {width:"100%",maxWidth:280,alignSelf:"center",flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between",gap:0,rowGap:10,marginTop:16},
  purposeHeading: {flexDirection:"row",alignItems:"center",gap:5,marginBottom:10},
  purposeHero: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  purposeTitle: { color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.extraBold, fontSize: 26, lineHeight: 32, marginBottom: 6 },
  choiceTitle: { marginTop: 8, color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.extraBold, fontSize: 28, lineHeight: 34 },
  choiceSubtitle: { marginTop: 8, color: vibesTheme.colors.secondaryText, fontFamily: vibesTheme.fonts.regular, fontSize: 15, lineHeight: 22 },
  photoHero: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 0, marginBottom: 8 },
  photoTitle: { color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.extraBold, fontSize: 26, lineHeight: 32, marginBottom: 6 },
  photoMascot: { width: 100, alignItems: "center", gap: 3 },
  photoGreeting: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 16, backgroundColor: `${vibesTheme.colors.accentBlue}14`, maxWidth: "100%" },
  photoGreetingText: { color: vibesTheme.colors.accentBlue, fontFamily: vibesTheme.fonts.semibold, fontSize: 12, lineHeight: 16, textAlign: "center" },
  photoLaterText: { color: vibesTheme.colors.secondaryText, fontFamily: vibesTheme.fonts.regular, fontSize: 13, lineHeight: 18 },
  introHero: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, marginBottom: 10 },
  introCopy: { flex: 1, minWidth: 0 },
  introConfetti: { position: "absolute", top: -12, left: -6, width: 36, height: 30 },
  introTitle: { color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.extraBold, fontSize: 28, lineHeight: 32 },
  introSubtitle: { color: vibesTheme.colors.secondaryText, fontFamily: vibesTheme.fonts.semibold, fontSize: 16, lineHeight: 22, marginTop: 6 },
  introMascot: { width: 80, alignItems: "center", gap: 6 },
  introLogo: { width: 72, height: 82 },
  greetingBubble: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 22, backgroundColor: `${vibesTheme.colors.accentBlue}14`, maxWidth: "100%" },
  greetingText: { color: vibesTheme.colors.accentBlue, fontFamily: vibesTheme.fonts.semibold, fontSize: 14, lineHeight: 19, textAlign: "center" },
  introFields: { gap: 12 },
  introField: { gap: 7 },
  introLabel: { color: vibesTheme.colors.secondaryText, fontFamily: vibesTheme.fonts.semibold, fontSize: 14, lineHeight: 20 },
  optionalLabel: { color: vibesTheme.colors.secondaryText, fontFamily: vibesTheme.fonts.regular, fontSize: 12, lineHeight: 18 },
  introInput: { minHeight: 52, borderWidth: 1, borderColor: `${vibesTheme.colors.secondaryText}30`, borderRadius: 14, backgroundColor: `${vibesTheme.colors.secondaryText}05`, paddingHorizontal: 16, paddingVertical: 12, fontFamily: vibesTheme.fonts.regular, fontSize: 17, lineHeight: 23, color: vibesTheme.colors.primaryText },
  aboutSection: { gap: 8, marginTop: 6 },
  aboutHeading: { color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.bold, fontSize: 24, lineHeight: 31 },
  aboutHint: { color: vibesTheme.colors.secondaryText, fontFamily: vibesTheme.fonts.regular, fontSize: 13, lineHeight: 19 },
  introDescription: { minHeight: 96 },
  ideaChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ideaChip: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24, backgroundColor: `${vibesTheme.colors.accentBlue}14`, justifyContent: "center" },
  ideaText: { color: vibesTheme.colors.accentBlue, fontFamily: vibesTheme.fonts.medium, fontSize: 13, lineHeight: 19 },
  photoExperienceNotice: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 16, marginTop: 16, marginBottom: 8, alignSelf: "stretch", borderRadius: 16, backgroundColor: `${vibesTheme.colors.accentBlue}14` },
  photoExperienceNoticeText: { flex: 1, color: vibesTheme.colors.primaryText, fontSize: 14, lineHeight: 20, fontFamily: vibesTheme.fonts.regular },
  birthDateSheet: { padding: 20, borderRadius: 24, backgroundColor: vibesTheme.colors.surface },
  birthDateTitle: { color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.semibold, fontSize: 20, lineHeight: 26, textAlign: "center" },
  completeLaterButton: {
    minHeight: 44,
    marginTop: 4,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  completeLaterText: {
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
  },
  completionLoadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ONBOARDING_COLORS.background,
  },
});
