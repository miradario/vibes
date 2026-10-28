import ActiveCommunityFilters from "../components/ActiveCommunityFilters";
import { defaultCommunities } from "../src/lib/communities";
import { useMeetPeople } from "../src/queries/meetPeople.queries";
import { useDiscoveryRefresh } from "../src/hooks/useDiscoveryRefresh";
import RangeSlider from "../components/RangeSlider";
import { normalizeRangeBounds } from "../src/lib/rangeSlider";
import CountrySelector from "../components/CountrySelector";
import { hasProfilePhotos, comparePhotoPriority } from "../src/lib/profilePhotos";
import PhotoViewer from "../components/PhotoViewer";
import { getNextProfile } from "../src/lib/profileSwipe";
import { supabase } from "../src/lib/supabase";
import { DISCOVER_ANSWER_FILTER_FIELDS as ANSWER_FILTER_FIELDS, readDiscoverAnswerFilters } from "../src/lib/discoverFilterOptions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { matchesDatingPreferences } from "../supabase/functions/vibi-chat/dating";
import {
  matchesDiscoverAnswers,
  type DiscoverAnswerFilters,
} from "../src/lib/discoverAnswerFilters";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getBottomTabBarHeight,
  getBottomTabContentPadding,
} from "../src/lib/tabBarLayout";
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
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, TextInput } from "../components/Typography";
import { useNavigation, useIsFocused, useRoute } from "@react-navigation/native";
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
import DiscoverFiltersGuide from "../components/DiscoverFiltersGuide";
import { markFtuxAction } from "../src/ftux/ftuxStore";
import {
  useCandidatesQuery,
  useIncomingLikeCandidatesQuery,
  useSwipeHistoryCandidatesQuery,
} from "../src/queries/candidates.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useUserPreferencesQuery, userPreferencesKeys } from "../src/queries/userPreferences.queries";
import { useQueryClient } from "@tanstack/react-query";
import { upsertUserPreferences } from "../src/lib/userPreferencesStore";
import { useMatchesQuery } from "../src/queries/matches.queries";
import { useReconnectRequests } from "../src/queries/reconnect.queries";
import { useSwipeMutation } from "../src/queries/swipes.mutations";
import { handleApiError } from "../src/utils/handleApiError";
import { useI18n } from "../src/i18n";
import { vibesTheme } from "../src/theme/vibesTheme";
import { calculateAgeFromBirthDate } from "../src/lib/birthDate";
import VibesLoader from "../components/VibesLoader";
import { showToast } from "../src/utils/toast";

type DiscoverGender = "woman" | "man" | "other";

type DiscoverFiltersState = {
  ageMin: number | null;
  ageMax: number | null;
  distanceMinKm: number | null;
  maxDistanceKm: number | null;
  genders: DiscoverGender[];
  spiritualPaths: string[];
};

const DEFAULT_FILTERS: DiscoverFiltersState = {
  ageMin: null,
  ageMax: null,
  distanceMinKm: null,
  maxDistanceKm: null,
  genders: [],
  spiritualPaths: [],
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

    // An explicit unrestricted selection overrides legacy default gender IDs.
    if (["all", "todos", "todas"].includes(normalized)) return "unknown";

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
  left.spiritualPaths.length === right.spiritualPaths.length &&
  left.spiritualPaths.every((path) => right.spiritualPaths.includes(path));

const readStoredFiltersRaw = (
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
  spiritualPaths: readDiscoverSpiritualPaths(
    preferences?.discoverSpiritualPaths ?? preferences?.discover_spiritual_paths ?? defaultCommunities(preferences)
  ),

});

const readStoredFilters = (preferences: Record<string, any> | null): DiscoverFiltersState => {
  const stored = readStoredFiltersRaw(preferences);
  const [ageMin, ageMax] = normalizeRangeBounds(stored.ageMin, stored.ageMax, MIN_DISCOVER_AGE, MAX_DISCOVER_AGE);
  const [distanceMinKm, maxDistanceKm] = normalizeRangeBounds(stored.distanceMinKm, stored.maxDistanceKm, 0, 999);
  return { ...stored, ageMin, ageMax, distanceMinKm, maxDistanceKm };
};

