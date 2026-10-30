import { useVibesPointsEnabled } from "../src/featureFlags/useVibesPointsEnabled";
import VibesPointsBadge from "../components/VibesPointsBadge";
import { useMeetPeople } from "../src/queries/meetPeople.queries";
import { hasProfilePhotos } from "../src/lib/profilePhotos";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showToast } from "../src/utils/toast";
import { rankHomeSuggestions } from "../src/lib/homeSuggestions";
import { matchesSavedDiscoverExtras } from "../src/lib/discoverSavedFilters";
import PhotoViewer from "../components/PhotoViewer";
import ProfileMediaImage from "../components/ProfileMediaImage";
import HomeOverview from "../components/HomeOverview";
import FirstHomePreferencesGate from "../components/FirstHomePreferencesGate";
import DailyMoodCard from "../components/DailyMoodCard";
import CompleteProfilePrompt from "../components/CompleteProfilePrompt";
import { useFtuxState } from "../src/ftux/ftuxStore";
import { ownsHomePrompts, suppressesDailyMood } from "../src/ftux/ftuxMachine";
import { useLocalDay } from "../src/hooks/useLocalDay";
import HomeConnectionRequests from "../components/HomeConnectionRequests";
/** @format */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Text } from "../components/Typography";
import { useFocusEffect, useNavigation, useScrollToTop } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import AnimatedSheetModal from "../components/AnimatedSheetModal";
import Avatar from "../components/Avatar";
import UserProfileSheet from "../components/UserProfileSheet";
import type { UserProfileCardData } from "../components/UserProfileCard";
import styles, { DIMENSION_WIDTH } from "../assets/styles";
import Icon from "../components/Icon";
import type { DataT } from "../types";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  mapCandidateToConnectionProfile,
  mapOwnProfileToConnectionProfile,
} from "../src/lib/connectionProfiles";
import { useCandidatesQuery } from "../src/queries/candidates.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useSwipeMutation } from "../src/queries/swipes.mutations";
import { useI18n } from "../src/i18n";
import { supabase } from "../src/lib/supabase";
import { upsertUserPreferences } from "../src/lib/userPreferencesStore";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { getBottomTabContentPadding, TAB_BAR_CONTENT_CLEARANCE } from "../src/lib/tabBarLayout";
import { handleApiError } from "../src/utils/handleApiError";
import { vibesTheme } from "../src/theme/vibesTheme";
import VibesLoader from "../components/VibesLoader";
import { chipHitSlop, chipStyles } from "../components/ui/chipStyles";
import { cardStyles } from "../components/ui/surfaceStyles";
import SectionHeader from "../components/ui/SectionHeader";
import PersonCard from "../components/ui/PersonCard";
import { iconCircleStyle } from "../components/ui/IconCircle";
import { buttonContentColor, buttonLabel, buttonStyle } from "../components/ui/buttonStyles";
import * as ds from "../src/theme/tokens";

type DiscoverFiltersState = {
  ageMin: number | null;
  ageMax: number | null;
  distanceMinKm: number | null;
  maxDistanceKm: number | null;
  gender: "all" | "woman" | "man" | "nonbinary" | "other";
  smoking: "all" | "no" | "occasionally" | "yes";
};

const DEFAULT_FILTERS: DiscoverFiltersState = {
  ageMin: null,
  ageMax: null,
  distanceMinKm: null,
  maxDistanceKm: null,
  gender: "all",
  smoking: "all",
};
const HOME_BOTTOM_PADDING_REDUCTION = 72;
/** Piso del aire inferior de Home sobre la barra (112 = TAB_BAR_CONTENT_CLEARANCE − 6). */
const HOME_MIN_BOTTOM_CLEARANCE = TAB_BAR_CONTENT_CLEARANCE - 6;

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
  return null;
};

const normalizeSmoking = (value: unknown): DiscoverFiltersState["smoking"] => {
  if (typeof value !== "string") return "all";

  const normalized = value.trim().toLowerCase();
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
    normalized.includes("sometimes")
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
): DiscoverFiltersState["gender"] | "unknown" => {
  if (typeof value === "string" && value.trim()) {
    const normalized = value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (["all", "todos", "todas"].includes(normalized)) return "unknown";

    if (["woman", "female", "mujer"].includes(normalized)) return "woman";
    if (["man", "male", "hombre"].includes(normalized)) return "man";
    if (
      ["nonbinary", "non-binary", "no binario", "no binaria"].includes(
        normalized
      )
    ) {
      return "nonbinary";
    }
    if (["other", "otro", "otra", "more", "mas"].includes(normalized)) {
      return "other";
    }
  }

  const parsedGenderId = toFiniteNumber(genderId);
  if (parsedGenderId === 1) return "woman";
  if (parsedGenderId === 2) return "man";
  if (parsedGenderId === 3) return "other";
  if (parsedGenderId === 4) return "nonbinary";
  return "unknown";
};

const getDiscoverGenderId = (gender: DiscoverFiltersState["gender"]) => {
  if (gender === "woman") return 1;
  if (gender === "man") return 2;
  if (gender === "other") return 3;
  if (gender === "nonbinary") return 4;
  return null;
};

const matchesNumberRange = (
  value: number | null,
  min: number | null,
  max: number | null,
  options?: {
    includeNullValue?: boolean;
  }
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
  suffix = ""
) => {
  if (min === null && max === null) return "Cualquiera";
  if (min !== null && max !== null) return `${min}-${max}${suffix}`;
  if (min !== null) return `Desde ${min}${suffix}`;
  return `Hasta ${max}${suffix}`;
};

const formatDistanceLabel = (distanceKm: number | null) => {
  if (distanceKm === null || !Number.isFinite(distanceKm)) return undefined;
  return `${Math.max(1, Math.round(distanceKm))} km`;
};

