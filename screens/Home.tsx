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
import * as Location from "expo-location";

import { CardItem } from "../components";
import DiscoverOrbitCanvas from "../components/DiscoverOrbitCanvas";
import Filters from "../components/Filters";
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
) => {
  if (min === null && max === null) return true;
  if (value === null) return false;
  if (min !== null && value < min) return false;
  if (max !== null && value > max) return false;
  return true;
};

const getActiveFilterCount = (filters: DiscoverFiltersState) =>
  [
    filters.ageMin !== null || filters.ageMax !== null,
    filters.genderId !== null,
    filters.distanceMinKm !== null || filters.maxDistanceKm !== null,
    filters.smoking !== "all",
  ].filter(Boolean).length;

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
  const orbitUsers = profiles.filter((item) => item.id !== centerProfile.id);
  const [showGallery, setShowGallery] = useState<boolean>(false);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState<number>(0);
  const [showProfileSheet, setShowProfileSheet] = useState<boolean>(false);
  const [selectedProfile, setSelectedProfile] = useState<DataT | null>(null);
  const swipeMutation = useSwipeMutation();
  const activeFilterCount = getActiveFilterCount(discoverFilters);
  const filtersSummary =
    activeFilterCount > 0
      ? `${activeFilterCount} activo${activeFilterCount > 1 ? "s" : ""}`
      : "Edad, género, distancia";

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

        <Modal
          visible={showProfileSheet}
          transparent
          animationType="slide"
          onRequestClose={closeProfileSheet}
        >
          <View style={styles.discoverSheetRoot}>
            <TouchableOpacity
              activeOpacity={1}
              style={styles.discoverSheetBackdrop}
              onPress={closeProfileSheet}
            />
            <TouchableOpacity
              style={styles.discoverSheetCloseButton}
              onPress={closeProfileSheet}
              activeOpacity={0.9}
            >
              <Icon name="close" size={20} color="#2B2B2B" />
            </TouchableOpacity>
            <View style={styles.discoverSheetContainer}>
              <View style={styles.discoverSheetHandle} />
              {selectedProfile ? (
                <CardItem
                  variant="discover"
                  image={selectedProfile.image}
                  name={selectedProfile.name}
                  age={selectedProfile.age}
                  location={selectedProfile.location}
                  description={selectedProfile.description}
                  vibe={selectedProfile.vibe}
                  intention={selectedProfile.intention}
                  prompt={selectedProfile.prompt}
                  tags={selectedProfile.tags}
                  preferences={selectedProfile.preferences}
                  spiritualPath={selectedProfile.spiritualPath}
                  spiritualPathDetails={selectedProfile.spiritualPathDetails}
                  vegetarian={selectedProfile.vegetarian}
                  smoking={selectedProfile.smoking}
                  pets={selectedProfile.pets}
                  images={selectedProfile.images}
                  matches={selectedProfile.match}
                  onImagePress={(_image, index) =>
                    openGallery(
                      selectedProfile.images || [selectedProfile.image],
                      index ?? 0,
                    )
                  }
                  onContactPress={() => connectProfile(selectedProfile)}
                />
              ) : null}
            </View>
          </View>
        </Modal>

        <View style={styles.containerHome}>
          <View style={localStyles.discoverTop}>
            <Text style={localStyles.discoverTitle}>Vibes</Text>
          </View>

          <View style={localStyles.discoverOrbitWrap}>
            {isLoading ? (
              <View style={localStyles.emptyState}>
                <ActivityIndicator color="#2B2B2B" />
                <Text style={localStyles.emptyStateText}>
                  Loading real profiles...
                </Text>
              </View>
            ) : isError ? (
              <View style={localStyles.emptyState}>
                <Text style={localStyles.emptyStateTitle}>
                  Could not load profiles
                </Text>
                <Text style={localStyles.emptyStateText}>{errorMessage}</Text>
              </View>
            ) : (
              <View style={localStyles.discoverOrbitContent}>
                <DiscoverOrbitCanvas
                  users={orbitUsers}
                  centerUser={centerProfile}
                  onCenterPress={() => navigation.navigate("Aura" as never)}
                  onUserPress={openProfileSheet}
                />
                {profiles.length === 0 ? (
                  <View style={localStyles.discoverOrbitHint}>
                    <Text style={localStyles.emptyStateTitle}>
                      No real profiles yet
                    </Text>
                    <Text style={localStyles.emptyStateText}>
                      Your profile stays in the center. Other users will appear
                      around it.
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>

          <View style={localStyles.discoverFiltersRow}>
            <Filters
              label="Filtros"
              value={filtersSummary}
              onPress={() => setIsFiltersVisible(true)}
            />
          </View>
        </View>
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
    backgroundColor: "#2B2B2B",
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
    backgroundColor: "#2B2B2B",
    borderColor: "#2B2B2B",
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
    backgroundColor: "#2B2B2B",
  },
  filtersPrimaryButtonText: {
    color: "#F6F6F4",
    fontSize: 15,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
});

export default Home;
