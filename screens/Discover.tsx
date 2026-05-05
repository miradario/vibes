/** @format */

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import DiscoverOrbitCanvas from "../components/DiscoverOrbitCanvas";
import Icon from "../components/Icon";
import UserProfileSheet from "../components/UserProfileSheet";
import type { UserProfileCardData } from "../components/UserProfileCard";
import styles, { DIMENSION_WIDTH } from "../assets/styles";
import type { DataT } from "../types";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  mapCandidateToConnectionProfile,
  mapOwnProfileToConnectionProfile,
} from "../src/lib/connectionProfiles";
import { getGenderLabel } from "../src/constants/lookups";
import { useCandidatesQuery } from "../src/queries/candidates.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { upsertUserPreferences } from "../src/lib/userPreferencesStore";
import { useSwipeMutation } from "../src/queries/swipes.mutations";
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
  options?: { includeNullValue?: boolean },
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

const Discover = () => {
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const { data: ownProfileData } = useProfileQuery(session?.user?.id);
  const {
    data: userPreferences,
    isFetched: hasFetchedUserPreferences,
  } = useUserPreferencesQuery(session?.user?.id);
  const { data: candidates = [], isLoading, isError, error } = useCandidatesQuery();
  const swipeMutation = useSwipeMutation();
  const [discoverFilters, setDiscoverFilters] =
    useState<DiscoverFiltersState>(DEFAULT_FILTERS);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [hasHydratedStoredFilters, setHasHydratedStoredFilters] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<DataT | null>(null);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const ownProfileRecord = (ownProfileData ?? null) as Record<string, any> | null;

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
        } as DataT;
      });
  }, [
    candidates,
    discoverFilters,
    ownProfileRecord?.latitude,
    ownProfileRecord?.longitude,
  ]);

  const errorMessage =
    error instanceof Error && error.message.trim()
      ? error.message
      : "No se pudieron cargar perfiles reales.";
  const ageSummary = formatRangeSummary(
    discoverFilters.ageMin,
    discoverFilters.ageMax,
  );
  const distanceSummary = formatRangeSummary(
    discoverFilters.distanceMinKm,
    discoverFilters.maxDistanceKm,
    " km",
  );
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
      areFiltersEqual(prev, storedFilters) ? prev : storedFilters,
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
      { targetUserId: String(profile.id), direction: "like" },
      {
        onSuccess: (response) => {
          if (response?.match) {
            navigation.navigate("Match" as never, { profile } as never);
          }
        },
        onError: (connectError) =>
          handleApiError(connectError, { toastTitle: "Connect Error" }),
      },
    );

    setShowProfileSheet(false);
  };

  const filterSectionTitle = (title: string) => (
    <Text style={localStyles.filtersSectionTitle}>{title}</Text>
  );

  const updateAgeBoundary = (key: "ageMin" | "ageMax", delta: number) => {
    setDiscoverFilters((prev) => {
      const current = key === "ageMin" ? prev.ageMin : prev.ageMax;
      const rawNext = clampRange(
        (current ?? (key === "ageMin" ? 18 : 99)) + delta,
        18,
        99,
      );
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

      return { ...prev, ageMin, ageMax };
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

      return { ...prev, distanceMinKm, maxDistanceKm };
    });
  };

  return (
    <View style={localStyles.screen}>
      <SafeAreaView style={localStyles.safeArea} edges={["top", "left", "right"]}>
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
                <View style={localStyles.filtersHeaderText}>
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

        <UserProfileSheet
          visible={showProfileSheet}
          profile={selectedProfileForSheet}
          onClose={() => setShowProfileSheet(false)}
          onImagePress={(_image, index) =>
            selectedProfile
              ? openGallery(
                  selectedProfile.images || [selectedProfile.image],
                  index ?? 0,
                )
              : undefined
          }
          onContactPress={() => connectProfile(selectedProfile)}
        />

        <View style={localStyles.header}>
          <Text style={localStyles.title}>Descubrir</Text>
          <TouchableOpacity
            style={localStyles.filtersButton}
            activeOpacity={0.84}
            onPress={() => setIsFiltersVisible(true)}
          >
            <Icon name="options-outline" size={17} color="#2B2B2B" />
            <Text style={localStyles.filtersButtonText}>Filtros</Text>
          </TouchableOpacity>
        </View>

        <View style={localStyles.orbitWrap}>
          {isLoading ? (
            <View style={localStyles.emptyState}>
              <ActivityIndicator color="#2B2B2B" />
              <Text style={localStyles.emptyText}>Cargando perfiles reales...</Text>
            </View>
          ) : isError ? (
            <View style={localStyles.emptyState}>
              <Text style={localStyles.emptyTitle}>No se pudieron cargar</Text>
              <Text style={localStyles.emptyText}>{errorMessage}</Text>
            </View>
          ) : (
            <>
              <DiscoverOrbitCanvas
                users={profiles.filter((item) => item.id !== centerProfile.id)}
                centerUser={centerProfile}
                onCenterPress={() => navigation.navigate("Aura" as never)}
                onUserPress={(profile) => {
                  setSelectedProfile(profile);
                  setShowProfileSheet(true);
                }}
              />
              {profiles.length === 0 ? (
                <View style={localStyles.orbitHint}>
                  <Text style={localStyles.emptyTitle}>Todavía no hay perfiles reales</Text>
                  <Text style={localStyles.emptyText}>
                    Tu perfil queda en el centro. Las demás personas aparecerán alrededor.
                  </Text>
                </View>
              ) : null}
            </>
          )}
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
  header: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 10,
  },
  title: {
    color: "#2B2B2B",
    fontSize: 42,
    lineHeight: 46,
    fontFamily: "CormorantGaramond_700Bold",
  },
  filtersButton: {
    marginTop: 8,
    minHeight: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.10)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  filtersButtonText: {
    color: "#2B2B2B",
    fontSize: 15,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  orbitWrap: {
    flex: 1,
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
  emptyTitle: {
    color: "#2B2B2B",
    fontSize: 24,
    fontFamily: "CormorantGaramond_600SemiBold",
    textAlign: "center",
  },
  emptyText: {
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
  filtersHeaderText: {
    flex: 1,
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

export default Discover;
