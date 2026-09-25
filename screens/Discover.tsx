import { supabase } from "../src/lib/supabase";
import { PROFILE_PREFERENCE_OPTIONS } from "../src/lib/profilePreferenceOptions";
import { PURPOSE_OPTIONS } from "../src/screens/Onboarding/vibesOnboardingContent";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QUESTION_GROUPS } from "../src/lib/profileQuestions";
import {
  matchesDiscoverAnswers,
  type DiscoverAnswerFilters,
} from "../src/lib/discoverAnswerFilters";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getBottomTabContentPadding } from "../src/lib/tabBarLayout";
import DiscoverPathCards from "../components/DiscoverPathCards";
import {
  matchesDiscoverSpiritualPaths,
  readDiscoverSpiritualPaths,
} from "../src/lib/discoverSpiritualPaths";
import { compareDiscoveryProfiles } from "../src/lib/communityDiscovery";
/** @format */

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  useRef,
} from "react";
import {
  Image,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, TextInput } from "../components/Typography";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import DiscoverOrbitCanvas from "../components/DiscoverOrbitCanvas";
import AnimatedSheetModal from "../components/AnimatedSheetModal";
import Icon from "../components/Icon";
import UserProfileSheet from "../components/UserProfileSheet";
import type { UserProfileCardData } from "../components/UserProfileCard";
import styles, { DIMENSION_WIDTH, TEXT_PRIMARY } from "../assets/styles";
import type { DataT } from "../types";
import { useAuthSession } from "../src/auth/auth.queries";
import { mapCandidateToConnectionProfile } from "../src/lib/connectionProfiles";
import {
  useCandidatesQuery,
  useIncomingLikeCandidatesQuery,
  useSwipeHistoryCandidatesQuery,
} from "../src/queries/candidates.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { upsertUserPreferences } from "../src/lib/userPreferencesStore";
import { useSwipeMutation } from "../src/queries/swipes.mutations";
import { handleApiError } from "../src/utils/handleApiError";
import { useI18n } from "../src/i18n";
import { vibesTheme } from "../src/theme/vibesTheme";
import { calculateAgeFromBirthDate } from "../src/lib/birthDate";
import VibesLoader from "../components/VibesLoader";
import { showToast } from "../src/utils/toast";

type DiscoverGender = "woman" | "man" | "other";
type DiscoverDiet = "vegetarian" | "nonVegetarian" | "other";

type DiscoverFiltersState = {
  ageMin: number | null;
  ageMax: number | null;
  distanceMinKm: number | null;
  maxDistanceKm: number | null;
  genders: DiscoverGender[];
  diets: DiscoverDiet[];
  spiritualPaths: string[];
  smoking: "all" | "no" | "occasionally" | "yes";
};

const ANSWER_FILTER_FIELDS: {
  key: string;
  label: string;
  options: readonly string[];
}[] = (() => {
  const fields = QUESTION_GROUPS.flatMap((group) =>
    group.fields.filter((field) => "options" in field && field.key !== "gender")
  ) as readonly { key: string; label: string; options: readonly string[] }[];
  const result = fields.map((field) => ({
    ...field,
    options: [...field.options],
  }));
  for (const [key, config] of Object.entries(PROFILE_PREFERENCE_OPTIONS)) {
    if (["open_to", "vegetarian", "smoking", "vaccine"].includes(key)) continue;
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) =>
      letter.toUpperCase()
    );
    const existing = result.find((field) => field.key === camelKey);
    if (!existing)
      result.push({
        key: camelKey,
        label: config.label,
        options: [...config.options],
      });
  }
  result.unshift({
    key: "openTo",
    label: "Me trae a Vibes",
    options: PURPOSE_OPTIONS.map((option) => option.label),
  });
  return result;
})();

const DEFAULT_FILTERS: DiscoverFiltersState = {
  ageMin: null,
  ageMax: null,
  distanceMinKm: null,
  maxDistanceKm: null,
  genders: [],
  diets: [],
  spiritualPaths: [],
  smoking: "all",
};

export type DiscoverContentHandle = {
  openFilters: () => void;
};

type DiscoverContentProps = {
  showHeader?: boolean;
  onFilterCountChange?: (count: number) => void;
};
const DISCOVER_PAGE_SIZE = 10;
const MIN_DISCOVER_AGE = 18;
const MAX_DISCOVER_AGE = 80;

const toFiniteNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const parseAge = (value: unknown) => {
  const parsed = toFiniteNumber(value);
  if (parsed && parsed > 0) return Math.floor(parsed);

  if (typeof value !== "string" || !value.trim()) return null;

  const age = calculateAgeFromBirthDate(value);
  return age && age > 0 ? age : null;
};

const clampAge = (value: number) =>
  Math.min(MAX_DISCOVER_AGE, Math.max(MIN_DISCOVER_AGE, value));

const normalizeSmoking = (value: unknown): DiscoverFiltersState["smoking"] => {
  if (typeof value !== "string") return "all";

  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!normalized) return "all";
  if (
    normalized.includes("no") ||
    normalized.includes("never") ||
    normalized.includes("non")
  ) {
    return "no";
  }
  if (
    normalized.includes("occasion") ||
    normalized.includes("social") ||
    normalized.includes("sometimes") ||
    normalized.includes("a veces")
  ) {
    return "occasionally";
  }
  if (
    normalized.includes("yes") ||
    normalized.includes("si") ||
    normalized.includes("daily") ||
    normalized.includes("smoker") ||
    normalized.includes("fuma")
  ) {
    return "yes";
  }
  return "all";
};

const normalizeGender = (
  value: unknown,
  genderId?: unknown
): DiscoverGender | "unknown" => {
  if (typeof value === "string" && value.trim()) {
    const normalized = value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (["woman", "female", "mujer"].includes(normalized)) return "woman";
    if (["man", "male", "hombre"].includes(normalized)) return "man";
    if (
      ["nonbinary", "non-binary", "no binario", "no binaria"].includes(
        normalized
      )
    ) {
      return "other";
    }
    if (["other", "otro", "otra", "more", "mas"].includes(normalized)) {
      return "other";
    }
  }

  const parsedGenderId = toFiniteNumber(genderId);
  if (parsedGenderId === 1) return "woman";
  if (parsedGenderId === 2) return "man";
  if (parsedGenderId === 3) return "other";
  if (parsedGenderId === 4) return "other";
  return "unknown";
};