const getSuggestionHint = (profile: DataT) => {
  const interests = Array.from(new Set([
    ...(profile.spiritualPath ?? []),
    ...(profile.preferences ?? []).map(value => value.split(":").pop()?.trim() ?? ""),
  ].filter(Boolean))).slice(0, 2);
  if (interests.length) return interests.join(" · ");
  if (profile.location) return profile.location;
  return "Afinidad con vos";
};

function PeopleSkeleton() {
  return (
    <View style={{ minHeight: 170, alignItems: "center", justifyContent: "center" }}>
      <VibesLoader size={48} accessibilityLabel="Cargando personas con tu vibe" />
    </View>
  );
}

function HomePeopleSuggestions({
  canViewPhotos,
  profiles,
  loading,
  onOpenProfile,
  onSeeAll,
}: {
  profiles: DataT[];
  canViewPhotos: boolean;
  loading: boolean;
  onOpenProfile: (profile: DataT) => void;
  onSeeAll: () => void;
}) {
  const suggestions = profiles.slice(0, 6);
  if (!suggestions.length && !loading) return null;
  return (
    <View style={localStyles.peopleSection}>
      <SectionHeader title="Personas con tu vibe" accessibilityLabel="Ver personas con tu vibe"
        disabled={loading} onPress={onSeeAll} style={localStyles.peopleHeading} />
      {loading ? <PeopleSkeleton /> : <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={localStyles.peopleCarousel}
      >
        {suggestions.map((profile) => (
          <PersonCard
            key={String(profile.id)}
            name={`${profile.name.split(" ")[0]}${profile.age ? `, ${profile.age}` : ""}`}
            accessibilityLabel={`Ver perfil de ${profile.name}`}
            tag={getSuggestionHint(profile)}
            source={profile.avatarUri ? { uri: profile.avatarUri } : profile.image}
            blurred={!canViewPhotos}
            onPress={() => onOpenProfile(profile)}
          />
        ))}
      </ScrollView>}
    </View>
  );
}

const areFiltersEqual = (
  left: DiscoverFiltersState,
  right: DiscoverFiltersState
) =>
  left.ageMin === right.ageMin &&
  left.ageMax === right.ageMax &&
  left.distanceMinKm === right.distanceMinKm &&
  left.maxDistanceKm === right.maxDistanceKm &&
  left.gender === right.gender &&
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
  gender: (() => {
    const storedGender = normalizeGender(
      preferences?.discoverGender ?? preferences?.discover_gender,
      preferences?.discoverGenderId ?? preferences?.discover_gender_id
    );
    return storedGender === "unknown" ? "all" : storedGender;
  })(),
  smoking: normalizeSmoking(
    preferences?.discoverSmoking ?? preferences?.discover_smoking
  ),
});

