/** @format */

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import LoopingVideo from "../components/LoopingVideo";
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
import { getGenderLabel } from "../src/constants/lookups";
import { useCandidatesQuery } from "../src/queries/candidates.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useSwipeMutation } from "../src/queries/swipes.mutations";
import {
  useChallengesFeedQuery,
  useEventsFeedQuery,
  useMyEventGroupsQuery,
} from "../src/queries/events.queries";
import { supabase } from "../src/lib/supabase";
import { upsertUserPreferences } from "../src/lib/userPreferencesStore";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { handleApiError } from "../src/utils/handleApiError";

type DiscoverFiltersState = {
  ageMin: number | null;
  ageMax: number | null;
  genderId: number | null;
  distanceMinKm: number | null;
  maxDistanceKm: number | null;
  smoking: "all" | "no" | "occasionally" | "yes";
};

const DEFAULT_FILTERS: DiscoverFiltersState = {
  ageMin: null,
  ageMax: null,
  genderId: null,
  distanceMinKm: null,
  maxDistanceKm: null,
  smoking: "all",
};

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

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceKm = (
  fromLatitude?: unknown,
  fromLongitude?: unknown,
  toLatitude?: unknown,
  toLongitude?: unknown,
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
  options?: {
    includeNullValue?: boolean;
  },
) => {
  if (min === null && max === null) return true;
  if (value === null) return Boolean(options?.includeNullValue);
  if (min !== null && value < min) return false;
  if (max !== null && value > max) return false;
  return true;
};

const clampRange = (
  nextValue: number | null,
  minLimit: number,
  maxLimit: number,
) => {
  if (nextValue === null) return null;
  return Math.max(minLimit, Math.min(maxLimit, nextValue));
};