const normalizeDiet = (value: unknown): DiscoverDiet | "unknown" => {
  if (typeof value !== "string" || !value.trim()) return "unknown";

  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    ["si", "yes", "vegetarian", "vegetariano", "vegetariana"].includes(
      normalized
    )
  ) {
    return "vegetarian";
  }
  if (
    ["no", "non-vegetarian", "no vegetariano", "no vegetariana"].includes(
      normalized
    )
  ) {
    return "nonVegetarian";
  }
  return "other";
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceKm = (
  fromLatitude?: unknown,
  fromLongitude?: unknown,
  toLatitude?: unknown,
  toLongitude?: unknown
) => {
  const lat1 = toFiniteNumber(fromLatitude);
  const lon1 = toFiniteNumber(fromLongitude);
  const lat2 = toFiniteNumber(toLatitude);
  const lon2 = toFiniteNumber(toLongitude);

  if ([lat1, lon1, lat2, lon2].some((item) => item === null)) return null;

  const earthRadiusKm = 6371;
  const dLat = toRadians((lat2 as number) - (lat1 as number));
  const dLon = toRadians((lon2 as number) - (lon1 as number));
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1 as number)) *
      Math.cos(toRadians(lat2 as number)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const matchesNumberRange = (
  value: number | null,
  min: number | null,
  max: number | null,
  options?: { includeNullValue?: boolean }
) => {
  if (min === null && max === null) return true;
  if (value === null) return Boolean(options?.includeNullValue);
  if (min !== null && value < min) return false;
  if (max !== null && value > max) return false;
  return true;
};

const formatRangeSummary = (
  min: number | null,
  max: number | null,
  suffix = "",
  labels: { any: string; from: string; until: string }
) => {
  if (min === null && max === null) return labels.any;
  if (min !== null && max !== null) return `${min}-${max}${suffix}`;
  if (min !== null) return `${labels.from} ${min}${suffix}`;
  return `${labels.until} ${max}${suffix}`;
};

const formatDistanceLabel = (distanceKm: number | null) => {
  if (distanceKm === null || !Number.isFinite(distanceKm)) return undefined;
  return `${Math.max(1, Math.round(distanceKm))} km`;
};

const areFiltersEqual = (
  left: DiscoverFiltersState,
  right: DiscoverFiltersState
) =>
  left.ageMin === right.ageMin &&
  left.ageMax === right.ageMax &&
  left.distanceMinKm === right.distanceMinKm &&
  left.maxDistanceKm === right.maxDistanceKm &&
  left.genders.length === right.genders.length &&
  left.genders.every((gender) => right.genders.includes(gender)) &&
  left.diets.length === right.diets.length &&
  left.diets.every((diet) => right.diets.includes(diet)) &&
  left.spiritualPaths.length === right.spiritualPaths.length &&
  left.spiritualPaths.every((path) => right.spiritualPaths.includes(path)) &&
  left.smoking === right.smoking;

const readStoredFilters = (
  preferences: Record<string, any> | null
): DiscoverFiltersState => ({
  ageMin: toFiniteNumber(
    preferences?.discoverAgeMin ?? preferences?.discover_age_min
  ),
  ageMax: toFiniteNumber(
    preferences?.discoverAgeMax ?? preferences?.discover_age_max
  ),
  distanceMinKm: toFiniteNumber(
    preferences?.discoverDistanceMinKm ?? preferences?.discover_distance_min_km
  ),
  maxDistanceKm: toFiniteNumber(
    preferences?.discoverDistanceMaxKm ?? preferences?.discover_distance_max_km
  ),
  genders: (() => {
    const storedGenders =
      preferences?.discoverGenders ?? preferences?.discover_genders;
    if (Array.isArray(storedGenders)) {
      return Array.from(
        new Set(
          storedGenders
            .map((value) => normalizeGender(value))
            .filter((value): value is DiscoverGender => value !== "unknown")
        )
      );
    }
    const storedGender = normalizeGender(
      preferences?.discoverGender ?? preferences?.discover_gender,
      preferences?.discoverGenderId ?? preferences?.discover_gender_id
    );
    return storedGender === "unknown" ? [] : [storedGender];
  })(),
  diets: (() => {
    const storedDiets =
      preferences?.discoverDiets ?? preferences?.discover_diets;
    if (!Array.isArray(storedDiets)) return [];
    return storedDiets.filter((value): value is DiscoverDiet =>
      ["vegetarian", "nonVegetarian", "other"].includes(String(value))
    );
  })(),
  spiritualPaths: readDiscoverSpiritualPaths(
    preferences?.discoverSpiritualPaths ?? preferences?.discover_spiritual_paths
  ),
  smoking: normalizeSmoking(
    preferences?.discoverSmoking ?? preferences?.discover_smoking
  ),
});

export const DiscoverContent = forwardRef<
  DiscoverContentHandle,
  DiscoverContentProps
>(({ showHeader = true, onFilterCountChange }, ref) => {
  const navigation = useNavigation();
  const filterInsets = useSafeAreaInsets();
  const [answerFilters, setAnswerFilters] = useState<DiscoverAnswerFilters>({});
  const [answerFiltersOwner, setAnswerFiltersOwner] = useState<string | null>(
    null
  );
  const { t, locale } = useI18n();
  const { data: session } = useAuthSession();
  useEffect(() => {
    let active = true;
    const userId = session?.user?.id;
    setAnswerFilters({});
    setAnswerFiltersOwner(null);
    if (!userId) return;
    Promise.all([
      supabase
        .from("user_preferences")
        .select("discover_answer_filters")
        .eq("user_id", userId)
        .maybeSingle(),
      AsyncStorage.getItem(`discover_answer_filters:${userId}`),
    ])
      .then(([remote, raw]) => {
        if (remote.error) throw remote.error;
        if (!active) return;
        const parsed =
          remote.data?.discover_answer_filters ?? (raw ? JSON.parse(raw) : {});
        const valid: DiscoverAnswerFilters = {};
        for (const field of ANSWER_FILTER_FIELDS) {
          if (Array.isArray(parsed?.[field.key])) {
            valid[field.key] = parsed[field.key].filter(
              (value: unknown) =>
                typeof value === "string" && field.options.includes(value)
            );
          }
        }
        for (const key of ["heightMin", "heightMax"]) {
          const value = parsed?.[key]?.[0];
          if (typeof value === "string" && /^\d{1,3}$/.test(value))
            valid[key] = [value];
        }
        setAnswerFilters(valid);
        setAnswerFiltersOwner(userId);
      })
      .catch((error) => {
        if (active) showToast("No se pudieron cargar los filtros");
        console.warn("discover_answer_filters:load_error", error);
      });
    return () => {
      active = false;
    };
  }, [session?.user?.id]);
  useEffect(() => {
    if (!answerFiltersOwner || answerFiltersOwner !== session?.user?.id) return;
    const timeout = setTimeout(() => {
      void (async () => {
        const { error } = await supabase.from("user_preferences").upsert(
          {
            user_id: answerFiltersOwner,
            discover_answer_filters: answerFilters,
          },
          { onConflict: "user_id" }
        );
        if (error) throw error;
        await AsyncStorage.setItem(
          `discover_answer_filters:${answerFiltersOwner}`,
          JSON.stringify(answerFilters)
        );
      })().catch((error) => {
        console.warn("discover_answer_filters:persist_error", error);
        showToast("No se pudieron guardar los filtros");
      });
    }, 350);
    return () => clearTimeout(timeout);
  }, [answerFilters, answerFiltersOwner, session?.user?.id]);
  const { data: ownProfileData } = useProfileQuery(session?.user?.id);
  const { data: userPreferences, isFetched: hasFetchedUserPreferences } =
    useUserPreferencesQuery(session?.user?.id);
  const {
    data: candidates = [],
    isLoading,
    isError,
    error,
  } = useCandidatesQuery({
    limit: 200,
  });
  const swipeHistory = useSwipeHistoryCandidatesQuery();
  const incomingLikes = useIncomingLikeCandidatesQuery();
  const swipeMutation = useSwipeMutation();
  const swipeBusy = useRef(false);
  const focused = useIsFocused();
  const resumeAfterMatch = useRef<DataT | null>(null);
  useEffect(() => {
    if (focused && resumeAfterMatch.current) {
      setSelectedProfile(resumeAfterMatch.current);
      setShowProfileSheet(true);
      resumeAfterMatch.current = null;
    }
  }, [focused]);
  const [discoverFilters, setDiscoverFilters] =
    useState<DiscoverFiltersState>(DEFAULT_FILTERS);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [hasHydratedStoredFilters, setHasHydratedStoredFilters] =
    useState(false);
  const [selectedProfile, setSelectedProfile] = useState<DataT | null>(null);
  const [hiddenProfileIds, setHiddenProfileIds] = useState<Set<string>>(
    new Set()
  );
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSpiritualPaths, setShowSpiritualPaths] = useState(false);
  const [historyMode, setHistoryMode] = useState<
    "dismissed" | "liked" | "incoming"
  >("liked");
  const [viewingHistory, setViewingHistory] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const [profilePage, setProfilePage] = useState(0);
  const ownProfileRecord = (ownProfileData ?? null) as Record<
    string,
    any
  > | null;
  const hasLocation =
    toFiniteNumber(ownProfileRecord?.latitude) !== null &&
    toFiniteNumber(ownProfileRecord?.longitude) !== null;

  const profiles = useMemo<DataT[]>(() => {
    return candidates
      .filter(
        (candidate) =>
          String(candidate.id) !== session?.user?.id &&
          !hiddenProfileIds.has(String((candidate as Record<string, any>).id))
      )
      .map((candidate) => {
        const candidateRecord = candidate as Record<string, any>;
        const distanceKm = getDistanceKm(
          ownProfileRecord?.latitude,
          ownProfileRecord?.longitude,
          candidateRecord.latitude,
          candidateRecord.longitude
        );

        return {
          ...candidateRecord,
          distanceKm: distanceKm ?? undefined,
        };
      })
      .filter((candidate) => {
        const candidateRecord = candidate as Record<string, any>;
        const candidateAge = parseAge(
          candidateRecord.age ??
            candidateRecord.birthDate ??
            candidateRecord.birth_date
        );
        const candidateSmoking = normalizeSmoking(candidateRecord.smoking);
        const candidateDiet = normalizeDiet(candidateRecord.vegetarian);
        const candidateGender = normalizeGender(
          candidateRecord.gender ??
            candidateRecord.genderLabel ??
            candidateRecord.gender_label,
          candidateRecord.genderId ?? candidateRecord.gender_id
        );

        if (
          !matchesNumberRange(
            candidateAge,
            discoverFilters.ageMin,
            discoverFilters.ageMax
          )
        ) {
          return false;
        }

        if (
          !matchesNumberRange(
            typeof candidateRecord.distanceKm === "number"
              ? candidateRecord.distanceKm
              : null,
            discoverFilters.distanceMinKm,
            discoverFilters.maxDistanceKm
          )
        ) {
          return false;
        }

        if (
          discoverFilters.genders.length > 0 &&
          (candidateGender === "unknown" ||
            !discoverFilters.genders.includes(candidateGender))
        ) {
          return false;
        }

        if (
          discoverFilters.smoking !== "all" &&
          candidateSmoking !== discoverFilters.smoking
        ) {
          return false;
        }

        if (
          discoverFilters.diets.length > 0 &&
          (candidateDiet === "unknown" ||
            !discoverFilters.diets.includes(candidateDiet))
        ) {
          return false;
        }

        if (!matchesDiscoverAnswers(candidateRecord, answerFilters))
          return false;

        return matchesDiscoverSpiritualPaths(
          candidate,
          discoverFilters.spiritualPaths
        );
      })
      .sort((left, right) =>
        compareDiscoveryProfiles(userPreferences ?? {}, left, right)
      )
      .map((candidate) => {
        const profile = mapCandidateToConnectionProfile(candidate);
        const candidateRecord = candidate as Record<string, any>;
        return {
          ...profile,
          distanceLabel: formatDistanceLabel(
            typeof candidateRecord.distanceKm === "number"
              ? candidateRecord.distanceKm
              : null
          ),
          match: profile.match ?? "0",
        } as DataT;
      });
  }, [
    candidates,
    session?.user?.id,
    userPreferences,
    discoverFilters,
    answerFilters,
    hiddenProfileIds,
    hasLocation,
    ownProfileRecord?.latitude,
    ownProfileRecord?.longitude,
  ]);

  const errorMessage =
    error instanceof Error && error.message.trim()
      ? error.message
      : t("discover.loadFailed");
  const distanceSummary = formatRangeSummary(
    discoverFilters.distanceMinKm,
    discoverFilters.maxDistanceKm,
    " km",
    {
      any: t("common.any"),
      from: t("common.from", { value: "" }).trim(),
      until: t("common.until", { value: "" }).trim(),
    }
  );
  const historyProfiles = useMemo<DataT[]>(
    () => {
      if (historyMode === "incoming") {
        return (incomingLikes.data ?? []).map((candidate) => ({
          ...mapCandidateToConnectionProfile(candidate),
          swipeStatus: "Quiere conectar con vos",
        })) as DataT[];
      }
      return (swipeHistory.data ?? [])
        .filter((candidate) =>
          historyMode === "dismissed"
            ? candidate.swipeDirection === "pass"
            : candidate.swipeDirection === "like"
        )
        .map((candidate) => {
          const profile = mapCandidateToConnectionProfile(candidate);
          return {
            ...profile,
            swipeDirection: candidate.swipeDirection,
            swipeStatus:
              candidate.swipeDirection === "like"
                ? "Conexión pendiente"
                : "Perfil descartado",
          } as DataT;
        });
    },
    [historyMode, incomingLikes.data, swipeHistory.data]
  );
  const canvasProfiles = showHistory ? historyProfiles : profiles;
  const nextSelectedProfile = useMemo(() => {
    if (!selectedProfile) return null;
    const index = canvasProfiles.findIndex(
      (item) => String(item.id) === String(selectedProfile.id)
    );
    return (
      canvasProfiles[index + 1] ??
      canvasProfiles.find(
        (item) => String(item.id) !== String(selectedProfile.id)
      ) ??
      null
    );
  }, [canvasProfiles, selectedProfile]);
  const selectedProfileForSheet = useMemo<UserProfileCardData | null>(
    () =>
      selectedProfile
        ? {
            ...selectedProfile,
            id: String(selectedProfile.id),
          }
        : null,
    [selectedProfile]
  );
  const selectedHistoryProfileCanConnect =
    viewingHistory &&
    (historyMode === "dismissed" || historyMode === "incoming");
  const pageCount = Math.max(
    1,
    Math.ceil(canvasProfiles.length / DISCOVER_PAGE_SIZE)
  );
  const currentPage = profilePage % pageCount;
  const visibleProfiles = useMemo(
    () =>
      showHistory && historyMode !== "dismissed"
        ? canvasProfiles
        : canvasProfiles.slice(
            currentPage * DISCOVER_PAGE_SIZE,
            (currentPage + 1) * DISCOVER_PAGE_SIZE
          ),
    [canvasProfiles, currentPage, historyMode, showHistory]
  );
  const canShowMoreProfiles =
    pageCount > 1 && !(showHistory && historyMode !== "dismissed");
  const activeFilterCount = useMemo(
    () =>
      [
        discoverFilters.ageMin !== null || discoverFilters.ageMax !== null,
        hasLocation &&
          (discoverFilters.distanceMinKm !== null ||
            discoverFilters.maxDistanceKm !== null),
        discoverFilters.genders.length > 0,
        discoverFilters.diets.length > 0,
        discoverFilters.spiritualPaths.length > 0,
        discoverFilters.smoking !== "all",
      ].filter(Boolean).length +
      Object.values(answerFilters).filter((values) => values.length > 0).length,
    [discoverFilters, hasLocation, answerFilters]
  );

  useEffect(() => {
    onFilterCountChange?.(activeFilterCount);
  }, [activeFilterCount, onFilterCountChange]);

  useEffect(() => {
    setProfilePage(0);
  }, [discoverFilters, answerFilters, hiddenProfileIds, showHistory]);

  useEffect(() => {
    if (!session?.user?.id) {
      setDiscoverFilters(DEFAULT_FILTERS);
      setHasHydratedStoredFilters(true);
      return;
    }

    if (!hasFetchedUserPreferences) return;

    if (!userPreferences) {
      setDiscoverFilters(DEFAULT_FILTERS);
      setHasHydratedStoredFilters(true);
      return;
    }

    const storedFilters = readStoredFilters(userPreferences);
    setDiscoverFilters((prev) =>
      areFiltersEqual(prev, storedFilters) ? prev : storedFilters
    );
    setHasHydratedStoredFilters(true);
  }, [hasFetchedUserPreferences, session?.user?.id, userPreferences]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !hasHydratedStoredFilters) return;

    const timeoutId = setTimeout(() => {
      void upsertUserPreferences(userId, {
        discover_age_min: discoverFilters.ageMin,
        discover_age_max: discoverFilters.ageMax,
        discover_distance_min_km: discoverFilters.distanceMinKm,
        discover_distance_max_km: discoverFilters.maxDistanceKm,
        discover_genders: discoverFilters.genders,
        discover_gender:
          discoverFilters.genders.length === 1
            ? discoverFilters.genders[0]
            : "all",
        discover_gender_id: null,
        discover_diets: discoverFilters.diets,
        discover_spiritual_paths: discoverFilters.spiritualPaths,
        discover_smoking: discoverFilters.smoking,
      }).catch((persistError) => {
        console.warn("discover_filters:persist_error", persistError);
      });
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [discoverFilters, hasHydratedStoredFilters, session?.user?.id]);

  const openGallery = (images: any[] | undefined, initialIndex = 0) => {
    if (!images || images.length === 0) return;
    setGalleryImages(images);
    setGalleryInitialIndex(
      initialIndex >= 0 && initialIndex < images.length ? initialIndex : 0
    );
    setShowGallery(true);
  };

  const actOnProfile = async (
    profile: DataT | null,
    direction: "like" | "pass"
  ) => {
    if (!profile || swipeMutation.isPending || swipeBusy.current) return false;
    swipeBusy.current = true;
    const id = String(profile.id);
    const next = nextSelectedProfile;
    try {
      const result = await swipeMutation.mutateAsync({
        targetUserId: id,
        direction,
      });
      setHiddenProfileIds((previous) => new Set(previous).add(id));
      setSelectedProfile(next);
      setShowProfileSheet(Boolean(next));
      if (result.match) {
        resumeAfterMatch.current = next;
        setShowProfileSheet(false);
        navigation.navigate("Match" as never, { profile } as never);
      }
      return true;
    } catch (error) {
      handleApiError(error, {
        toastTitle: "No se pudo guardar. Intentá nuevamente.",
      });
      return false;
    } finally {
      swipeBusy.current = false;
    }
  };
  const connectProfile = (profile: DataT | null) =>
    actOnProfile(profile, "like");
  const dismissProfile = (profile: DataT | null) =>
    actOnProfile(profile, "pass");

  const filterSectionTitle = (title: string) => (
    <Text style={localStyles.filtersSectionTitle}>{title}</Text>
  );

  const setAgeInput = (key: "ageMin" | "ageMax", value: string) => {
    const digits = value.replace(/\D+/g, "");
    setDiscoverFilters((prev) => ({
      ...prev,
      [key]: digits ? Math.min(MAX_DISCOVER_AGE, Number(digits)) : null,
    }));
  };

  const normalizeAgeInputs = () => {
    setDiscoverFilters((prev) => {
      const ageMin = prev.ageMin === null ? null : clampAge(prev.ageMin);
      const ageMax = prev.ageMax === null ? null : clampAge(prev.ageMax);
      return {
        ...prev,
        ageMin:
          ageMin !== null && ageMax !== null
            ? Math.min(ageMin, ageMax)
            : ageMin,
        ageMax:
          ageMin !== null && ageMax !== null
            ? Math.max(ageMin, ageMax)
            : ageMax,
      };
    });
  };

  const setDistanceInput = (
    key: "distanceMinKm" | "maxDistanceKm",
    value: string
  ) => {
    const digits = value.replace(/\D+/g, "");
    setDiscoverFilters((prev) => ({
      ...prev,
      [key]: digits ? Math.min(999, Number(digits)) : null,
    }));
  };

  const toggleSpiritualPath = (path: string) => {
    setDiscoverFilters((previous) => ({
      ...previous,
      spiritualPaths: previous.spiritualPaths.includes(path)
        ? previous.spiritualPaths.filter((value) => value !== path)
        : [...previous.spiritualPaths, path],
    }));
  };

  useImperativeHandle(
    ref,
    () => ({
      openFilters: () => setIsFiltersVisible(true),
    }),
    []
  );

  return (
    <View style={localStyles.screen}>
      <SafeAreaView
        style={localStyles.safeArea}
        edges={showHeader ? ["top", "left", "right"] : ["left", "right"]}
      >
        <Modal
          visible={showGallery}
          transparent
          animationType="fade"
          onRequestClose={() => setShowGallery(false)}
        >
          <View style={styles.galleryOverlay}>
            <TouchableOpacity
              style={styles.galleryClose}
              onPress={() => setShowGallery(false)}
            >
              <Icon name="close" size={18} color={vibesTheme.colors.background} />
            </TouchableOpacity>
            <FlatList
              key={`gallery-${galleryInitialIndex}-${galleryImages.length}`}
              data={galleryImages}
              keyExtractor={(_, index) => `gallery-${index}`}
              getItemLayout={(_, index) => ({
                length: DIMENSION_WIDTH,
                offset: DIMENSION_WIDTH * index,
                index,
              })}
              horizontal
              initialScrollIndex={galleryInitialIndex}
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.gallerySlide}>
                  <Image source={item} style={styles.galleryImage} />
                </View>
              )}
            />
          </View>
        </Modal>

        <AnimatedSheetModal
          visible={isFiltersVisible}
          onClose={() => setIsFiltersVisible(false)}
          offsetY={320}
          sheetStyle={[
            localStyles.filtersSheet,
            { paddingBottom: Math.max(filterInsets.bottom, 16) },
          ]}
        >
          <>
            <View style={localStyles.filtersHandle} />
            <View style={localStyles.filtersHeader}>
              <View style={localStyles.filtersHeaderText}>
                <Text style={localStyles.filtersTitle}>
                  {t("discover.filters")}
                </Text>
                <Text style={localStyles.filtersSubtitle}>
                  {locale === "en"
                    ? "Choose who you want to discover."
                    : "Elegí a quién querés descubrir."}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsFiltersVisible(false)}
                accessibilityRole="button"
                accessibilityLabel={
                  locale === "en" ? "Close filters" : "Cerrar filtros"
                }
                style={localStyles.filtersCloseButton}
              >
                <Icon name="close" size={24} color={vibesTheme.colors.primaryText} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={localStyles.filtersContent}
            >
              <View style={localStyles.filtersSection}>
                {filterSectionTitle(t("discover.age"))}
                <View style={localStyles.rangeRow}>
                  <View style={localStyles.rangeCard}>
                    <Text style={localStyles.rangeLabel}>
                      {locale === "en" ? "From" : "Desde"}
                    </Text>
                    <TextInput
                      style={localStyles.rangeInput}
                      value={discoverFilters.ageMin?.toString() ?? ""}
                      onChangeText={(value) => setAgeInput("ageMin", value)}
                      placeholder={t("discover.noLimit")}
                      placeholderTextColor={vibesTheme.colors.primaryText}
                      keyboardType="number-pad"
                      maxLength={2}
                      onEndEditing={normalizeAgeInputs}
                    />
                  </View>
                  <View style={localStyles.rangeCard}>
                    <Text style={localStyles.rangeLabel}>
                      {locale === "en" ? "To" : "Hasta"}
                    </Text>
                    <TextInput
                      style={localStyles.rangeInput}
                      value={discoverFilters.ageMax?.toString() ?? ""}
                      onChangeText={(value) => setAgeInput("ageMax", value)}
                      placeholder={t("discover.noLimit")}
                      placeholderTextColor={vibesTheme.colors.primaryText}
                      keyboardType="number-pad"
                      maxLength={2}
                      onEndEditing={normalizeAgeInputs}
                    />
                  </View>
                </View>
              </View>

              {hasLocation ? (
                <View style={localStyles.filtersSection}>
                  {filterSectionTitle(t("discover.distance"))}
                  <View style={localStyles.rangeHeader}>
                    <Text style={localStyles.rangeSummary}>
                      {distanceSummary}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setDiscoverFilters((prev) => ({
                          ...prev,
                          distanceMinKm: null,
                          maxDistanceKm: null,
                        }))
                      }
                    >
                      <Text style={localStyles.rangeReset}>
                        {t("discover.clear")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={localStyles.rangeRow}>
                    <View style={localStyles.rangeCard}>
                      <Text style={localStyles.rangeLabel}>
                        {t("discover.min")}
                      </Text>
                      <TextInput
                        style={localStyles.rangeInput}
                        value={discoverFilters.distanceMinKm?.toString() ?? ""}
                        onChangeText={(value) =>
                          setDistanceInput("distanceMinKm", value)
                        }
                        placeholder={t("discover.noLimit")}
                        placeholderTextColor={vibesTheme.colors.primaryText}
                        keyboardType="number-pad"
                        maxLength={3}
                      />
                    </View>
                    <View style={localStyles.rangeCard}>
                      <Text style={localStyles.rangeLabel}>
                        {t("discover.max")}
                      </Text>
                      <TextInput
                        style={localStyles.rangeInput}
                        value={discoverFilters.maxDistanceKm?.toString() ?? ""}
                        onChangeText={(value) =>
                          setDistanceInput("maxDistanceKm", value)
                        }
                        placeholder={t("discover.noLimit")}
                        placeholderTextColor={vibesTheme.colors.primaryText}
                        keyboardType="number-pad"
                        maxLength={3}
                      />
                    </View>
                  </View>
                </View>
              ) : null}

              <View style={localStyles.filtersSection}>
                {filterSectionTitle(t("discover.gender"))}
                <Text style={localStyles.filtersSubtitle}>
                  {locale === "en"
                    ? "No selection shows everyone."
                    : "Sin selección, se muestran todos."}
                </Text>
                <View style={localStyles.filtersPillRow}>
                  {(
                    [
                      { value: "man", label: t("discover.genderMan") },
                      { value: "woman", label: t("discover.genderWoman") },
                      { value: "other", label: t("discover.genderOther") },
                    ] as const
                  ).map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        localStyles.filterPill,
                        discoverFilters.genders.includes(option.value) &&
                          localStyles.filterPillActive,
                      ]}
                      onPress={() =>
                        setDiscoverFilters((prev) => {
                          const selected = prev.genders.includes(option.value);
                          return {
                            ...prev,
                            genders: selected
                              ? prev.genders.filter(
                                  (value) => value !== option.value
                                )
                              : [...prev.genders, option.value],
                          };
                        })
                      }
                    >
                      <Text
                        style={[
                          localStyles.filterPillText,
                          discoverFilters.genders.includes(option.value) &&
                            localStyles.filterPillTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={localStyles.filtersSection}>
                {filterSectionTitle("Estatura (cm)")}
                <View style={localStyles.rangeRow}>
                  {(["heightMin", "heightMax"] as const).map((key, index) => (
                    <View key={key} style={localStyles.rangeCard}>
                      <Text style={localStyles.rangeLabel}>
                        {index === 0 ? "Desde" : "Hasta"}
                      </Text>
                      <TextInput
                        accessibilityLabel={
                          index === 0
                            ? "Estatura mínima en centímetros"
                            : "Estatura máxima en centímetros"
                        }
                        style={localStyles.rangeInput}
                        value={answerFilters[key]?.[0] ?? ""}
                        placeholder="Sin límite"
                        placeholderTextColor={vibesTheme.colors.primaryText}
                        keyboardType="number-pad"
                        maxLength={3}
                        onChangeText={(text) => {
                          const value = text.replace(/\D/g, "");
                          setAnswerFilters((previous) => ({
                            ...previous,
                            [key]: value ? [value] : [],
                          }));
                        }}
                        onEndEditing={() =>
                          setAnswerFilters((previous) => {
                            const min = Number(previous.heightMin?.[0]);
                            const max = Number(previous.heightMax?.[0]);
                            return min && max && min > max
                              ? {
                                  ...previous,
                                  heightMin: [String(max)],
                                  heightMax: [String(min)],
                                }
                              : previous;
                          })
                        }
                      />
                    </View>
                  ))}
                </View>
              </View>

              {ANSWER_FILTER_FIELDS.map((field) => (
                <View key={field.key} style={localStyles.filtersSection}>
                  {filterSectionTitle(field.label)}
                  <Text style={localStyles.filtersSubtitle}>
                    Podés elegir varias. Sin selección, se muestran todos.
                  </Text>
                  <View style={localStyles.filtersPillRow}>
                    {field.options.map((option) => {
                      const selected =
                        answerFilters[field.key]?.includes(option) ?? false;
                      return (
                        <TouchableOpacity
                          key={option}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: selected }}
                          activeOpacity={0.8}
                          style={[
                            localStyles.filterPill,
                            selected && localStyles.filterPillActive,
                          ]}
                          onPress={() =>
                            setAnswerFilters((previous) => ({
                              ...previous,
                              [field.key]: selected
                                ? (previous[field.key] ?? []).filter(
                                    (value) => value !== option
                                  )
                                : [...(previous[field.key] ?? []), option],
                            }))
                          }
                        >
                          <Text
                            style={[
                              localStyles.filterPillText,
                              selected && localStyles.filterPillTextActive,
                            ]}
                          >
                            {option}
                          </Text>
                          {selected && (
                            <Icon
                              name="checkmark-circle"
                              size={20}
                              color={vibesTheme.colors.primaryText}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}

              <View style={localStyles.filtersSection}>
                {filterSectionTitle(t("discover.diet"))}
                <View style={localStyles.filtersPillRow}>
                  {(
                    [
                      {
                        value: "vegetarian",
                        label: t("discover.dietVegetarian"),
                      },
                      {
                        value: "nonVegetarian",
                        label: t("discover.dietNonVegetarian"),
                      },
                      { value: "other", label: t("discover.dietOther") },
                    ] as const
                  ).map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        localStyles.filterPill,
                        discoverFilters.diets.includes(option.value) &&
                          localStyles.filterPillActive,
                      ]}
                      onPress={() =>
                        setDiscoverFilters((prev) => {
                          const selected = prev.diets.includes(option.value);
                          return {
                            ...prev,
                            diets: selected
                              ? prev.diets.filter(
                                  (value) => value !== option.value
                                )
                              : [...prev.diets, option.value],
                          };
                        })
                      }
                    >
                      <Text
                        style={[
                          localStyles.filterPillText,
                          discoverFilters.diets.includes(option.value) &&
                            localStyles.filterPillTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={localStyles.filtersSection}>
                {filterSectionTitle(t("discover.smoking"))}
                <View style={localStyles.filtersPillRow}>
                  {(
                    [
                      { value: "all", label: t("discover.smokingAll") },
                      { value: "no", label: t("discover.smokingNo") },
                      {
                        value: "occasionally",
                        label: t("discover.smokingSometimes"),
                      },
                      { value: "yes", label: t("discover.smokingYes") },
                    ] as const
                  ).map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        localStyles.filterPill,
                        discoverFilters.smoking === option.value &&
                          localStyles.filterPillActive,
                      ]}
                      onPress={() =>
                        setDiscoverFilters((prev) => ({
                          ...prev,
                          smoking: option.value,
                        }))
                      }
                    >
                      <Text
                        style={[
                          localStyles.filterPillText,
                          discoverFilters.smoking === option.value &&
                            localStyles.filterPillTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={localStyles.filtersFooter}>
              <TouchableOpacity
                style={localStyles.filtersSecondaryButton}
                onPress={() => {
                  setDiscoverFilters(DEFAULT_FILTERS);
                  setAnswerFilters({});
                }}
              >
                <Text style={localStyles.filtersSecondaryButtonText}>
                  {locale === "en" ? "Reset" : "Restablecer"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={localStyles.filtersPrimaryButton}
                onPress={() => setIsFiltersVisible(false)}
              >
                <Text style={localStyles.filtersPrimaryButtonText}>
                  {locale === "en" ? "See profiles" : "Ver perfiles"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        </AnimatedSheetModal>

        <UserProfileSheet
          visible={showProfileSheet}
          enableSwipe={!viewingHistory}
          actionPending={swipeMutation.isPending}
          profile={selectedProfileForSheet}
          nextProfile={
            nextSelectedProfile
              ? { ...nextSelectedProfile, id: String(nextSelectedProfile.id) }
              : null
          }
          onClose={() => {
            setShowProfileSheet(false);
            setViewingHistory(false);
          }}
          closeIconName="chevron-back"
          onImagePress={(_image, index) =>
            selectedProfile
              ? openGallery(
                  selectedProfile.images || [selectedProfile.image],
                  index ?? 0
                )
              : undefined
          }
          onContactPress={
            !viewingHistory || selectedHistoryProfileCanConnect
              ? () => connectProfile(selectedProfile)
              : undefined
          }
          nextActionLabel={
            viewingHistory && nextSelectedProfile ? "Siguiente perfil" : undefined
          }
          onNextActionPress={
            viewingHistory && nextSelectedProfile
              ? () => setSelectedProfile(nextSelectedProfile)
              : undefined
          }
          secondaryActionLabel={viewingHistory ? undefined : "Pasar"}
          onSecondaryActionPress={
            viewingHistory
              ? undefined
              : () => dismissProfile(selectedProfile)
          }
        />

        {showHeader ? (
          <View style={localStyles.header}>
            <Text style={localStyles.title}>{t("discover.title")}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`${t("discover.filters")}${activeFilterCount ? `, ${activeFilterCount} activos` : ""}`}
              style={localStyles.headerFiltersButton}
              activeOpacity={0.84}
              onPress={() => setIsFiltersVisible(true)}
            >
              <Icon name="options-outline" size={28} color={vibesTheme.colors.accentMustard} />
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={localStyles.discoverySections}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: showHistory, expanded: showHistory }}
            style={[localStyles.filtersButton, showHistory && localStyles.historyButtonActive]}
            onPress={() => {
              setShowHistory((current) => !current);
              setShowSpiritualPaths(false);
              setViewingHistory(false);
            }}
          >
            <Icon name="mail-outline" size={18} color={vibesTheme.colors.primaryText} />
            <Text style={localStyles.filtersButtonText}>Solicitudes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: showSpiritualPaths, expanded: showSpiritualPaths }}
            style={[localStyles.filtersButton, showSpiritualPaths && localStyles.historyButtonActive]}
            onPress={() => {
              if (!showSpiritualPaths) {
                setDiscoverFilters((previous) => ({ ...previous, spiritualPaths: [] }));
              }
              setShowSpiritualPaths((current) => !current);
              setShowHistory(false);
              setViewingHistory(false);
            }}
          >
            <Icon name="leaf-outline" size={18} color={vibesTheme.colors.primaryText} />
            <Text style={localStyles.filtersButtonText}>Camino espiritual</Text>
          </TouchableOpacity>
        </View>

        {showSpiritualPaths ? (
          <DiscoverPathCards
            selected={discoverFilters.spiritualPaths}
            onToggle={toggleSpiritualPath}
            onClear={() => setDiscoverFilters((previous) => ({ ...previous, spiritualPaths: [] }))}
          />
        ) : null}

        {showHistory ? (
          <View style={localStyles.historyModeRow}>
            {([
              { mode: "liked", label: "Enviadas", icon: "paper-plane-outline" },
              { mode: "incoming", label: "Recibidos", icon: "mail-open-outline" },
              { mode: "dismissed", label: "Descartados", icon: "close" },
            ] as const).map(({ mode, label, icon }) => (
              <TouchableOpacity
                key={mode}
                accessibilityRole="button"
                accessibilityState={{ selected: historyMode === mode }}
                style={[localStyles.historyModeButton, historyMode === mode && localStyles.historyModeButtonActive]}
                onPress={() => setHistoryMode(mode)}
              >
                <Icon name={icon} size={16} color={vibesTheme.colors.primaryText} />
                <Text style={localStyles.historyModeText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <View style={localStyles.orbitWrap}>
          {(showHistory
            ? historyMode === "incoming"
              ? incomingLikes.isLoading
              : swipeHistory.isLoading
            : isLoading) ? (
            <View style={localStyles.emptyState}>
              <VibesLoader size={86} />
              <Text style={localStyles.emptyText}>
                {t("discover.loadingProfiles")}
              </Text>
            </View>
          ) : !showHistory && isError ? (
            <View style={localStyles.emptyState}>
              <Text style={localStyles.emptyTitle}>
                {t("discover.loadFailed")}
              </Text>
              <Text style={localStyles.emptyText}>{errorMessage}</Text>
            </View>
          ) : visibleProfiles.length === 0 ? (
            <View style={localStyles.emptyState}>
              <View style={localStyles.emptyIconCircle}>
                <Icon name="compass-outline" size={34} color={vibesTheme.colors.primaryText} />
              </View>
              <Text style={localStyles.emptyTitle}>
                No hay perfiles para mostrar
              </Text>
              <Text style={localStyles.emptyText}>
                {showHistory
                  ? historyMode === "dismissed"
                    ? "Todavía no descartaste ningún perfil."
                    : historyMode === "liked"
                      ? "Todavía no elegiste ningún perfil para conectar."
                      : "Todavía nadie indicó que quiere conectar con vos."
                  : activeFilterCount > 0
                  ? "Probá ampliando tus filtros para encontrar más personas."
                  : "Ya viste los perfiles disponibles. Volvé pronto para descubrir personas nuevas."}
              </Text>
              {!showHistory && activeFilterCount > 0 ? (
                <TouchableOpacity
                  style={localStyles.emptyActionButton}
                  activeOpacity={0.84}
                  onPress={() => {
                    setDiscoverFilters(DEFAULT_FILTERS);
                    setAnswerFilters({});
                  }}
                >
                  <Text style={localStyles.emptyActionText}>
                    Limpiar filtros
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <>
              <DiscoverOrbitCanvas
                users={visibleProfiles}
                onUserPress={(profile) => {
                  setSelectedProfile(profile);
                  setViewingHistory(showHistory);
                  setShowProfileSheet(true);
                }}
                onDismissedUserPress={(profile) => {
                  setSelectedProfile(profile);
                  setViewingHistory(showHistory);
                  setShowProfileSheet(true);
                }}
              />
              {canShowMoreProfiles ? (
                <TouchableOpacity
                  style={localStyles.showMoreButton}
                  activeOpacity={0.86}
                  onPress={() =>
                    setProfilePage((page) => (page + 1) % pageCount)
                  }
                >
                  <Text style={localStyles.showMoreButtonText}>
                    Mostrar 10 más
                  </Text>
                </TouchableOpacity>
              ) : null}
              {canvasProfiles.length === 0 ? (
                <View style={localStyles.orbitHint}>
                  <Text style={localStyles.emptyTitle}>
                    {t("discover.noProfiles")}
                  </Text>
                  <Text style={localStyles.emptyText}>
                    {t("discover.noProfilesHint")}
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
});

DiscoverContent.displayName = "DiscoverContent";

const Discover = () => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: vibesTheme.colors.background,
        paddingBottom: getBottomTabContentPadding(insets.bottom, 118),
      }}
    >
      <DiscoverContent />
    </View>
  );
};

const localStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: vibesTheme.colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  discoverySections: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerFiltersButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: TEXT_PRIMARY,
    fontSize: 32,
    lineHeight: 38,
    fontFamily: vibesTheme.fonts.thin,
    textAlign: "left",
  },
  filtersButton: {
    flexShrink: 0,
    minHeight: 48,
    paddingVertical: 8,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(110, 110, 110, 0.30)",
    backgroundColor: "transparent",
    paddingHorizontal: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  filtersButtonText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 15,
    fontFamily: vibesTheme.fonts.semibold,
  },
  filtersCountBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  filtersCountText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 12,
    fontFamily: vibesTheme.fonts.bold,
  },
  orbitWrap: {
    flex: 1,
  },
  showMoreButton: {
    alignSelf: "center",
    marginVertical: 8,
    minHeight: 48,
    borderRadius: 23,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(254, 254, 253, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.38)",
    shadowColor: vibesTheme.colors.secondaryText,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  showMoreButtonText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 16,
    fontFamily: vibesTheme.fonts.bold,
  },
  orbitHint: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 24,
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    backgroundColor: "rgba(110, 110, 110, 0.10)",
  },
  emptyTitle: {
    color: vibesTheme.colors.primaryText,
    fontSize: 24,
    fontFamily: vibesTheme.fonts.thin,
    textAlign: "center",
  },
  emptyText: {
    marginTop: 10,
    color: "rgba(43, 43, 43, 0.7)",
    fontSize: 16,
    lineHeight: 22,
    fontFamily: vibesTheme.fonts.medium,
    textAlign: "center",
  },
  emptyActionButton: {
    marginTop: 22,
    minHeight: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    backgroundColor: vibesTheme.colors.accentBlue,
  },
  emptyActionText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: vibesTheme.fonts.bold,
  },
  filtersSheet: {
    backgroundColor: vibesTheme.colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    maxHeight: "88%",
  },
  filtersHandle: {
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(43, 43, 43, 0.18)",
    alignSelf: "center",
    marginBottom: 18,
  },
  filtersHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  filtersHeaderText: {
    flex: 1,
  },
  filtersTitle: {
    color: vibesTheme.colors.primaryText,
    fontSize: 30,
    fontFamily: vibesTheme.fonts.semibold,
  },
  filtersSubtitle: {
    marginTop: 4,
    color: vibesTheme.colors.secondaryText,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.subtitle,
  },
  filtersCloseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(110, 110, 110, 0.13)",
  },
  filtersContent: {
    paddingVertical: 8,
    gap: 18,
  },
  filtersSection: {
    gap: 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(110, 110, 110, 0.30)",
  },
  rangeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rangeSummary: {
    color: "rgba(43, 43, 43, 0.78)",
    fontSize: 15,
    fontFamily: vibesTheme.fonts.semibold,
  },
  rangeReset: {
    color: vibesTheme.colors.primaryText,
    fontSize: 14,
    fontFamily: vibesTheme.fonts.bold,
  },
  rangeRow: {
    flexDirection: "row",
    gap: 10,
  },
  rangeCard: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: "rgba(110, 110, 110, 0.30)",
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 2,
  },
  rangeLabel: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 13,
    fontFamily: vibesTheme.fonts.semibold,
  },
  rangeControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rangeValue: {
    flex: 1,
    textAlign: "center",
    color: vibesTheme.colors.primaryText,
    fontSize: 16,
    fontFamily: vibesTheme.fonts.bold,
  },
  rangeInput: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: vibesTheme.colors.background,
    color: vibesTheme.colors.primaryText,
    fontSize: 17,
    fontFamily: vibesTheme.fonts.bold,
    textAlign: "left",
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  filtersSectionTitle: {
    color: vibesTheme.colors.primaryText,
    fontSize: 22,
    fontFamily: vibesTheme.fonts.semibold,
  },
  filtersPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  filterPill: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(110, 110, 110, 0.30)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: vibesTheme.colors.background,
  },
  filterPillActive: {
    backgroundColor: "rgba(228, 183, 110, 0.37)",
    borderColor: vibesTheme.colors.accentMustard,
  },
  filterPillText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 14,
    fontFamily: vibesTheme.fonts.semibold,
  },
  filterPillTextActive: {
    color: vibesTheme.colors.primaryText,
  },
  filtersFooter: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(110, 110, 110, 0.30)",
  },
  filtersSecondaryButton: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 12,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.background,
  },
  filtersSecondaryButtonText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 15,
    fontFamily: vibesTheme.fonts.semibold,
  },
  filtersPrimaryButton: {
    flex: 1.6,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  filtersPrimaryButtonText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 15,
    fontFamily: vibesTheme.fonts.semibold,
  },
  historyButtonActive: {
    backgroundColor: "rgba(228, 183, 110, 0.36)",
    borderColor: vibesTheme.colors.accentMustard,
  },
  historyModeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  historyModeButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(110, 110, 110, 0.30)",
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  historyModeButtonActive: {
    backgroundColor: "rgba(228, 183, 110, 0.43)",
    borderColor: vibesTheme.colors.accentMustard,
  },
  historyModeText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 14,
    fontFamily: vibesTheme.fonts.semibold,
  },
});

export default Discover;