const Home = () => {
  const vibesPointsEnabled = useVibesPointsEnabled();
  // Any way of landing on Home (tab press, back, another tab, programmatic
  // navigation) must show it from the top. useScrollToTop covers tapping the
  // Home tab while already on Home; the focus effect covers every return.
  const homeScrollRef = useRef<ScrollView>(null);
  useScrollToTop(homeScrollRef as React.RefObject<ScrollView>);
  useFocusEffect(useCallback(() => {
    homeScrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
    return () => homeScrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
  }, []));
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [moodGateUser, setMoodGateUser] = useState<string | null>(null);
  const { data: session } = useAuthSession();
  const today = useLocalDay();
  // Vibi's first-day welcome (FTUX) replaces that day's mood check-in.
  const ftuxState = useFtuxState(session?.user?.id, session?.user?.created_at);
  const ftuxBlocksMood = suppressesDailyMood(
    ftuxState,
    today,
    Boolean(session?.user?.id) && !ftuxState
  );
  const { enabled: meetPeopleEnabled } = useMeetPeople();
  const { data: ownProfileData } = useProfileQuery(session?.user?.id);
  const { data: userPreferences } = useUserPreferencesQuery(session?.user?.id);
  const [discoverFilters, setDiscoverFilters] =
    useState<DiscoverFiltersState>(DEFAULT_FILTERS);
  const { data: candidates = [], isLoading: candidatesLoading } = useCandidatesQuery(undefined, true, meetPeopleEnabled, {
    min: discoverFilters.ageMin,
    max: discoverFilters.ageMax,
  });
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [hasHydratedStoredFilters, setHasHydratedStoredFilters] =
    useState(false);
  const ownProfileRecord = (ownProfileData ?? null) as Record<
    string,
    any
  > | null;
  const profiles = useMemo<DataT[]>(() => {
    const eligible = candidates
      .map((candidate) => {
        const candidateRecord = candidate as Record<string, any>;
        // Distance is computed server-side (get_discovery_candidates).
        const distanceKm =
          typeof candidateRecord.distanceKm === "number" ? candidateRecord.distanceKm : null;

        return {
          ...candidateRecord,
          distanceKm: distanceKm ?? undefined,
          suggestionAge: parseAge(candidateRecord.age ?? candidateRecord.birthDate ?? candidateRecord.birth_date),
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
            discoverFilters.ageMax,
            { includeNullValue: false }
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
          discoverFilters.gender !== "all" &&
          candidateGender !== discoverFilters.gender
        ) {
          return false;
        }
        if (
          discoverFilters.smoking !== "all" &&
          candidateSmoking !== discoverFilters.smoking
        ) {
          return false;
        }

        return matchesSavedDiscoverExtras(candidateRecord, { ...userPreferences, discoverSpiritualPaths: [] }, candidateGender);
      });
    return rankHomeSuggestions(eligible, {
      ...ownProfileRecord, ...userPreferences,
      suggestionAge: parseAge(ownProfileRecord?.age ?? ownProfileRecord?.birthDate ?? ownProfileRecord?.birth_date),
    }, discoverFilters)
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
        };
      }) as DataT[];
  }, [
    candidates,
    discoverFilters,
    ownProfileRecord,
    userPreferences,
  ]);
  const centerProfile = useMemo<DataT>(
    () =>
      ({
        ...mapOwnProfileToConnectionProfile(
          {
            ...(ownProfileData ?? {}),
            ...(userPreferences ?? {}),
          },
          session?.user?.email?.split("@")[0]
        ),
        match: "0",
      } as DataT),
    [ownProfileData, session?.user?.email, userPreferences]
  );
  const [showGallery, setShowGallery] = useState<boolean>(false);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState<number>(0);
  const [showProfileSheet, setShowProfileSheet] = useState<boolean>(false);
  const [selectedProfile, setSelectedProfile] = useState<DataT | null>(null);
  const [homeProfileQueue, setHomeProfileQueue] = useState<DataT[]>([]);
  const nextHomeProfile = homeProfileQueue[0] ?? null;
  const swipeMutation = useSwipeMutation();
  const firstName =
    (centerProfile.name || session?.user?.email?.split("@")[0] || "miradario")
      .split(" ")[0]
      .trim() || "miradario";
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

  const ageSummary = formatRangeSummary(
    discoverFilters.ageMin,
    discoverFilters.ageMax
  );
  const distanceSummary = formatRangeSummary(
    discoverFilters.distanceMinKm,
    discoverFilters.maxDistanceKm,
    " km"
  );

  useEffect(() => {
    if (!session?.user?.id) {
      setDiscoverFilters(DEFAULT_FILTERS);
      setHasHydratedStoredFilters(true);
      return;
    }

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
  }, [session?.user?.id, userPreferences]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !hasHydratedStoredFilters) return;

    const timeoutId = setTimeout(() => {
      void upsertUserPreferences(userId, {
        discover_age_min: discoverFilters.ageMin,
        discover_age_max: discoverFilters.ageMax,
        discover_distance_min_km: discoverFilters.distanceMinKm,
        discover_distance_max_km: discoverFilters.maxDistanceKm,
        discover_gender: discoverFilters.gender,
        discover_gender_id: getDiscoverGenderId(discoverFilters.gender),
        discover_smoking: discoverFilters.smoking,
      }).catch((persistError) => {
        console.warn("discover_filters:persist_error", persistError);
      });
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [discoverFilters, hasHydratedStoredFilters, session?.user?.id]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    let active = true;

    const syncOwnLocation = async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!active || permission.status !== "granted") return;

        const current = await Location.getCurrentPositionAsync({});
        if (!active) return;

        const [address] = await Location.reverseGeocodeAsync({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
        if (!active) return;

        const city =
          address?.city ?? address?.subregion ?? address?.region ?? null;
        const country = address?.country ?? null;
        const locationLabel =
          [city, country].filter(Boolean).join(", ") || null;
        const currentLatitude = current.coords.latitude;
        const currentLongitude = current.coords.longitude;
        // Raw coordinates are not read back from the server; remember the
        // last synced position on the device instead.
        const syncKey = `own_location_sync:${userId}`;
        const lastSynced = await AsyncStorage.getItem(syncKey)
          .then((raw) => (raw ? (JSON.parse(raw) as { latitude?: unknown; longitude?: unknown }) : null))
          .catch(() => null);
        if (!active) return;
        const storedLatitude = ownProfileRecord?.hasLocation ? toFiniteNumber(lastSynced?.latitude) : null;
        const storedLongitude = ownProfileRecord?.hasLocation ? toFiniteNumber(lastSynced?.longitude) : null;
        const needsSync =
          storedLatitude === null ||
          storedLongitude === null ||
          Math.abs(storedLatitude - currentLatitude) > 0.001 ||
          Math.abs(storedLongitude - currentLongitude) > 0.001 ||
          ownProfileRecord?.locationLabel !== locationLabel;

        if (!needsSync) return;

        // Plain UPDATE: the row exists once the user reaches Home, and an
        // upsert would need read access to the coordinate columns.
        const { error: syncError } = await supabase
          .from("profiles")
          .update({
            country,
            city,
            location_label: locationLabel,
            latitude: currentLatitude,
            longitude: currentLongitude,
          })
          .eq("id", userId);
        if (!syncError) {
          await AsyncStorage.setItem(
            syncKey,
            JSON.stringify({ latitude: currentLatitude, longitude: currentLongitude })
          ).catch(() => undefined);
        }
      } catch (_error) {
        // Keep discover usable even if location sync fails.
      }
    };

    syncOwnLocation();

    return () => {
      active = false;
    };
  }, [
    ownProfileRecord?.hasLocation,
    ownProfileRecord?.locationLabel,
    session?.user?.id,
  ]);

  const openGallery = (images: any[] | undefined, initialIndex = 0) => {
    if (!hasProfilePhotos(ownProfileData) || !images || images.length === 0) return;
    setGalleryImages(images);
    setGalleryInitialIndex(
      initialIndex >= 0 && initialIndex < images.length ? initialIndex : 0
    );
    setShowGallery(true);
  };

  const showProfilesComplete = () => {
    showToast("Has visto todos los perfiles.", {
      type: "info",
      text2: "Sigue explorando Vibes",
      visibilityTime: 4500,
    });
  };

  const connectProfile = async (profile: DataT | null) => {
    if (!profile || swipeMutation.isPending) return false;
    const next = nextHomeProfile;
    try {
      const response = await swipeMutation.mutateAsync({
        targetUserId: String(profile.id),
        direction: "like",
      });
      if (!next) showProfilesComplete();
      if (response?.match) {
        closeProfileSheet();
        navigation.navigate("Match" as never, { profile } as never);
      } else if (next) {
        setSelectedProfile(next);
        setHomeProfileQueue((queue) => queue.slice(1));
      } else {
        closeProfileSheet();
      }
      return true;
    } catch (error) {
      handleApiError(error, { toastTitle: "Error de conexión" });
      return false;
    }
  };

  const dismissProfile = async (profile: DataT | null) => {
    if (!profile || swipeMutation.isPending) return false;
    const next = nextHomeProfile;
    try {
      await swipeMutation.mutateAsync({
        targetUserId: String(profile.id),
        direction: "pass",
      });
      if (next) {
        setSelectedProfile(next);
        setHomeProfileQueue((queue) => queue.slice(1));
      } else {
        closeProfileSheet();
        showProfilesComplete();
      }
      return true;
    } catch (error) {
      handleApiError(error, { toastTitle: "Error al descartar" });
      return false;
    }
  };

  const openProfileSheet = (profile: DataT) => {
    const suggestions = profiles.slice(0, 6);
    const index = suggestions.findIndex((item) => item.id === profile.id);
    setHomeProfileQueue(index >= 0 ? suggestions.slice(index + 1) : []);
    setSelectedProfile(profile);
    setShowProfileSheet(true);
  };

  const closeProfileSheet = () => {
    setShowProfileSheet(false);
  };

  const filterSectionTitle = (title: string) => (
    <Text style={localStyles.filtersSectionTitle}>{title}</Text>
  );

  return (
    <View style={localStyles.screen}>
      <SafeAreaView
        style={localStyles.safeArea}
        edges={["top", "left", "right"]}
      >
        <AnimatedSheetModal
          visible={isFiltersVisible}
          onClose={() => setIsFiltersVisible(false)}
          offsetY={320}
          sheetStyle={localStyles.filtersSheet}
        >
          <>
            <View style={localStyles.filtersHandle} />
            <View style={localStyles.filtersHeader}>
              <View>
                <Text style={localStyles.filtersTitle}>Filtros</Text>
                <Text style={localStyles.filtersSubtitle}>
                  Ajustá qué perfiles querés ver en discover.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsFiltersVisible(false)}
                style={localStyles.filtersCloseButton}
              >
                <Icon name="close" size={ds.iconSize.md} color={vibesTheme.colors.primaryText} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={localStyles.filtersContent}
            >
              <View style={localStyles.filtersSection}>
                {filterSectionTitle("Edad")}
                <View style={localStyles.rangeHeader}>
                  <Text style={localStyles.rangeSummary}>{ageSummary}</Text>
                  <TouchableOpacity
                    onPress={() =>
                      setDiscoverFilters((prev) => ({
                        ...prev,
                        ageMin: null,
                        ageMax: null,
                      }))
                    }
                  >
                    <Text style={localStyles.rangeReset}>Limpiar</Text>
                  </TouchableOpacity>
                </View>
                <View style={localStyles.rangeRow}>
                  <View style={localStyles.rangeCard}>
                    <Text style={localStyles.rangeLabel}>Mínima</Text>
                    <View style={localStyles.rangeControls}>
                      <Text style={localStyles.rangeValue}>
                        {discoverFilters.ageMin ?? "Sin límite"}
                      </Text>
                    </View>
                  </View>
                  <View style={localStyles.rangeCard}>
                    <Text style={localStyles.rangeLabel}>Máxima</Text>
                    <View style={localStyles.rangeControls}>
                      <Text style={localStyles.rangeValue}>
                        {discoverFilters.ageMax ?? "Sin límite"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={localStyles.filtersSection}>
                {filterSectionTitle("Distancia")}
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
                    <Text style={localStyles.rangeReset}>Limpiar</Text>
                  </TouchableOpacity>
                </View>
                <View style={localStyles.rangeRow}>
                  <View style={localStyles.rangeCard}>
                    <Text style={localStyles.rangeLabel}>Mínima</Text>
                    <View style={localStyles.rangeControls}>
                      <Text style={localStyles.rangeValue}>
                        {discoverFilters.distanceMinKm === null
                          ? "Sin límite"
                          : `${discoverFilters.distanceMinKm} km`}
                      </Text>
                    </View>
                  </View>
                  <View style={localStyles.rangeCard}>
                    <Text style={localStyles.rangeLabel}>Máxima</Text>
                    <View style={localStyles.rangeControls}>
                      <Text style={localStyles.rangeValue}>
                        {discoverFilters.maxDistanceKm === null
                          ? "Sin límite"
                          : `${discoverFilters.maxDistanceKm} km`}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={localStyles.filtersSection}>
                {filterSectionTitle("Género")}
                <View style={localStyles.filtersPillRow}>
                  {(
                    [
                      { value: "all", label: "Indistinto" },
                      { value: "woman", label: "Mujer" },
                      { value: "man", label: "Hombre" },
                      { value: "nonbinary", label: "No binario" },
                      { value: "other", label: "Otro" },
                    ] as const
                  ).map((option) => (
                    <TouchableOpacity hitSlop={chipHitSlop}
                      key={option.value}
                      style={[
                        localStyles.filterPill,
                        discoverFilters.gender === option.value &&
                          localStyles.filterPillActive,
                      ]}
                      onPress={() =>
                        setDiscoverFilters((prev) => ({
                          ...prev,
                          gender: option.value,
                        }))
                      }
                    >
                      <Text
                        style={[
                          localStyles.filterPillText,
                          discoverFilters.gender === option.value &&
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
                {filterSectionTitle("Fuma")}
                <View style={localStyles.filtersPillRow}>
                  {(
                    [
                      { value: "all", label: "Indistinto" },
                      { value: "no", label: "No fuma" },
                      { value: "occasionally", label: "A veces" },
                      { value: "yes", label: "Sí fuma" },
                    ] as const
                  ).map((option) => (
                    <TouchableOpacity hitSlop={chipHitSlop}
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
                onPress={() => setDiscoverFilters(DEFAULT_FILTERS)}
              >
                <Text style={localStyles.filtersSecondaryButtonText}>
                  Limpiar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={localStyles.filtersPrimaryButton}
                onPress={() => setIsFiltersVisible(false)}
              >
                <Text style={localStyles.filtersPrimaryButtonText}>
                  Aplicar
                </Text>
              </TouchableOpacity>
            </View>
          </>
        </AnimatedSheetModal>

        <PhotoViewer visible={showGallery && hasProfilePhotos(ownProfileData)} images={galleryImages} initialIndex={galleryInitialIndex} onClose={() => setShowGallery(false)} />

        <UserProfileSheet
          blurHiddenPhotos
          visible={showProfileSheet && meetPeopleEnabled}
          profile={selectedProfileForSheet}
          nextProfile={nextHomeProfile ? { ...nextHomeProfile, id: String(nextHomeProfile.id) } : null}
          actionPending={swipeMutation.isPending}
          onClose={closeProfileSheet}
          onImagePress={(_image, index) =>
            selectedProfile
              ? openGallery(
                  selectedProfile.images || [selectedProfile.image],
                  index ?? 0
                )
              : undefined
          }
          onContactPress={() =>
            selectedProfile ? connectProfile(selectedProfile) : undefined
          }
          secondaryActionLabel="Descartar"
          onSecondaryActionPress={() =>
            selectedProfile ? dismissProfile(selectedProfile) : undefined
          }
        />

        <ScrollView
          ref={homeScrollRef}
          style={localStyles.homeScroll}
          contentContainerStyle={[
            localStyles.homeContent,
            {
              paddingBottom: Math.max(
                getBottomTabContentPadding(insets.bottom) -
                  HOME_BOTTOM_PADDING_REDUCTION,
                HOME_MIN_BOTTOM_CLEARANCE
              ),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={localStyles.heroHeader}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Ir a tu perfil"
              activeOpacity={ds.opacity.pressed}
              onPress={() => navigation.navigate("Aura" as never)}
              style={{ alignItems: "center", gap: ds.spacing[2], minWidth: ds.avatarSize.md }}
            >
              <View style={localStyles.heroAvatarButton}>
              <Avatar
                uri={centerProfile.avatarUri ?? null}
                size={ds.avatarSize.md}
                iconSize={ds.iconSize.lg}
                fallbackBackgroundColor={vibesTheme.colors.background}
                fallbackIconColor={vibesTheme.colors.primaryText}
              />
              </View>
            </TouchableOpacity>
            <View style={localStyles.heroCopy}>
              <Text
                style={localStyles.heroTitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Hola, {firstName}
              </Text>
            </View>
            {vibesPointsEnabled ? <VibesPointsBadge /> : null}
          </View>

          {ownsHomePrompts(ftuxState) ? null : (
            <CompleteProfilePrompt userId={session?.user?.id} />
          )}

          {meetPeopleEnabled ? <HomeConnectionRequests canViewPhotos={hasProfilePhotos(ownProfileData)} /> : null}

          {session?.user?.id ? (
            <FirstHomePreferencesGate
              key={`preferences-${session.user.id}`}
              userId={session.user.id}
              onReady={() => setMoodGateUser(session.user.id)}
            />
          ) : null}
          <DailyMoodCard
            key={`daily-mood-${session?.user?.id ?? "anonymous"}`}
            userId={session?.user?.id}
            enabled={moodGateUser === session?.user?.id && !ftuxBlocksMood}
          />

          <HomeOverview userId={session?.user?.id}>

          {meetPeopleEnabled ? <HomePeopleSuggestions
            canViewPhotos={hasProfilePhotos(ownProfileData)}
            profiles={profiles}
            loading={candidatesLoading && profiles.length === 0}
            onOpenProfile={openProfileSheet}
            onSeeAll={() =>
              navigation.navigate(
                "Tab" as never,
                { screen: "Discover" } as never
              )
            }
          /> : null}
          </HomeOverview>
        </ScrollView>
      </SafeAreaView>
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
  homeScroll: {
    flex: 1,
  },
  homeContent: {
    paddingHorizontal: ds.spacing[5],
    paddingTop: ds.spacing[4],
    paddingBottom: TAB_BAR_CONTENT_CLEARANCE,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
    marginBottom: ds.spacing[2],
  },
  heroAvatarButton: {
    width: ds.avatarSize.md,
    height: ds.avatarSize.md,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.background,
    ...ds.shadows.md,
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.title,
  },
  peopleSection: {
    marginBottom: ds.spacing[6],
  },
  peopleHeading: { marginBottom: ds.spacing[3] },
  peopleCarousel: {
    gap: ds.spacing[3],
    paddingRight: ds.spacing[6],
  },
  peopleSkeletonRow: { flexDirection: "row", overflow: "hidden" },
  personSkeleton: {
    backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle),
    borderColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle),
  },
  skeletonText: { opacity: 0 },
  personAddIcon: {
    backgroundColor: vibesTheme.colors.background,
    borderRadius: ds.radii.lg,
    padding: ds.spacing[2],
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 1,
  },
  featureImage: {
    ...StyleSheet.absoluteFillObject,
    width: "148%",
    height: "148%",
    borderRadius: ds.radii.xl,
    transform: [{ translateX: -58 }, { translateY: -38 }],
  },
  guruFeatureCard: {
    minHeight: 184,
    borderRadius: ds.radii.xl,
    overflow: "hidden",
    marginBottom: ds.spacing[4],
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.medium),
    ...ds.shadows.md,
  },
  guruFeatureBackground: {
    minHeight: 184,
    paddingHorizontal: ds.spacing[6],
    paddingVertical: ds.spacing[4],
    justifyContent: "flex-start",
  },
  featureScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ds.withAlpha(ds.colors.base.paper, ds.opacity.scrim),
  },
  vibesBreathingWrap: {
    position: "absolute",
    top: 48,
    right: 22,
    width: 104,
    height: 104,
    alignItems: "center",
    justifyContent: "center",
  },
  vibesBreathingOuterRing: {
    position: "absolute",
    width: 98,
    height: 98,
    borderRadius: ds.radii.pill,
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  vibesBreathingOrb: {
    width: 76,
    height: 76,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.colors.bg.surfaceTranslucent,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.medium),
    ...ds.glow.accent,
    elevation: ds.shadows.md.elevation,
  },
  vibesBreathingText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.subtitleMedium,
    letterSpacing: 0.3,
  },
  guruBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
    marginBottom: ds.spacing[3],
  },
  guruFeatureBadge: {
    ...iconCircleStyle("sm", "accent"),
  },
  featureEyebrow: {
    color: vibesTheme.colors.accentBlue,
    ...ds.textStyles.caption,
  },
  featureTitle: {
    maxWidth: "62%",
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.title,
  },
  featureBody: {
    maxWidth: "58%",
    marginTop: ds.spacing[2],
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.bodySmall,
  },
  featureOpenRow: {
    marginTop: ds.spacing[3],
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[1],
  },
  featureOpenText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.label,
  },
  dailyGuideSheet: {
    maxHeight: "88%",
    borderTopLeftRadius: ds.radii.xl,
    borderTopRightRadius: ds.radii.xl,
    backgroundColor: vibesTheme.colors.background,
    paddingTop: ds.spacing[3],
    paddingHorizontal: ds.spacing[6],
    paddingBottom: ds.spacing[8],
  },
  dailyGuideHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: ds.radii.pill,
    marginBottom: ds.spacing[4],
    backgroundColor: ds.withAlpha(ds.colors.base.ink, ds.opacity.medium),
  },
  dailyGuideHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
  },
  dailyGuideIcon: {
    width: 48,
    height: 48,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.scrim),
  },
  dailyGuideHeaderCopy: {
    flex: 1,
  },
  dailyGuideEyebrow: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.micro,
  },
  dailyGuideTitle: {
    marginTop: ds.spacing[1],
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.title,
  },
  dailyGuideClose: {
    width: 38,
    height: 38,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.colors.bg.subtle,
  },
  dailyGuideContent: {
    paddingTop: ds.spacing[6],
    paddingBottom: ds.spacing[2],
  },
  dailyGuideIntro: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.body,
  },
  dailyGuideActionsTitle: {
    marginTop: ds.spacing[6],
    marginBottom: ds.spacing[3],
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.heading,
  },
  dailyGuideActionRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
    marginBottom: ds.spacing[3],
    borderRadius: ds.radii.lg,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: ds.colors.bg.selected,
  },
  dailyGuideActionNumber: {
    width: 30,
    height: 30,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.scrim),
  },
  dailyGuideActionNumberText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.label,
  },
  dailyGuideActionText: {
    flex: 1,
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.subtitleMedium,
  },
  dailyGuideDoneButton: {
    marginTop: ds.spacing[4],
  },
  connectionsCard: {
    borderRadius: ds.radii.lg,
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: ds.colors.border.subtle,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[4],
    marginBottom: ds.spacing[4],
    ...ds.shadows.sm,
  },
  connectionsEyebrow: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.caption,
    marginBottom: ds.spacing[1],
  },
  connectionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
  },
  connectionIconCircle: {
    ...iconCircleStyle("md", "neutral"),
    flexShrink: 0,
  },
  connectionsCopy: {
    flex: 1,
    minWidth: 0,
  },
  connectionsText: {
    marginTop: ds.spacing[1],
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.bodySmall,
  },
  connectionsTitle: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.heading,
  },
  challengePreviewCard: {
    ...cardStyles.accent,
    ...cardStyles.padding,
    marginBottom: ds.spacing[4],
  },
  challengePreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
  },
  challengeIconCircle: {
    ...iconCircleStyle("md", "neutral"),
  },
  challengePreviewCopy: {
    flex: 1,
  },
  challengePreviewEyebrow: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.caption,
  },
  challengePreviewTitle: {
    marginTop: ds.spacing[1],
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.heading,
  },
  challengePreviewMeta: {
    marginTop: ds.spacing[1],
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.caption,
  },
  eventPreviewCard: {
    ...cardStyles.accent,
    ...cardStyles.padding,
  },
  eventPreviewEyebrow: {
    color: vibesTheme.colors.accentBlue,
    ...ds.textStyles.label,
    marginBottom: ds.spacing[3],
  },
  eventPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
  },
  eventDateBox: {
    width: 64,
    height: 64,
    borderRadius: ds.radii.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.withAlpha(ds.colors.base.paper, ds.opacity.high),
  },
  eventDateWeekday: {
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.subtitle,
  },
  eventDateDay: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.display,
  },
  eventPreviewCopy: {
    flex: 1,
    minWidth: 0,
  },
  eventPreviewTitle: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.heading,
  },
  eventPreviewMeta: {
    flex: 1,
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.bodySmall,
  },
  eventPreviewMetaRow: {
    marginTop: ds.spacing[2],
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[1],
  },
  eventParticipantsRow: {
    marginTop: ds.spacing[3],
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
  },
  eventParticipantsText: {
    flex: 1,
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.bodySmall,
  },
  summaryCard: {
    minHeight: 116,
    borderRadius: ds.radii.lg,
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: ds.colors.border.subtle,
    ...ds.shadows.md,
    padding: ds.spacing[3],
    marginBottom: ds.spacing[4],
  },
  summaryTitle: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.title,
    marginBottom: ds.spacing[2],
  },
  summaryContent: {
    justifyContent: "center",
  },
  statsRow: {
    gap: ds.spacing[2],
  },
  statItem: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    paddingLeft: 0,
  },
  statDivider: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -3,
    height: ds.componentSize.divider,
    backgroundColor: ds.colors.border.subtle,
  },
  statLead: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    gap: ds.spacing[2],
  },
  statValue: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.title,
  },
  statMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: ds.spacing[3],
    gap: ds.spacing[1],
  },
  statLabel: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.body,
    flexShrink: 1,
  },
  meditationCard: {
    ...cardStyles.info,
    minHeight: 102,
    overflow: "hidden",
    marginBottom: ds.spacing[4],
    position: "relative",
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
    justifyContent: "center",
  },
  meditationArt: {
    position: "absolute",
    right: 14,
    top: 8,
    width: "18%",
    height: "58%",
    opacity: 0.22,
  },
  meditationButtonSurface: {
    minHeight: 78,
    borderRadius: ds.radii.xl,
    paddingHorizontal: ds.spacing[3],
    paddingVertical: ds.spacing[3],
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
  },
  meditationButtonIconWrap: {
    width: 48,
    height: 48,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.withAlpha(ds.colors.base.paper, ds.opacity.high),
    borderWidth: 1,
    borderColor: ds.colors.bg.surfaceTranslucent,
  },
  meditationButtonCopy: {
    flex: 1,
  },
  meditationButtonTitle: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.title,
  },
  meditationButtonSubtitle: {
    marginTop: ds.spacing[1],
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.subtitleMedium,
  },
  meditationArrowWrap: {
    width: 46,
    height: 46,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.withAlpha(ds.colors.base.paper, ds.opacity.high),
    borderWidth: 1,
    borderColor: ds.colors.bg.surfaceTranslucent,
  },
  meditationButtonArrow: {
    marginLeft: ds.spacing[1],
  },
  guruCard: {
    borderRadius: ds.radii.xl,
    backgroundColor: ds.colors.bg.selected,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.medium),
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[4],
    marginBottom: ds.spacing[4],
    ...ds.shadows.md,
  },
  guruCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: ds.spacing[3],
  },
  guruCardHeading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
  },
  guruBadge: {
    ...iconCircleStyle("sm", "accent"),
  },
  guruCopy: {
    flex: 1,
  },
  guruDismissButton: {
    width: 28,
    height: 28,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle),
  },
  guruTitle: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.title,
  },
  guruSubtitle: {
    marginTop: ds.spacing[1],
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.labelMedium,
  },
  guruChallengeName: {
    marginTop: ds.spacing[3],
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.body,
  },
  guruBreathPrompt: {
    marginTop: ds.spacing[3],
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.body,
  },
  guruBody: {
    marginTop: ds.spacing[2],
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.body,
  },
  presenceCard: {
    borderRadius: ds.radii.xl,
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.medium),
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[4],
    marginBottom: ds.spacing[4],
    ...ds.shadows.md,
  },
  presenceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: ds.spacing[3],
  },
  presenceTitle: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.heading,
  },
  presenceSubtitle: {
    marginTop: ds.spacing[1],
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.labelMedium,
  },
  presenceBadge: {
    ...iconCircleStyle("sm", "accent"),
  },
  presenceRow: {
    gap: ds.spacing[4],
    paddingTop: ds.spacing[4],
    paddingBottom: ds.spacing[1],
  },
  presenceBubble: {
    width: 84,
    alignItems: "center",
  },
  presenceAvatarGlow: {
    position: "absolute",
    top: -4,
    width: 60,
    height: 60,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.medium),
  },
  presenceAvatar: {
    width: 54,
    height: 54,
    borderRadius: ds.radii.pill,
    borderWidth: 2,
    borderColor: vibesTheme.colors.background,
    backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.soft),
  },
  presenceName: {
    marginTop: ds.spacing[2],
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.bodySmall,
  },
  presenceMeta: {
    marginTop: ds.spacing[1],
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.micro,
  },
  sectionCard: {
    borderRadius: ds.radii.lg,
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: ds.colors.border.subtle,
    ...ds.shadows.md,
    padding: ds.spacing[4],
    marginBottom: ds.spacing[4],
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: ds.spacing[3],
    marginBottom: ds.spacing[4],
  },
  sectionTitle: {
    flex: 1,
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.title,
  },
  sectionLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[1],
  },
  sectionLinkText: {
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.body,
  },
  inlineLoading: {
    minHeight: 74,
    alignItems: "center",
    justifyContent: "center",
  },
  eventRow: {
    minHeight: 104,
    borderRadius: ds.radii.lg,
    borderWidth: 1,
    borderColor: ds.colors.border.subtle,
    flexDirection: "row",
    alignItems: "center",
    padding: ds.spacing[3],
    gap: ds.spacing[4],
    backgroundColor: ds.colors.bg.surfaceTranslucent,
  },
  eventRowSpacing: {
    marginTop: ds.spacing[3],
  },
  challengeRow: {
    minHeight: 104,
    borderRadius: ds.radii.lg,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.scrim),
    flexDirection: "row",
    alignItems: "center",
    padding: ds.spacing[3],
    gap: ds.spacing[4],
    backgroundColor: ds.colors.bg.surface,
  },
  eventThumb: {
    width: ds.componentSize.cardThumb,
    height: ds.componentSize.cardThumb,
    borderRadius: ds.radii.lg,
    backgroundColor: ds.withAlpha(ds.colors.base.coral, ds.opacity.medium),
  },
  challengeThumb: {
    width: ds.componentSize.cardThumb,
    height: ds.componentSize.cardThumb,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.scrim),
  },
  feedListRow: {
    minHeight: 96,
    borderRadius: ds.radii.xl,
    borderWidth: 1,
    borderColor: ds.colors.border.subtle,
    backgroundColor: vibesTheme.colors.background,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
    flexDirection: "row",
    alignItems: "flex-start",
    gap: ds.spacing[3],
    ...ds.shadows.md,
  },
  feedListRowChallenge: {
    backgroundColor: ds.colors.bg.surface,
    borderColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.scrim),
  },
  feedListThumb: {
    width: 62,
    height: 62,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.withAlpha(ds.colors.base.coral, ds.opacity.medium),
  },
  feedListInfo: {
    flex: 1,
  },
  feedListTitle: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.body,
    marginBottom: ds.spacing[1],
  },
  feedListMeta: {
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.bodySmall,
  },
  feedCommunityRow: {
    marginTop: ds.spacing[2],
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[1],
  },
  feedCommunityText: {
    flex: 1,
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.bodySmall,
  },
  feedListBottomRow: {
    marginTop: ds.spacing[3],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: ds.spacing[3],
  },
  feedAvatarStack: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 56,
  },
  feedAvatar: {
    width: 34,
    height: 34,
    borderRadius: ds.radii.pill,
    borderWidth: 2,
    borderColor: vibesTheme.colors.background,
  },
  feedArrowWrap: {
    width: 34,
    height: 34,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  feedProgressPill: {
    alignSelf: "flex-start",
    marginTop: ds.spacing[2],
    borderRadius: ds.radii.pill,
    paddingHorizontal: ds.spacing[3],
    paddingVertical: ds.spacing[1],
    backgroundColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.medium),
  },
  feedProgressPillPending: {
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.medium),
  },
  feedProgressPillDone: {
    backgroundColor: ds.withAlpha(ds.colors.base.coral, ds.opacity.medium),
  },
  feedProgressText: {
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.caption,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.heading,
    marginBottom: ds.spacing[2],
  },
  eventMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[1],
    marginTop: ds.spacing[1],
  },
  eventMeta: {
    flex: 1,
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.body,
  },
  rowArrow: {
    width: 44,
    height: 44,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: ds.colors.border.subtle,
  },
  discoverTop: {
    alignItems: "center",
    paddingTop: ds.spacing[2],
    paddingBottom: ds.spacing[2],
  },
  discoverTitle: {
    ...ds.textStyles.display,
    color: vibesTheme.colors.primaryText,
    letterSpacing: 0.3,
  },
  discoverOrbitWrap: {
    flex: 1,
    width: "100%",
  },
  discoverOrbitContent: {
    flex: 1,
  },
  discoverOrbitHint: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 18,
    alignItems: "center",
  },
  discoverFiltersRow: {
    paddingHorizontal: ds.spacing[4],
    paddingTop: ds.spacing[3],
    paddingBottom: ds.spacing[4],
    gap: ds.spacing[3],
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: ds.spacing[8],
  },
  emptyStateTitle: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.title,
    textAlign: "center",
  },
  emptyStateText: {
    marginTop: ds.spacing[3],
    color: ds.withAlpha(ds.colors.base.ink, ds.opacity.high),
    ...ds.textStyles.body,
    textAlign: "center",
  },
  filtersSheet: {
    backgroundColor: vibesTheme.colors.background,
    borderTopLeftRadius: ds.radii.xl,
    borderTopRightRadius: ds.radii.xl,
    paddingHorizontal: ds.spacing[5],
    paddingTop: ds.spacing[3],
    paddingBottom: ds.spacing[6],
    maxHeight: "82%",
  },
  filtersHandle: {
    width: 52,
    height: 5,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.withAlpha(ds.colors.base.ink, ds.opacity.medium),
    alignSelf: "center",
    marginBottom: ds.spacing[4],
  },
  filtersHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: ds.spacing[3],
    marginBottom: ds.spacing[2],
  },
  filtersTitle: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.display,
  },
  filtersSubtitle: {
    marginTop: ds.spacing[1],
    color: ds.withAlpha(ds.colors.base.ink, ds.opacity.high),
    ...ds.textStyles.subtitleMedium,
  },
  filtersCloseButton: {
    width: 38,
    height: 38,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.colors.bg.subtle,
  },
  filtersContent: {
    paddingVertical: ds.spacing[2],
    gap: ds.spacing[4],
  },
  filtersSection: {
    gap: ds.spacing[3],
  },
  rangeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: ds.spacing[3],
  },
  rangeSummary: {
    color: ds.withAlpha(ds.colors.base.ink, ds.opacity.higher),
    ...ds.textStyles.body,
  },
  rangeReset: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.bodySmall,
  },
  rangeRow: {
    flexDirection: "row",
    gap: ds.spacing[3],
  },
  rangeCard: {
    ...cardStyles.base,
    flex: 1,
    paddingHorizontal: ds.spacing[3],
    paddingVertical: ds.spacing[4],
    gap: ds.spacing[3],
  },
  rangeLabel: {
    color: ds.withAlpha(ds.colors.base.ink, ds.opacity.high),
    ...ds.textStyles.bodySmall,
    textTransform: "uppercase",
  },
  rangeControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: ds.spacing[2],
  },
  rangeValue: {
    flex: 1,
    textAlign: "center",
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.body,
  },
  filtersSectionTitle: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.title,
  },
  filtersPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ds.spacing[3],
  },
  filterPill: { ...chipStyles.base },
  filterPillActive: { ...chipStyles.selected },
  filterPillText: { ...chipStyles.label },
  filterPillTextActive: { ...chipStyles.labelSelected },
  filtersFooter: {
    flexDirection: "row",
    gap: ds.spacing[3],
    marginTop: ds.spacing[4],
  },
  filtersSecondaryButton: {
    ...buttonStyle("secondary", "md"),
    flex: 1,
  },
  filtersSecondaryButtonText: {
    ...buttonLabel("md", "secondary"),
  },
  filtersPrimaryButton: {
    ...buttonStyle("primary", "md"),
    flex: 1,
  },
  filtersPrimaryButtonText: {
    ...buttonLabel("md", "primary"),
  },
});

export default Home;