const formatRangeSummary = (
  min: number | null,
  max: number | null,
  suffix = "",
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

const areFiltersEqual = (
  left: DiscoverFiltersState,
  right: DiscoverFiltersState,
) =>
  left.ageMin === right.ageMin &&
  left.ageMax === right.ageMax &&
  left.genderId === right.genderId &&
  left.distanceMinKm === right.distanceMinKm &&
  left.maxDistanceKm === right.maxDistanceKm &&
  left.smoking === right.smoking;

const readStoredFilters = (preferences: Record<string, any> | null): DiscoverFiltersState => ({
  ageMin: toFiniteNumber(
    preferences?.discoverAgeMin ?? preferences?.discover_age_min,
  ),
  ageMax: toFiniteNumber(
    preferences?.discoverAgeMax ?? preferences?.discover_age_max,
  ),
  genderId: toFiniteNumber(
    preferences?.discoverGenderId ?? preferences?.discover_gender_id,
  ),
  distanceMinKm: toFiniteNumber(
    preferences?.discoverDistanceMinKm ?? preferences?.discover_distance_min_km,
  ),
  maxDistanceKm: toFiniteNumber(
    preferences?.discoverDistanceMaxKm ?? preferences?.discover_distance_max_km,
  ),
  smoking: normalizeSmoking(
    preferences?.discoverSmoking ?? preferences?.discover_smoking,
  ),
});

const Home = () => {
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const { data: ownProfileData } = useProfileQuery(session?.user?.id);
  const { data: userPreferences } = useUserPreferencesQuery(session?.user?.id);
  const {
    data: candidates = [],
    isLoading,
    isError,
    error,
  } = useCandidatesQuery();
  const { data: events = [], isLoading: isEventsLoading } = useEventsFeedQuery();
  const {
    data: challenges = [],
    isLoading: isChallengesLoading,
  } = useChallengesFeedQuery();
  const {
    data: myEventGroups = [],
    isLoading: isMyEventGroupsLoading,
  } = useMyEventGroupsQuery(session?.user?.id);
  const [discoverFilters, setDiscoverFilters] =
    useState<DiscoverFiltersState>(DEFAULT_FILTERS);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [hasHydratedStoredFilters, setHasHydratedStoredFilters] = useState(false);
  const ownProfileRecord = (ownProfileData ?? null) as Record<string, any> | null;
  const profiles = useMemo<DataT[]>(() => {
    return candidates
      .map((candidate) => {
        const candidateRecord = candidate as Record<string, any>;
        const distanceKm = getDistanceKm(
          ownProfileRecord?.latitude,
          ownProfileRecord?.longitude,
          candidateRecord.latitude,
          candidateRecord.longitude,
        );

        return {
          ...candidateRecord,
          distanceKm: distanceKm ?? undefined,
        };
      })
      .filter((candidate) => {
        const candidateRecord = candidate as Record<string, any>;
        const candidateAge = parseAge(
          candidateRecord.age ?? candidateRecord.birthDate ?? candidateRecord.birth_date,
        );
        const candidateGenderId = toFiniteNumber(
          candidateRecord.genderId ?? candidateRecord.gender_id,
        );
        const candidateSmoking = normalizeSmoking(candidateRecord.smoking);

        if (
          !matchesNumberRange(
            candidateAge,
            discoverFilters.ageMin,
            discoverFilters.ageMax,
            { includeNullValue: true },
          )
        ) {
          return false;
        }
        if (
          discoverFilters.genderId !== null &&
          candidateGenderId !== discoverFilters.genderId
        ) {
          return false;
        }
        if (
          !matchesNumberRange(
            typeof candidateRecord.distanceKm === "number"
              ? candidateRecord.distanceKm
              : null,
            discoverFilters.distanceMinKm,
            discoverFilters.maxDistanceKm,
          )
        ) {
          return false;
        }
        if (
          discoverFilters.smoking !== "all" &&
          candidateSmoking !== discoverFilters.smoking
        ) {
          return false;
        }

        return true;
      })
      .map((candidate) => {
        const profile = mapCandidateToConnectionProfile(candidate);
        const candidateRecord = candidate as Record<string, any>;
        return {
          ...profile,
          distanceLabel: formatDistanceLabel(
            typeof candidateRecord.distanceKm === "number"
              ? candidateRecord.distanceKm
              : null,
          ),
          match: profile.match ?? "0",
        };
      }) as DataT[];
  }, [candidates, discoverFilters, ownProfileRecord?.latitude, ownProfileRecord?.longitude]);
  const centerProfile = useMemo<DataT>(
    () =>
      ({
        ...mapOwnProfileToConnectionProfile(
          ownProfileData,
          session?.user?.email?.split("@")[0],
        ),
        match: "0",
      } as DataT),
    [ownProfileData, session?.user?.email],
  );
  const errorMessage =
    error instanceof Error && error.message.trim()
      ? error.message
      : "Could not load real profiles.";
  const [showGallery, setShowGallery] = useState<boolean>(false);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState<number>(0);
  const [showProfileSheet, setShowProfileSheet] = useState<boolean>(false);
  const [selectedProfile, setSelectedProfile] = useState<DataT | null>(null);
  const swipeMutation = useSwipeMutation();
  const firstName =
    (centerProfile.name || session?.user?.email?.split("@")[0] || "miradario")
      .split(" ")[0]
      .trim() || "miradario";
  const futureEvents = useMemo(() => {
    const now = Date.now();
    return events
      .filter((event) => {
        if (!event.startsAt) return false;
        const timestamp = new Date(event.startsAt).getTime();
        return Number.isFinite(timestamp) && timestamp > now;
      })
      .sort((left, right) => {
        const leftTime = new Date(left.startsAt as string).getTime();
        const rightTime = new Date(right.startsAt as string).getTime();
        return leftTime - rightTime;
      });
  }, [events]);
  const activeChallenges = useMemo(() => {
    const now = Date.now();

    return challenges
      .filter((challenge) => {
        if (!challenge.startsAt) return true;

        const startTime = new Date(challenge.startsAt).getTime();
        if (!Number.isFinite(startTime)) return true;

        const durationDays =
          typeof challenge.durationDays === "number" && challenge.durationDays > 0
            ? challenge.durationDays
            : null;
        const endTime = durationDays
          ? startTime + durationDays * 24 * 60 * 60 * 1000
          : null;

        return startTime <= now && (endTime === null || endTime >= now);
      })
      .sort((left, right) => {
        const leftTime = left.startsAt
          ? new Date(left.startsAt).getTime()
          : new Date(left.createdAt ?? 0).getTime();
        const rightTime = right.startsAt
          ? new Date(right.startsAt).getTime()
          : new Date(right.createdAt ?? 0).getTime();

        return (rightTime || 0) - (leftTime || 0);
      });
  }, [challenges]);
  const joinedChallengeIds = useMemo(
    () =>
      new Set(
        myEventGroups
          .filter((group) => group.eventType === "challenge")
          .map((group) => group.eventId),
      ),
    [myEventGroups],
  );
  const joinedActiveChallenges = useMemo(
    () =>
      activeChallenges.filter((challenge) =>
        joinedChallengeIds.has(challenge.id),
      ),
    [activeChallenges, joinedChallengeIds],
  );
  const suggestedChallenge = useMemo(
    () =>
      joinedActiveChallenges.length > 0
        ? null
        : activeChallenges.find(
            (challenge) => !joinedChallengeIds.has(challenge.id),
          ) ?? null,
    [activeChallenges, joinedActiveChallenges.length, joinedChallengeIds],
  );
  const isChallengesSectionLoading =
    isChallengesLoading || (Boolean(session?.user?.id) && isMyEventGroupsLoading);
  const summaryStats = [
    {
      icon: "people-outline" as const,
      value: profiles.length || 12,
      label: "Conexiones",
    },
    {
      icon: "calendar-outline" as const,
      value: futureEvents.length,
      label: "Eventos asistidos",
    },
  ];
  const upcomingEvents = futureEvents.slice(0, 2);
  const visibleJoinedActiveChallenges = joinedActiveChallenges.slice(0, 2);
  const suggestedProfile = profiles[0] ?? null;
  const selectedProfileForSheet = useMemo<UserProfileCardData | null>(
    () =>
      selectedProfile
        ? {
            ...selectedProfile,
            id: String(selectedProfile.id),
          }
        : null,
    [selectedProfile],
  );

  const ageSummary = formatRangeSummary(
    discoverFilters.ageMin,
    discoverFilters.ageMax,
  );
  const distanceSummary = formatRangeSummary(
    discoverFilters.distanceMinKm,
    discoverFilters.maxDistanceKm,
    " km",
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
      areFiltersEqual(prev, storedFilters) ? prev : storedFilters,
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
        discover_gender_id: discoverFilters.genderId,
        discover_distance_min_km: discoverFilters.distanceMinKm,
        discover_distance_max_km: discoverFilters.maxDistanceKm,
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
          address?.city ??
          address?.subregion ??
          address?.region ??
          null;
        const country = address?.country ?? null;
        const locationLabel = [city, country].filter(Boolean).join(", ") || null;
        const currentLatitude = current.coords.latitude;
        const currentLongitude = current.coords.longitude;
        const storedLatitude = toFiniteNumber(ownProfileRecord?.latitude);
        const storedLongitude = toFiniteNumber(ownProfileRecord?.longitude);
        const needsSync =
          storedLatitude === null ||
          storedLongitude === null ||
          Math.abs(storedLatitude - currentLatitude) > 0.001 ||
          Math.abs(storedLongitude - currentLongitude) > 0.001 ||
          ownProfileRecord?.locationLabel !== locationLabel;

        if (!needsSync) return;

        await supabase.from("profiles").upsert(
          {
            id: userId,
            country,
            city,
            location_label: locationLabel,
            latitude: currentLatitude,
            longitude: currentLongitude,
          },
          { onConflict: "id" },
        );
      } catch (_error) {
        // Keep discover usable even if location sync fails.
      }
    };

    syncOwnLocation();

    return () => {
      active = false;
    };
  }, [
    ownProfileRecord?.latitude,
    ownProfileRecord?.locationLabel,
    ownProfileRecord?.longitude,
    session?.user?.id,
  ]);

  const openGallery = (images: any[] | undefined, initialIndex = 0) => {
    if (!images || images.length === 0) return;
    setGalleryImages(images);
    setGalleryInitialIndex(
      initialIndex >= 0 && initialIndex < images.length ? initialIndex : 0,
    );
    setShowGallery(true);
  };

  const connectProfile = (profile: DataT | null) => {
    if (!profile) return;

    swipeMutation.mutate(
      {
        targetUserId: String(profile.id),
        direction: "like",
      },
      {
        onSuccess: (response) => {
          if (response?.match) {
            navigation.navigate("Match" as never, { profile } as never);
          }
        },
        onError: (error) =>
          handleApiError(error, { toastTitle: "Connect Error" }),
      },
    );

    closeProfileSheet();
  };

  const openProfileSheet = (profile: DataT) => {
    setSelectedProfile(profile);
    setShowProfileSheet(true);
  };

  const closeProfileSheet = () => {
    setShowProfileSheet(false);
  };

  const filterSectionTitle = (title: string) => (
    <Text style={localStyles.filtersSectionTitle}>{title}</Text>
  );

  const updateAgeBoundary = (key: "ageMin" | "ageMax", delta: number) => {
    setDiscoverFilters((prev) => {
      const current = key === "ageMin" ? prev.ageMin : prev.ageMax;
      const rawNext = clampRange((current ?? (key === "ageMin" ? 18 : 99)) + delta, 18, 99);
      const next = rawNext === current ? current : rawNext;
      const ageMin = key === "ageMin" ? next : prev.ageMin;
      const ageMax = key === "ageMax" ? next : prev.ageMax;

      if (ageMin !== null && ageMax !== null && ageMin > ageMax) {
        return {
          ...prev,
          ageMin: key === "ageMin" ? ageMax : ageMin,
          ageMax: key === "ageMin" ? ageMax : ageMin,
        };
      }

      return {
        ...prev,
        ageMin,
        ageMax,
      };
    });
  };

  const updateDistanceBoundary = (
    key: "distanceMinKm" | "maxDistanceKm",
    delta: number,
  ) => {
    setDiscoverFilters((prev) => {
      const fallback = key === "distanceMinKm" ? 0 : 100;
      const current = key === "distanceMinKm" ? prev.distanceMinKm : prev.maxDistanceKm;
      const rawNext = clampRange((current ?? fallback) + delta, 0, 500);
      const stepAdjusted = rawNext === null ? null : Math.round(rawNext / 5) * 5;
      const next = stepAdjusted === current ? current : stepAdjusted;
      const distanceMinKm = key === "distanceMinKm" ? next : prev.distanceMinKm;
      const maxDistanceKm = key === "maxDistanceKm" ? next : prev.maxDistanceKm;

      if (
        distanceMinKm !== null &&
        maxDistanceKm !== null &&
        distanceMinKm > maxDistanceKm
      ) {
        return {
          ...prev,
          distanceMinKm: key === "distanceMinKm" ? maxDistanceKm : distanceMinKm,
          maxDistanceKm: key === "distanceMinKm" ? maxDistanceKm : distanceMinKm,
        };
      }

      return {
        ...prev,
        distanceMinKm,
        maxDistanceKm,
      };
    });
  };

  return (
    <View style={localStyles.screen}>
      <SafeAreaView
        style={localStyles.safeArea}
        edges={["top", "left", "right"]}
      >
        <Modal
          visible={isFiltersVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsFiltersVisible(false)}
        >
          <View style={localStyles.filtersModalRoot}>
            <TouchableOpacity
              style={localStyles.filtersBackdrop}
              activeOpacity={1}
              onPress={() => setIsFiltersVisible(false)}
            />
            <View style={localStyles.filtersSheet}>
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
                  <Icon name="close" size={18} color="#2B2B2B" />
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
                        <TouchableOpacity
                          style={localStyles.rangeButton}
                          onPress={() => updateAgeBoundary("ageMin", -1)}
                        >
                          <Text style={localStyles.rangeButtonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={localStyles.rangeValue}>
                          {discoverFilters.ageMin ?? "Sin límite"}
                        </Text>
                        <TouchableOpacity
                          style={localStyles.rangeButton}
                          onPress={() => updateAgeBoundary("ageMin", 1)}
                        >
                          <Text style={localStyles.rangeButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={localStyles.rangeCard}>
                      <Text style={localStyles.rangeLabel}>Máxima</Text>
                      <View style={localStyles.rangeControls}>
                        <TouchableOpacity
                          style={localStyles.rangeButton}
                          onPress={() => updateAgeBoundary("ageMax", -1)}
                        >
                          <Text style={localStyles.rangeButtonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={localStyles.rangeValue}>
                          {discoverFilters.ageMax ?? "Sin límite"}
                        </Text>
                        <TouchableOpacity
                          style={localStyles.rangeButton}
                          onPress={() => updateAgeBoundary("ageMax", 1)}
                        >
                          <Text style={localStyles.rangeButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={localStyles.filtersSection}>
                  {filterSectionTitle("Género")}
                  <View style={localStyles.filtersPillRow}>
                    <TouchableOpacity
                      style={[
                        localStyles.filterPill,
                        discoverFilters.genderId === null && localStyles.filterPillActive,
                      ]}
                      onPress={() =>
                        setDiscoverFilters((prev) => ({ ...prev, genderId: null }))
                      }
                    >
                      <Text
                        style={[
                          localStyles.filterPillText,
                          discoverFilters.genderId === null &&
                            localStyles.filterPillTextActive,
                        ]}
                      >
                        Todos
                      </Text>
                    </TouchableOpacity>
                    {[1, 2, 3].map((genderId) => (
                      <TouchableOpacity
                        key={genderId}
                        style={[
                          localStyles.filterPill,
                          discoverFilters.genderId === genderId &&
                            localStyles.filterPillActive,
                        ]}
                        onPress={() =>
                          setDiscoverFilters((prev) => ({ ...prev, genderId }))
                        }
                      >
                        <Text
                          style={[
                            localStyles.filterPillText,
                            discoverFilters.genderId === genderId &&
                              localStyles.filterPillTextActive,
                          ]}
                        >
                          {getGenderLabel(genderId) ?? `Género ${genderId}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={localStyles.filtersSection}>
                  {filterSectionTitle("Distancia")}
                  <View style={localStyles.rangeHeader}>
                    <Text style={localStyles.rangeSummary}>{distanceSummary}</Text>
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
                        <TouchableOpacity
                          style={localStyles.rangeButton}
                          onPress={() => updateDistanceBoundary("distanceMinKm", -5)}
                        >
                          <Text style={localStyles.rangeButtonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={localStyles.rangeValue}>
                          {discoverFilters.distanceMinKm === null
                            ? "Sin límite"
                            : `${discoverFilters.distanceMinKm} km`}
                        </Text>
                        <TouchableOpacity
                          style={localStyles.rangeButton}
                          onPress={() => updateDistanceBoundary("distanceMinKm", 5)}
                        >
                          <Text style={localStyles.rangeButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={localStyles.rangeCard}>
                      <Text style={localStyles.rangeLabel}>Máxima</Text>
                      <View style={localStyles.rangeControls}>
                        <TouchableOpacity
                          style={localStyles.rangeButton}
                          onPress={() => updateDistanceBoundary("maxDistanceKm", -5)}
                        >
                          <Text style={localStyles.rangeButtonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={localStyles.rangeValue}>
                          {discoverFilters.maxDistanceKm === null
                            ? "Sin límite"
                            : `${discoverFilters.maxDistanceKm} km`}
                        </Text>
                        <TouchableOpacity
                          style={localStyles.rangeButton}
                          onPress={() => updateDistanceBoundary("maxDistanceKm", 5)}
                        >
                          <Text style={localStyles.rangeButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
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
                  onPress={() => setDiscoverFilters(DEFAULT_FILTERS)}
                >
                  <Text style={localStyles.filtersSecondaryButtonText}>Limpiar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={localStyles.filtersPrimaryButton}
                  onPress={() => setIsFiltersVisible(false)}
                >
                  <Text style={localStyles.filtersPrimaryButtonText}>Aplicar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
              <Icon name="close" size={18} color="#F6F6F4" />
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

        <UserProfileSheet
          visible={showProfileSheet}
          profile={selectedProfileForSheet}
          onClose={closeProfileSheet}
          onImagePress={(_image, index) =>
            selectedProfile
              ? openGallery(
                  selectedProfile.images || [selectedProfile.image],
                  index ?? 0,
                )
              : undefined
          }
          onContactPress={() =>
            selectedProfile ? connectProfile(selectedProfile) : undefined
          }
        />

        <ScrollView
          style={localStyles.homeScroll}
          contentContainerStyle={localStyles.homeContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={localStyles.heroHeader}>
            <View>
              <Text style={localStyles.heroTitle}>Hola, {firstName}</Text>
              <Text style={localStyles.heroSubtitle}>
                Conéctate contigo antes de conectar con otros.
              </Text>
            </View>
          </View>

          <View style={localStyles.summaryCard}>
            <LoopingVideo
              source={require("../assets/videos/bienvenidx.mp4")}
              style={localStyles.summaryArt}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isMuted
              isLooping={false}
            />
            <View style={localStyles.summaryContent}>
              <Text style={localStyles.cardTitle}>Tu resumen</Text>
              <View style={localStyles.statsRow}>
                {summaryStats.map((stat, index) => (
                  <View key={stat.label} style={localStyles.statItem}>
                    {index > 0 ? <View style={localStyles.statDivider} /> : null}
                    <Ionicons name={stat.icon} size={22} color="#DCA453" />
                    <Text style={localStyles.statValue}>{stat.value}</Text>
                    <Text style={localStyles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={localStyles.challengeCard}>
            <View style={localStyles.challengeIcon}>
              <Ionicons name="leaf-outline" size={34} color="#FFFFFF" />
            </View>
            <View style={localStyles.challengeCopy}>
              <Text style={localStyles.challengeTitle}>Reto de hoy</Text>
              <Text style={localStyles.challengeText}>
                Toma 3 minutos para respirar antes de iniciar una conversación.
              </Text>
            </View>
            <TouchableOpacity
              style={localStyles.challengeButton}
              onPress={() =>
                navigation.navigate("Calendar" as never, { section: "challenge" } as never)
              }
            >
              <Text style={localStyles.challengeButtonText}>Comenzar reto</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={localStyles.meditationCard}
            onPress={() => navigation.navigate("Meditations" as never)}
          >
            <LoopingVideo
              source={require("../assets/videos/bienvenidx.mp4")}
              style={localStyles.meditationArt}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isMuted
              isLooping
            />
            <View style={localStyles.meditationOverlay} />
            <View style={localStyles.meditationContent}>
              <View style={localStyles.meditationBadge}>
                <Ionicons name="moon-outline" size={15} color="#2B2B2B" />
                <Text style={localStyles.meditationBadgeText}>Vibes</Text>
              </View>
              <Text style={localStyles.meditationTitle}>Meditación guiada</Text>
              <Text style={localStyles.meditationText}>
                Elegí tu práctica, tu duración y empezá a bajar el ritmo desde acá.
              </Text>
              <View style={localStyles.meditationButton}>
                <Ionicons name="play" size={16} color="#F6F6F4" />
                <Text style={localStyles.meditationButtonText}>Ir a meditar</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={localStyles.sectionCard}>
            <View style={localStyles.sectionHeader}>
              <Text style={localStyles.sectionTitle}>
                {visibleJoinedActiveChallenges.length > 0
                  ? "Tus challenges vigentes"
                  : "Challenge sugerido"}
              </Text>
              <TouchableOpacity
                style={localStyles.sectionLink}
                onPress={() =>
                  navigation.navigate("Calendar" as never, { section: "challenge" } as never)
                }
              >
                <Text style={localStyles.sectionLinkText}>Ver todos</Text>
                <Ionicons name="chevron-forward" size={20} color="#766F68" />
              </TouchableOpacity>
            </View>
            {isChallengesSectionLoading ? (
              <View style={localStyles.inlineLoading}>
                <ActivityIndicator color="#DCA453" />
              </View>
            ) : visibleJoinedActiveChallenges.length > 0 ? (
              visibleJoinedActiveChallenges.map((challenge, index) => (
                <TouchableOpacity
                  key={challenge.id}
                  style={[
                    localStyles.challengeRow,
                    index > 0 && localStyles.eventRowSpacing,
                  ]}
                  onPress={() =>
                    navigation.navigate(
                      "ChallengeDetailScreen" as never,
                      { event: challenge } as never,
                    )
                  }
                >
                  <Image
                    source={
                      typeof challenge.image === "string"
                        ? { uri: challenge.image }
                        : challenge.image
                    }
                    style={localStyles.challengeThumb}
                  />
                  <View style={localStyles.eventInfo}>
                    <Text style={localStyles.eventTitle} numberOfLines={1}>
                      {challenge.title}
                    </Text>
                    <View style={localStyles.eventMetaRow}>
                      <Ionicons name="flame-outline" size={15} color="#6F6A64" />
                      <Text style={localStyles.eventMeta} numberOfLines={1}>
                        {challenge.date}
                      </Text>
                    </View>
                    <View style={localStyles.eventMetaRow}>
                      <Ionicons name="people-outline" size={15} color="#6F6A64" />
                      <Text style={localStyles.eventMeta} numberOfLines={1}>
                        {challenge.attendees}
                      </Text>
                    </View>
                  </View>
                  <View style={localStyles.rowArrow}>
                    <Ionicons name="chevron-forward" size={21} color="#2B2B2B" />
                  </View>
                </TouchableOpacity>
              ))
            ) : suggestedChallenge ? (
              <TouchableOpacity
                style={localStyles.challengeRow}
                onPress={() =>
                  navigation.navigate(
                    "ChallengeDetailScreen" as never,
                    { event: suggestedChallenge } as never,
                  )
                }
              >
                <Image
                  source={
                    typeof suggestedChallenge.image === "string"
                      ? { uri: suggestedChallenge.image }
                      : suggestedChallenge.image
                  }
                  style={localStyles.challengeThumb}
                />
                <View style={localStyles.eventInfo}>
                  <Text style={localStyles.eventTitle} numberOfLines={1}>
                    {suggestedChallenge.title}
                  </Text>
                  <View style={localStyles.eventMetaRow}>
                    <Ionicons name="sparkles-outline" size={15} color="#6F6A64" />
                    <Text style={localStyles.eventMeta} numberOfLines={1}>
                      Sugerido para empezar
                    </Text>
                  </View>
                  <View style={localStyles.eventMetaRow}>
                    <Ionicons name="flame-outline" size={15} color="#6F6A64" />
                    <Text style={localStyles.eventMeta} numberOfLines={1}>
                      {suggestedChallenge.date}
                    </Text>
                  </View>
                </View>
                <View style={localStyles.rowArrow}>
                  <Ionicons name="chevron-forward" size={21} color="#2B2B2B" />
                </View>
              </TouchableOpacity>
            ) : (
              <Text style={localStyles.emptyStateText}>
                No hay challenges activos por ahora.
              </Text>
            )}
          </View>

          <View style={localStyles.sectionCard}>
            <View style={localStyles.sectionHeader}>
              <Text style={localStyles.sectionTitle}>Próximos eventos</Text>
              <TouchableOpacity
                style={localStyles.sectionLink}
                onPress={() =>
                  navigation.navigate("Calendar" as never, { section: "event" } as never)
                }
              >
                <Text style={localStyles.sectionLinkText}>Ver todos</Text>
                <Ionicons name="chevron-forward" size={20} color="#766F68" />
              </TouchableOpacity>
            </View>
            {isEventsLoading ? (
              <View style={localStyles.inlineLoading}>
                <ActivityIndicator color="#DCA453" />
              </View>
            ) : upcomingEvents.length === 0 ? (
              <Text style={localStyles.emptyStateText}>
                No hay próximos eventos disponibles.
              </Text>
            ) : (
              upcomingEvents.map((event, index) => (
                <TouchableOpacity
                  key={event.id}
                  style={[
                    localStyles.eventRow,
                    index > 0 && localStyles.eventRowSpacing,
                  ]}
                  onPress={() =>
                    navigation.navigate("Calendar" as never, { section: "event" } as never)
                  }
                >
                  <Image
                    source={
                      typeof event.image === "string"
                        ? { uri: event.image }
                        : event.image
                    }
                    style={localStyles.eventThumb}
                  />
                  <View style={localStyles.eventInfo}>
                    <Text style={localStyles.eventTitle} numberOfLines={1}>
                      {event.title}
                    </Text>
                    <View style={localStyles.eventMetaRow}>
                      <Ionicons name="calendar-outline" size={15} color="#6F6A64" />
                      <Text style={localStyles.eventMeta} numberOfLines={1}>
                        {event.date}
                      </Text>
                    </View>
                    <View style={localStyles.eventMetaRow}>
                      <Ionicons name="location-outline" size={15} color="#6F6A64" />
                      <Text style={localStyles.eventMeta} numberOfLines={1}>
                        {event.location ?? "Online"}
                      </Text>
                    </View>
                  </View>
                  <View style={localStyles.rowArrow}>
                    <Ionicons name="chevron-forward" size={21} color="#2B2B2B" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={localStyles.connectionCard}>
            <View style={localStyles.sectionHeader}>
              <Text style={localStyles.sectionTitle}>Nueva conexión para ti</Text>
              <TouchableOpacity
                style={localStyles.sectionLink}
                onPress={() => navigation.navigate("Discover" as never)}
              >
                <Text style={localStyles.sectionLinkText}>Ver más</Text>
                <Ionicons name="chevron-forward" size={20} color="#766F68" />
              </TouchableOpacity>
            </View>
            {isLoading ? (
              <View style={localStyles.inlineLoading}>
                <ActivityIndicator color="#DCA453" />
              </View>
            ) : isError ? (
              <Text style={localStyles.emptyStateText}>{errorMessage}</Text>
            ) : suggestedProfile ? (
              <View style={localStyles.connectionBody}>
                <Image
                  source={suggestedProfile.image}
                  style={localStyles.connectionAvatar}
                />
                <View style={localStyles.connectionInfo}>
                  <Text style={localStyles.connectionName}>
                    {suggestedProfile.name}
                  </Text>
                  <Text style={localStyles.connectionDescription} numberOfLines={2}>
                    {suggestedProfile.description ||
                      "Yoga, meditación & conversaciones significativas"}
                  </Text>
                  <View style={localStyles.moodRow}>
                    <Ionicons name="leaf-outline" size={18} color="#5F8A52" />
                    <Text style={localStyles.moodText}>
                      {suggestedProfile.vibe || "Calm & Open"}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={localStyles.profileButton}
                  onPress={() => openProfileSheet(suggestedProfile)}
                >
                  <Text style={localStyles.profileButtonText}>Ver perfil</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={localStyles.emptyStateText}>
                No hay perfiles reales todavía.
              </Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const localStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F6F4",
  },
  safeArea: {
    flex: 1,
  },
  homeScroll: {
    flex: 1,
  },
  homeContent: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 112,
  },
  heroHeader: {
    marginBottom: 26,
  },
  heroTitle: {
    color: "#252323",
    fontSize: 40,
    lineHeight: 45,
    fontFamily: "CormorantGaramond_700Bold",
  },
  heroSubtitle: {
    marginTop: 8,
    color: "#58534E",
    fontSize: 23,
    lineHeight: 30,
    fontFamily: "CormorantGaramond_500Medium",
  },
  summaryCard: {
    minHeight: 132,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowColor: "#3E352B",
    shadowOffset: { height: 8, width: 0 },
    flexDirection: "row",
    padding: 16,
    gap: 14,
    marginBottom: 18,
  },
  summaryArt: {
    width: 92,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryContent: {
    flex: 1,
    justifyContent: "center",
  },
  cardTitle: {
    color: "#252323",
    fontSize: 23,
    lineHeight: 27,
    fontFamily: "CormorantGaramond_700Bold",
    marginBottom: 18,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  statItem: {
    flex: 1,
    minHeight: 78,
    justifyContent: "flex-start",
    position: "relative",
    paddingLeft: 8,
  },
  statDivider: {
    position: "absolute",
    left: 0,
    top: 23,
    bottom: 18,
    width: 1,
    backgroundColor: "rgba(43, 43, 43, 0.1)",
  },
  statValue: {
    marginTop: 8,
    color: "#4B3728",
    fontSize: 31,
    lineHeight: 34,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  statLabel: {
    marginTop: 4,
    color: "#4D4945",
    fontSize: 15,
    lineHeight: 18,
    fontFamily: "CormorantGaramond_500Medium",
  },
  challengeCard: {
    minHeight: 112,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowColor: "#3E352B",
    shadowOffset: { height: 7, width: 0 },
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    marginBottom: 18,
  },
  challengeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E5B762",
    alignItems: "center",
    justifyContent: "center",
  },
  challengeCopy: {
    flex: 1,
  },
  challengeTitle: {
    color: "#252323",
    fontSize: 22,
    lineHeight: 25,
    fontFamily: "CormorantGaramond_700Bold",
  },
  challengeText: {
    marginTop: 5,
    color: "#59534D",
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "CormorantGaramond_500Medium",
  },
  challengeButton: {
    minWidth: 122,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#E4B762",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  challengeButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "CormorantGaramond_700Bold",
  },
  meditationCard: {
    minHeight: 188,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#D8E3EC",
    marginBottom: 18,
    position: "relative",
    shadowOpacity: 0.09,
    shadowRadius: 18,
    shadowColor: "#3E352B",
    shadowOffset: { height: 8, width: 0 },
  },
  meditationArt: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  meditationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(43, 43, 43, 0.2)",
  },
  meditationContent: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    justifyContent: "space-between",
    minHeight: 188,
  },
  meditationBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(246, 246, 244, 0.86)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  meditationBadgeText: {
    color: "#2B2B2B",
    fontSize: 14,
    fontFamily: "CormorantGaramond_700Bold",
  },
  meditationTitle: {
    marginTop: 18,
    color: "#F6F6F4",
    fontSize: 31,
    lineHeight: 34,
    fontFamily: "CormorantGaramond_700Bold",
  },
  meditationText: {
    marginTop: 8,
    maxWidth: "82%",
    color: "rgba(246, 246, 244, 0.92)",
    fontSize: 18,
    lineHeight: 22,
    fontFamily: "CormorantGaramond_500Medium",
  },
  meditationButton: {
    marginTop: 16,
    alignSelf: "flex-start",
    height: 42,
    borderRadius: 21,
    backgroundColor: "#AEBFD1",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  meditationButtonText: {
    color: "#F6F6F4",
    fontSize: 16,
    fontFamily: "CormorantGaramond_700Bold",
  },
  sectionCard: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowColor: "#3E352B",
    shadowOffset: { height: 7, width: 0 },
    padding: 18,
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    flex: 1,
    color: "#252323",
    fontSize: 23,
    lineHeight: 27,
    fontFamily: "CormorantGaramond_700Bold",
  },
  sectionLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  sectionLinkText: {
    color: "#8A8178",
    fontSize: 16,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  inlineLoading: {
    minHeight: 74,
    alignItems: "center",
    justifyContent: "center",
  },
  eventRow: {
    minHeight: 104,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 14,
    backgroundColor: "rgba(255, 255, 255, 0.86)",
  },
  eventRowSpacing: {
    marginTop: 12,
  },
  challengeRow: {
    minHeight: 104,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(95, 138, 82, 0.18)",
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 14,
    backgroundColor: "rgba(247, 250, 242, 0.92)",
  },
  eventThumb: {
    width: 76,
    height: 76,
    borderRadius: 14,
    backgroundColor: "#E9E4DD",
  },
  challengeThumb: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#E7EEDC",
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    color: "#252323",
    fontSize: 20,
    lineHeight: 24,
    fontFamily: "CormorantGaramond_700Bold",
    marginBottom: 7,
  },
  eventMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  eventMeta: {
    flex: 1,
    color: "#625D57",
    fontSize: 15,
    lineHeight: 18,
    fontFamily: "CormorantGaramond_500Medium",
  },
  rowArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.07)",
  },
  connectionCard: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowColor: "#3E352B",
    shadowOffset: { height: 7, width: 0 },
    padding: 18,
  },
  connectionBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  connectionAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#F3EFE9",
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    color: "#252323",
    fontSize: 28,
    lineHeight: 31,
    fontFamily: "CormorantGaramond_700Bold",
  },
  connectionDescription: {
    marginTop: 4,
    color: "#534E49",
    fontSize: 17,
    lineHeight: 21,
    fontFamily: "CormorantGaramond_500Medium",
  },
  moodRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  moodText: {
    color: "#5F8A52",
    fontSize: 17,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  profileButton: {
    minWidth: 122,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#DCA453",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  profileButtonText: {
    color: "#DCA453",
    fontSize: 18,
    fontFamily: "CormorantGaramond_700Bold",
  },
  discoverTop: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 6,
  },
  discoverTitle: {
    fontSize: 42,
    lineHeight: 46,
    color: "#2B2B2B",
    fontFamily: "CormorantGaramond_700Bold",
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
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 10,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    color: "#2B2B2B",
    fontSize: 24,
    fontFamily: "CormorantGaramond_600SemiBold",
    textAlign: "center",
  },
  emptyStateText: {
    marginTop: 10,
    color: "rgba(43, 43, 43, 0.7)",
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "CormorantGaramond_500Medium",
    textAlign: "center",
  },
  filtersModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  filtersBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 17, 17, 0.28)",
  },
  filtersSheet: {
    backgroundColor: "#F6F6F4",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: "82%",
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
  filtersTitle: {
    color: "#2B2B2B",
    fontSize: 30,
    fontFamily: "CormorantGaramond_700Bold",
  },
  filtersSubtitle: {
    marginTop: 4,
    color: "rgba(43, 43, 43, 0.64)",
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "CormorantGaramond_500Medium",
  },
  filtersCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(43, 43, 43, 0.06)",
  },
  filtersContent: {
    paddingVertical: 8,
    gap: 18,
  },
  filtersSection: {
    gap: 10,
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
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  rangeReset: {
    color: "#2B2B2B",
    fontSize: 14,
    fontFamily: "CormorantGaramond_700Bold",
  },
  rangeRow: {
    flexDirection: "row",
    gap: 10,
  },
  rangeCard: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 12,
  },
  rangeLabel: {
    color: "rgba(43, 43, 43, 0.64)",
    fontSize: 13,
    fontFamily: "CormorantGaramond_600SemiBold",
    textTransform: "uppercase",
  },
  rangeControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rangeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#AEBFD1",
  },
  rangeButtonText: {
    color: "#F6F6F4",
    fontSize: 18,
    lineHeight: 20,
    fontFamily: "CormorantGaramond_700Bold",
  },
  rangeValue: {
    flex: 1,
    textAlign: "center",
    color: "#2B2B2B",
    fontSize: 16,
    fontFamily: "CormorantGaramond_700Bold",
  },
  filtersSectionTitle: {
    color: "#2B2B2B",
    fontSize: 22,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  filtersPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  filterPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.12)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  filterPillActive: {
    backgroundColor: "#AEBFD1",
    borderColor: "#AEBFD1",
  },
  filterPillText: {
    color: "#2B2B2B",
    fontSize: 14,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  filterPillTextActive: {
    color: "#F6F6F4",
  },
  filtersFooter: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  filtersSecondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  filtersSecondaryButtonText: {
    color: "#2B2B2B",
    fontSize: 15,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  filtersPrimaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#AEBFD1",
  },
  filtersPrimaryButtonText: {
    color: "#F6F6F4",
    fontSize: 15,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
});

export default Home;