export const DiscoverContent = forwardRef<
  DiscoverContentHandle,
  DiscoverContentProps
>(({ showHeader = true, onFilterCountChange }, ref) => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const route = useRoute();
  const incomingRequestKey = (route.params as { incomingRequestKey?: number } | undefined)?.incomingRequestKey;
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
        .select("discover_answer_filters, discover_diets, discover_smoking")
        .eq("user_id", userId)
        .maybeSingle(),
      AsyncStorage.getItem(`discover_answer_filters:${userId}`),
    ])
      .then(([remote, raw]) => {
        if (remote.error) throw remote.error;
        if (!active) return;
        const parsed =
          remote.data?.discover_answer_filters ?? (raw ? JSON.parse(raw) : {});
        const valid = readDiscoverAnswerFilters(parsed, remote.data ?? {});
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
        void queryClient.invalidateQueries({ queryKey: userPreferencesKeys.byUser(answerFiltersOwner) });
      })().catch((error) => {
        console.warn("discover_answer_filters:persist_error", error);
        showToast("No se pudieron guardar los filtros");
      });
    }, 350);
    return () => clearTimeout(timeout);
  }, [answerFilters, answerFiltersOwner, session?.user?.id]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSpiritualPaths, setShowSpiritualPaths] = useState(false);
  const [historyMode, setHistoryMode] = useState<
    "dismissed" | "liked" | "incoming"
  >("liked");
  const focused = useIsFocused();
  const { enabled: meetPeopleEnabled } = useMeetPeople();
  const { data: ownProfileData } = useProfileQuery(session?.user?.id);
  const { data: userPreferences, isFetched: hasFetchedUserPreferences } =
    useUserPreferencesQuery(session?.user?.id);
  const [discoverFilters, setDiscoverFilters] =
    useState<DiscoverFiltersState>(DEFAULT_FILTERS);
  const {
    data: candidates = [],
    isLoading,
    refetch: refetchCandidates,
  } = useCandidatesQuery({
    limit: 200,
  }, true, meetPeopleEnabled && focused && !showHistory, {
    min: discoverFilters.ageMin,
    max: discoverFilters.ageMax,
  });
  // Preview URLs must never grant access to sharp photos.
  const canViewProfilePhotos = hasProfilePhotos(ownProfileData);
  const swipeHistory = useSwipeHistoryCandidatesQuery(meetPeopleEnabled && focused && showHistory && historyMode !== "incoming", true);
  const matches = useMatchesQuery();
  const matchedUserIds = useMemo(
    () => new Set((matches.data ?? []).map((match) => match.otherUserId)),
    [matches.data]
  );
  const incomingLikes = useIncomingLikeCandidatesQuery(meetPeopleEnabled && focused && showHistory && historyMode === "incoming", true);
  const swipeMutation = useSwipeMutation();
  const reconnect = useReconnectRequests(focused && showHistory && historyMode === "liked");
  const swipeBusy = useRef(false);
  const pendingNextProfile = useRef<{ fromId: string; next: DataT | null } | null>(null);
  useEffect(() => {
    if (!meetPeopleEnabled) navigation.navigate("Home" as never);
  }, [meetPeopleEnabled, navigation]);
  const refetchHistory = swipeHistory.refetch;
  const refetchIncoming = incomingLikes.refetch;
  const activeRefetch = showHistory ? (historyMode === "incoming" ? refetchIncoming : refetchHistory) : refetchCandidates;
  const refreshContext = JSON.stringify([session?.user?.id, showHistory ? historyMode : "discover", discoverFilters.ageMin, discoverFilters.ageMax]);
  const profileRefresh = useDiscoveryRefresh(refreshContext, focused, meetPeopleEnabled && Boolean(session?.user?.id), activeRefetch);
  const resumeAfterMatch = useRef<DataT | null>(null);
  useEffect(() => {
    if (focused && resumeAfterMatch.current) {
      setSelectedProfile(resumeAfterMatch.current);
      setShowProfileSheet(true);
      resumeAfterMatch.current = null;
    }
  }, [focused]);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [hasHydratedStoredFilters, setHasHydratedStoredFilters] =
    useState(false);
  const [selectedProfile, setSelectedProfile] = useState<DataT | null>(null);
  const [profileOpenKey, setProfileOpenKey] = useState(0);
  const [hiddenProfileIds, setHiddenProfileIds] = useState<Set<string>>(
    new Set()
  );
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [viewingHistory, setViewingHistory] = useState(false);
  useEffect(() => {
    // Ticks "Mirar perfiles en Descubrir" in Vibi's first steps checklist.
    if (showProfileSheet) void markFtuxAction(session?.user?.id, "viewedProfile");
  }, [showProfileSheet, session?.user?.id]);
  useEffect(() => {
    if (!incomingRequestKey) return;
    setHistoryMode("incoming");
    setShowHistory(true);
    void refetchIncoming();
  }, [incomingRequestKey, refetchIncoming]);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const [profilePage, setProfilePage] = useState(0);
  const ownProfileRecord = (ownProfileData ?? null) as Record<
    string,
    any
  > | null;
  const hasLocation = Boolean(ownProfileRecord?.hasLocation);

  const profiles = useMemo<DataT[]>(() => {
    return candidates
      .filter(
        (candidate) =>
          String(candidate.id) !== session?.user?.id &&
          !hiddenProfileIds.has(String((candidate as Record<string, any>).id))
      )
      .map((candidate) => {
        const candidateRecord = candidate as Record<string, any>;
        // Distance is computed server-side (get_discovery_candidates).
        const distanceKm =
          typeof candidateRecord.distanceKm === "number" ? candidateRecord.distanceKm : null;

        return {
          ...candidateRecord,
          photos: candidateRecord.photos,
          hasProfilePhoto: candidateRecord.hasProfilePhoto as boolean | undefined,
          distanceKm: distanceKm ?? undefined,
        };
      })
      .filter((candidate) => {
        const candidateRecord = candidate as Record<string, any>;
        if (!matchesDatingPreferences(userPreferences ?? {}, candidateRecord)) return false;
        const candidateAge = parseAge(
          candidateRecord.age ??
            candidateRecord.birthDate ??
            candidateRecord.birth_date
        );
        const candidateGender = normalizeGender(
          candidateRecord.gender ??
            candidateRecord.genderLabel ??
            candidateRecord.gender_label,
          candidateRecord.genderId ?? candidateRecord.gender_id
        );

        // Hidden ages come back as null; those profiles were already
        // filtered by age on the server.
        const ageCheckedOnServer =
          candidateAge === null && Boolean(candidateRecord.ageHidden) && Boolean(candidateRecord.ageFilteredServerSide);
        if (
          !ageCheckedOnServer &&
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

        if (!matchesDiscoverAnswers(candidateRecord, answerFilters))
          return false;

        return matchesDiscoverSpiritualPaths(
          candidate,
          discoverFilters.spiritualPaths
        );
      })
      .sort((left, right) =>
        comparePhotoPriority(left, right) || compareDiscoveryProfiles(userPreferences ?? {}, left, right)
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
    canViewProfilePhotos,
  ]);

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
            : candidate.swipeDirection === "like" && !matchedUserIds.has(candidate.id)
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
    [historyMode, incomingLikes.data, swipeHistory.data, canViewProfilePhotos, matchedUserIds]
  );
  const waitingForProfiles = profileRefresh.phase === "loading";
  const profileLoadFailed = profileRefresh.phase === "error";
  const retryProfiles = profileRefresh.retry;
  const canvasProfiles = showHistory ? historyProfiles : profiles;
  const nextSelectedProfile = useMemo(() => {
    if (!selectedProfile) return null;
    return getNextProfile(canvasProfiles, selectedProfile.id, pendingNextProfile.current);
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
      showHistory && historyMode === "incoming"
        ? canvasProfiles
        : canvasProfiles.slice(
            currentPage * DISCOVER_PAGE_SIZE,
            (currentPage + 1) * DISCOVER_PAGE_SIZE
          ),
    [canvasProfiles, currentPage, historyMode, showHistory]
  );
  const canShowMoreProfiles =
    pageCount > 1 && !(showHistory && historyMode === "incoming");
  const activeFilterCount = useMemo(
    () =>
      [
        discoverFilters.ageMin !== null || discoverFilters.ageMax !== null,
        hasLocation &&
          (discoverFilters.distanceMinKm !== null ||
            discoverFilters.maxDistanceKm !== null),
        discoverFilters.genders.length > 0,
        discoverFilters.spiritualPaths.length > 0,
      ].filter(Boolean).length +
      Object.values(answerFilters).filter((values) => values.length > 0).length,
    [discoverFilters, hasLocation, answerFilters]
  );

  const appliedFilterChips: { id: string; label: string; remove: () => void }[] = [];
  if (discoverFilters.ageMin !== null || discoverFilters.ageMax !== null) appliedFilterChips.push({ id: "age", label: discoverFilters.ageMin !== null && discoverFilters.ageMax !== null ? `${discoverFilters.ageMin}–${discoverFilters.ageMax} años` : discoverFilters.ageMin !== null ? `Desde ${discoverFilters.ageMin} años` : `Hasta ${discoverFilters.ageMax} años`, remove: () => setDiscoverFilters(p => ({ ...p, ageMin: null, ageMax: null })) });
  if (hasLocation && (discoverFilters.distanceMinKm !== null || discoverFilters.maxDistanceKm !== null)) appliedFilterChips.push({ id: "distance", label: discoverFilters.distanceMinKm !== null && discoverFilters.maxDistanceKm !== null ? `${discoverFilters.distanceMinKm}–${discoverFilters.maxDistanceKm} km` : discoverFilters.maxDistanceKm !== null ? `Hasta ${discoverFilters.maxDistanceKm} km` : `Desde ${discoverFilters.distanceMinKm} km`, remove: () => setDiscoverFilters(p => ({ ...p, distanceMinKm: null, maxDistanceKm: null })) });
  if (discoverFilters.genders.length) appliedFilterChips.push({ id: "genders", label: discoverFilters.genders.map(g => t(g === "man" ? "discover.genderMan" : g === "woman" ? "discover.genderWoman" : "discover.genderOther")).join(" · "), remove: () => setDiscoverFilters(p => ({ ...p, genders: [] })) });
  for (const [key, values] of Object.entries(answerFilters)) {
    if (!values.length) continue;
    const label = ANSWER_FILTER_FIELDS.find(field => field.key === key)?.label ?? ({ nationalityCode: "Nacionalidad" }[key] ?? key);
    appliedFilterChips.push({ id: `answer-${key}`, label: `${label}: ${values.join(" · ")}`, remove: () => setAnswerFilters(p => ({ ...p, [key]: [] })) });
  }

  useEffect(() => {
    onFilterCountChange?.(activeFilterCount);
  }, [activeFilterCount, onFilterCountChange]);

  useEffect(() => {
    setProfilePage(0);
  }, [discoverFilters, answerFilters, hiddenProfileIds, showHistory, historyMode]);

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
        discover_diets: [],
        discover_spiritual_paths: discoverFilters.spiritualPaths,
        discover_smoking: "all",
      }).then(() => queryClient.invalidateQueries({ queryKey: userPreferencesKeys.byUser(userId) })).catch((persistError) => {
        console.warn("discover_filters:persist_error", persistError);
      });
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [discoverFilters, hasHydratedStoredFilters, session?.user?.id]);

  const openGallery = (images: any[] | undefined, initialIndex = 0) => {
    if (!canViewProfilePhotos || !images || images.length === 0) return;
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
    pendingNextProfile.current = { fromId: id, next };
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
      pendingNextProfile.current = null;
      swipeBusy.current = false;
    }
  };
  const reconnectSelected = viewingHistory && historyMode === "liked";
  const reconnectSent = Boolean(selectedProfile && reconnect.requests.data?.includes(String(selectedProfile.id)));
  const sendReconnect = async () => {
    if (!selectedProfile || reconnect.mutation.isPending || reconnectSent) return;
    try {
      const result = await reconnect.mutation.mutateAsync(String(selectedProfile.id));
      showToast(result === "queued" ? "Recordatorio enviado. Solo podés reconectar una vez con esta persona."
        : result === "already_sent" ? "Ya enviaste el recordatorio de reconexión."
        : result === "try_later" ? "No se pudo enviar ahora. Intentá otro día."
        : "Esta solicitud ya no permite enviar un recordatorio.");
    } catch (error) {
      handleApiError(error, { toastTitle: "No se pudo enviar el recordatorio. Intentá nuevamente." });
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
        <PhotoViewer visible={showGallery && canViewProfilePhotos} images={galleryImages} initialIndex={galleryInitialIndex} onClose={() => setShowGallery(false)} />

        <AnimatedSheetModal
          visible={isFiltersVisible}
          onClose={() => setIsFiltersVisible(false)}
          offsetY={120}
          sheetInDelay={0}
          sheetInDuration={140}
          sheetInOpacityDuration={100}
          backdropInDuration={100}
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
                {filterSectionTitle(t("discover.gender"))}
                <View style={localStyles.filtersPillRow}>
{(
                    [
                      { value: "all", label: locale === "en" ? "All" : "Todos" },
                      { value: "man", label: t("discover.genderMan") },
                      { value: "woman", label: t("discover.genderWoman") },
                      { value: "other", label: t("discover.genderOther") },
                    ] as const
                  ).map((option) => (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`${t("discover.gender")}: ${option.label}`}
                      accessibilityState={{ selected: option.value === "all" ? discoverFilters.genders.length === 0 : discoverFilters.genders.includes(option.value) }}
                      key={option.value}
                      style={[
                        localStyles.filterPill,
                        { minHeight: 44, paddingHorizontal: 14 },
                        (option.value === "all" ? discoverFilters.genders.length === 0 : discoverFilters.genders.includes(option.value)) &&
                          { backgroundColor: vibesTheme.colors.primaryText },
                      ]}
                      onPress={() =>
                        setDiscoverFilters((prev) => {
                          if (option.value === "all") return { ...prev, genders: [] };
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
                          (option.value === "all" ? discoverFilters.genders.length === 0 : discoverFilters.genders.includes(option.value)) &&
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
                <RangeSlider label={t("discover.age")} minimum={MIN_DISCOVER_AGE} maximum={MAX_DISCOVER_AGE}
                  lower={discoverFilters.ageMin} upper={discoverFilters.ageMax} unit={locale === "en" ? "years" : "años"}
                  noLimitLabel={t("discover.noLimit")}
                  onChange={(lower, upper) => {
                    const [ageMin, ageMax] = normalizeRangeBounds(lower, upper, MIN_DISCOVER_AGE, MAX_DISCOVER_AGE);
                    setDiscoverFilters(previous => ({ ...previous, ageMin, ageMax }));
                  }}
                  onClear={() => setDiscoverFilters(previous => ({ ...previous, ageMin: null, ageMax: null }))} />
              </View>
              {hasLocation ? <View style={localStyles.filtersSection}>
                <RangeSlider label={t("discover.distance")} minimum={0} maximum={999}
                  lower={discoverFilters.distanceMinKm} upper={discoverFilters.maxDistanceKm} unit="km"
                  noLimitLabel={t("discover.noLimit")}
                  onChange={(lower, upper) => {
                    const [distanceMinKm, maxDistanceKm] = normalizeRangeBounds(lower, upper, 0, 999);
                    setDiscoverFilters(previous => ({ ...previous, distanceMinKm, maxDistanceKm }));
                  }}
                  onClear={() => setDiscoverFilters(previous => ({ ...previous, distanceMinKm: null, maxDistanceKm: null }))} />
              </View> : null}

              <View style={localStyles.filtersSection}>
                {filterSectionTitle(locale.startsWith("en") ? "Nationality" : "Nacionalidad")}
                <Text style={localStyles.filtersSubtitle}>
                  {locale.startsWith("en") ? "Choose one or more countries. No selection shows everyone." : "Podés elegir varios países. Sin selección, se muestran todos."}
                </Text>
                <CountrySelector multiple selected={answerFilters.nationalityCode ?? []}
                  onChange={codes => setAnswerFilters(previous => ({ ...previous, nationalityCode: codes }))} />
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
                              color={vibesTheme.colors.surface}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}

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
                <Icon name="arrow-forward" size={24} color={vibesTheme.colors.surface} />
              </TouchableOpacity>
            </View>
          </>
        </AnimatedSheetModal>

        <UserProfileSheet
          blurHiddenPhotos
          key={profileOpenKey}
          visible={showProfileSheet && meetPeopleEnabled && profileRefresh.phase === "ready"}
          enableSwipe={!viewingHistory}
          actionPending={swipeMutation.isPending || reconnect.mutation.isPending}
          contactActionLabel={reconnectSelected ? "Conectar" : undefined}
          contactActionDisabled={reconnectSelected && (reconnectSent || !reconnect.requests.isSuccess || reconnect.requests.isFetching)}
          profile={selectedProfileForSheet}
          nextProfile={
            nextSelectedProfile
              ? { ...nextSelectedProfile, id: String(nextSelectedProfile.id) }
              : null
          }
          onClose={() => {
            setShowProfileSheet(false);
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
            reconnectSelected ? sendReconnect : !viewingHistory || selectedHistoryProfileCanConnect
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
            <Text style={localStyles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{t("discover.title")}</Text>
            <DiscoverFiltersGuide userId={session?.user?.id} opened={isFiltersVisible}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`${t("discover.filters")}${activeFilterCount ? `, ${activeFilterCount} activos` : ""}`}
                style={[localStyles.headerFiltersButton, { width: "auto", paddingHorizontal: 14, flexDirection: "row", gap: 8, borderRadius: 24, backgroundColor: `${vibesTheme.colors.accentBlue}14` }]}
                activeOpacity={0.84}
                onPress={() => setIsFiltersVisible(true)}
              >
                <Icon name="options-outline" size={28} color={vibesTheme.colors.accentBlue} />
                <Text style={{ color: vibesTheme.colors.accentBlue, fontFamily: vibesTheme.fonts.bold, fontSize: 14 }}>{t("discover.filters")}{activeFilterCount ? ` · ${activeFilterCount}` : ""}</Text>
              </TouchableOpacity>
            </DiscoverFiltersGuide>
          </View>
        ) : null}

        <ActiveCommunityFilters selected={discoverFilters.spiritualPaths} onRemove={value=>setDiscoverFilters(previous=>({...previous,spiritualPaths:previous.spiritualPaths.filter(item=>item!==value)}))} onClear={()=>setDiscoverFilters(previous=>({...previous,spiritualPaths:[]}))} style={{paddingHorizontal:16}} />
        {appliedFilterChips.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={localStyles.discoverySections}>
          {appliedFilterChips.map(chip => <TouchableOpacity key={chip.id} accessibilityRole="button" accessibilityLabel={`Quitar filtro: ${chip.label}`} onPress={chip.remove} style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 40, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, backgroundColor: `${vibesTheme.colors.accentBlue}14` }}>
            <Text style={{ color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.semibold, fontSize: 13 }}>{chip.label}</Text><Icon name="close" size={17} color={vibesTheme.colors.accentBlue} />
          </TouchableOpacity>)}
        </ScrollView> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={localStyles.discoverySections}>
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
            <Text style={localStyles.filtersButtonText}>Comunidad</Text>
          </TouchableOpacity>
        </ScrollView>



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
                style={[localStyles.historyModeButton, { flexGrow: label.length }, historyMode === mode && localStyles.historyModeButtonActive]}
                onPress={() => setHistoryMode(mode)}
              >
                <Icon name={icon} size={16} color={vibesTheme.colors.primaryText} />
                <Text style={localStyles.historyModeText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <View style={localStyles.orbitWrap}>
          {profileLoadFailed ? (
            <View style={localStyles.emptyState}>
              <Text style={localStyles.emptyTitle}>{showHistory ? "No pudimos cargar las solicitudes" : "No pudimos cargar los perfiles"}</Text>
              <Text style={localStyles.emptyText}>{profileRefresh.error instanceof Error ? profileRefresh.error.message : "Tocá Reintentar para volver a cargar."}</Text>
              <TouchableOpacity accessibilityRole="button" onPress={retryProfiles} style={{ padding: 16 }}>
                <Text style={{ color: vibesTheme.colors.accentBlue, fontSize: 18 }}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : waitingForProfiles ? (
            <View style={localStyles.emptyState}>
              <VibesLoader size={48} accessibilityLabel="Cargando perfiles" />
            </View>
          ) : !isLoading && visibleProfiles.length === 0 ? (
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
                key={`${refreshContext}:${profileRefresh.attempt}`}
                blurPhotos={!canViewProfilePhotos}
                onRetryPhotos={retryProfiles}
                photoVersion={profileRefresh.attempt}
                loading={false}
                users={visibleProfiles}
                onUserPress={(profile) => {
                  setProfileOpenKey((key) => key + 1);
                  setSelectedProfile(profile);
                  setViewingHistory(showHistory);
                  setShowProfileSheet(true);
                }}
                onDismissedUserPress={(profile) => {
                  setProfileOpenKey((key) => key + 1);
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
              {!isLoading && canvasProfiles.length === 0 ? (
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
        // iOS: sin el +48 de scroll screens; deja ~16pt sobre el tab bar.
        paddingBottom:
          Platform.OS === "ios"
            ? getBottomTabBarHeight() + Math.max(insets.bottom + 8, 18) + 16
            : getBottomTabContentPadding(insets.bottom, 118),
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
    alignItems: "center",
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
    fontSize: 34,
    lineHeight: 42,
    fontFamily: vibesTheme.fonts.extraBold,
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
    borderColor: "rgba(244, 163, 64, 0.38)",
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
    fontFamily: vibesTheme.fonts.regular,
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
    backgroundColor: vibesTheme.colors.primaryText,
  },
  emptyActionText: {
    color: vibesTheme.colors.surface,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: vibesTheme.fonts.bold,
  },
  filtersSheet: {
    backgroundColor: vibesTheme.colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    height: "92%",
    maxHeight: "92%",
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
    marginBottom: 20,
  },
  filtersHeaderText: {
    flex: 1,
  },
  filtersTitle: {
    color: vibesTheme.colors.primaryText,
    fontSize: 38,
    lineHeight: 46,
    fontFamily: vibesTheme.fonts.bold,
  },
  filtersSubtitle: {
    marginTop: 4,
    color: vibesTheme.colors.secondaryText,
    fontSize: 17,
    lineHeight: 24,
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
    paddingTop: 8,
    paddingBottom: 24,
    gap: 24,
  },
  filtersSection: {
    gap: 14,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: `${vibesTheme.colors.secondaryText}26`,
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
    gap: 12,
  },
  rangeCard: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: `${vibesTheme.colors.secondaryText}14`,
    minHeight: 80,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 2,
  },
  rangeLabel: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 15,
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
    backgroundColor: `${vibesTheme.colors.background}00`,
    color: vibesTheme.colors.primaryText,
    fontSize: 21,
    fontFamily: vibesTheme.fonts.bold,
    textAlign: "left",
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  filtersSectionTitle: {
    color: vibesTheme.colors.primaryText,
    fontSize: 26,
    lineHeight: 32,
    fontFamily: vibesTheme.fonts.bold,
  },
  filtersPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  filterPill: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 0,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: `${vibesTheme.colors.secondaryText}14`,
  },
  filterPillActive: {
    backgroundColor: vibesTheme.colors.accentBlue,
    borderColor: vibesTheme.colors.accentBlue,
  },
  filterPillText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 16,
    fontFamily: vibesTheme.fonts.semibold,
  },
  filterPillTextActive: {
    color: vibesTheme.colors.surface,
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
    minHeight: 60,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  filtersPrimaryButtonText: {
    color: vibesTheme.colors.surface,
    fontSize: 20,
    fontFamily: vibesTheme.fonts.semibold,
  },
  historyButtonActive: {
    backgroundColor: "rgba(244, 163, 64, 0.36)",
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
    paddingHorizontal: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(110, 110, 110, 0.30)",
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  historyModeButtonActive: {
    backgroundColor: "rgba(244, 163, 64, 0.43)",
    borderColor: vibesTheme.colors.accentMustard,
  },
  historyModeText: {
    flexShrink: 1,
    color: vibesTheme.colors.primaryText,
    fontSize: 14,
    fontFamily: vibesTheme.fonts.semibold,
  },
});

export default Discover;
