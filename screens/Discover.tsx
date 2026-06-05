/** @format */

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import {
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
import AnimatedSheetModal from "../components/AnimatedSheetModal";
import Icon from "../components/Icon";
import AppHeader from "../components/AppHeader";
import UserProfileSheet from "../components/UserProfileSheet";
import type { UserProfileCardData } from "../components/UserProfileCard";
import styles, { DIMENSION_WIDTH, SERIF_FONT, TEXT_PRIMARY } from "../assets/styles";
import type { DataT } from "../types";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  mapCandidateToConnectionProfile,
  mapOwnProfileToConnectionProfile,
} from "../src/lib/connectionProfiles";
import { useCandidatesQuery } from "../src/queries/candidates.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { upsertUserPreferences } from "../src/lib/userPreferencesStore";
import { useSwipeMutation } from "../src/queries/swipes.mutations";
import { handleApiError } from "../src/utils/handleApiError";
import { useI18n } from "../src/i18n";
import { vibesTheme } from "../src/theme/vibesTheme";
import VibesLoader from "../components/VibesLoader";

type DiscoverFiltersState = {
  ageMin: number | null;
  ageMax: number | null;
  distanceMinKm: number | null;
  maxDistanceKm: number | null;
  smoking: "all" | "no" | "occasionally" | "yes";
};

const DEFAULT_FILTERS: DiscoverFiltersState = {
  ageMin: null,
  ageMax: null,
  distanceMinKm: null,
  maxDistanceKm: null,
  smoking: "all",
};

export type DiscoverContentHandle = {
  openFilters: () => void;
};

type DiscoverContentProps = {
  showHeader?: boolean;
};
const DISCOVER_PAGE_SIZE = 30;
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

  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() &&
      now.getDate() >= birthDate.getDate());

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age > 0 ? age : null;
};

const clampAge = (value: number) =>
  Math.min(MAX_DISCOVER_AGE, Math.max(MIN_DISCOVER_AGE, value));

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

const formatRangeSummary = (
  min: number | null,
  max: number | null,
  suffix = "",
  labels: { any: string; from: string; until: string },
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
  right: DiscoverFiltersState,
) =>
  left.ageMin === right.ageMin &&
  left.ageMax === right.ageMax &&
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

export const DiscoverContent = forwardRef<
  DiscoverContentHandle,
  DiscoverContentProps
>(({ showHeader = true }, ref) => {
  const navigation = useNavigation();
  const { t } = useI18n();
  const { data: session } = useAuthSession();
  const { data: ownProfileData } = useProfileQuery(session?.user?.id);
  const {
    data: userPreferences,
    isFetched: hasFetchedUserPreferences,
  } = useUserPreferencesQuery(session?.user?.id);
  const { data: candidates = [], isLoading, isError, error } = useCandidatesQuery({
    limit: 200,
  });
  const swipeMutation = useSwipeMutation();
  const [discoverFilters, setDiscoverFilters] =
    useState<DiscoverFiltersState>(DEFAULT_FILTERS);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [hasHydratedStoredFilters, setHasHydratedStoredFilters] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<DataT | null>(null);
  const [hiddenProfileIds, setHiddenProfileIds] = useState<Set<string>>(new Set());
  const [dismissedProfiles, setDismissedProfiles] = useState<DataT[]>([]);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const [visibleProfileCount, setVisibleProfileCount] = useState(DISCOVER_PAGE_SIZE);
  const ownProfileRecord = (ownProfileData ?? null) as Record<string, any> | null;

  const centerProfile = useMemo<DataT>(
    () =>
      ({
        ...mapOwnProfileToConnectionProfile(
          {
            ...(ownProfileData ?? {}),
            ...(userPreferences ?? {}),
          },
          session?.user?.email?.split("@")[0],
        ),
        match: "0",
      } as DataT),
    [ownProfileData, session?.user?.email, userPreferences],
  );

  const profiles = useMemo<DataT[]>(() => {
    return candidates
      .filter((candidate) => !hiddenProfileIds.has(String((candidate as Record<string, any>).id)))
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
      .sort((left, right) => {
        const leftDistance =
          typeof left.distanceKm === "number" ? left.distanceKm : Number.POSITIVE_INFINITY;
        const rightDistance =
          typeof right.distanceKm === "number" ? right.distanceKm : Number.POSITIVE_INFINITY;
        return leftDistance - rightDistance;
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
    hiddenProfileIds,
    ownProfileRecord?.latitude,
    ownProfileRecord?.longitude,
  ]);

  const errorMessage =
    error instanceof Error && error.message.trim()
      ? error.message
      : t("discover.loadFailed");
  const ageSummary = formatRangeSummary(
    discoverFilters.ageMin,
    discoverFilters.ageMax,
    "",
    {
      any: t("common.any"),
      from: t("common.from", { value: "" }).trim(),
      until: t("common.until", { value: "" }).trim(),
    },
  );
  const distanceSummary = formatRangeSummary(
    discoverFilters.distanceMinKm,
    discoverFilters.maxDistanceKm,
    " km",
    {
      any: t("common.any"),
      from: t("common.from", { value: "" }).trim(),
      until: t("common.until", { value: "" }).trim(),
    },
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
  const visibleProfiles = useMemo(
    () => profiles.slice(0, visibleProfileCount),
    [profiles, visibleProfileCount],
  );
  const canShowMoreProfiles = visibleProfileCount < profiles.length;

  useEffect(() => {
    setVisibleProfileCount(DISCOVER_PAGE_SIZE);
  }, [discoverFilters, hiddenProfileIds]);

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
    const profileId = String(profile.id);

    setHiddenProfileIds((prev) => new Set(prev).add(profileId));
    setDismissedProfiles((prev) =>
      prev.filter((item) => String(item.id) !== profileId),
    );

    swipeMutation.mutate(
      { targetUserId: profileId, direction: "like" },
      {
        onSuccess: (response) => {
          if (response?.match) {
            navigation.navigate("Match" as never, { profile } as never);
          }
        },
        onError: (connectError) => {
          setHiddenProfileIds((prev) => {
            const next = new Set(prev);
            next.delete(profileId);
            return next;
          });
          handleApiError(connectError, { toastTitle: "Error de conexión" });
        },
      },
    );

    setShowProfileSheet(false);
    setSelectedProfile(null);
  };

  const dismissProfile = (profile: DataT | null) => {
    if (!profile) return;
    const profileId = String(profile.id);

    setHiddenProfileIds((prev) => new Set(prev).add(profileId));
    setDismissedProfiles((prev) => [
      profile,
      ...prev.filter((item) => String(item.id) !== profileId),
    ]);

    swipeMutation.mutate(
      { targetUserId: profileId, direction: "pass" },
      {
        onError: (dismissError) => {
          setHiddenProfileIds((prev) => {
            const next = new Set(prev);
            next.delete(profileId);
            return next;
          });
          setDismissedProfiles((prev) =>
            prev.filter((item) => String(item.id) !== profileId),
          );
          handleApiError(dismissError, { toastTitle: "Dismiss Error" });
        },
      },
    );

    setShowProfileSheet(false);
    setSelectedProfile(null);
  };

  const filterSectionTitle = (title: string) => (
    <Text style={localStyles.filtersSectionTitle}>{title}</Text>
  );

  const adjustAgeMin = (delta: number) => {
    setDiscoverFilters((prev) => {
      const current = prev.ageMin ?? MIN_DISCOVER_AGE;
      let nextAgeMin = clampAge(current + delta);
      if (prev.ageMax !== null) {
        nextAgeMin = Math.min(nextAgeMin, prev.ageMax);
      }
      return { ...prev, ageMin: nextAgeMin };
    });
  };

  const adjustAgeMax = (delta: number) => {
    setDiscoverFilters((prev) => {
      const current = prev.ageMax ?? MAX_DISCOVER_AGE;
      let nextAgeMax = clampAge(current + delta);
      if (prev.ageMin !== null) {
        nextAgeMax = Math.max(nextAgeMax, prev.ageMin);
      }
      return { ...prev, ageMax: nextAgeMax };
    });
  };

  const renderStepperButton = (label: string, onPress: () => void) => (
    <TouchableOpacity
      style={localStyles.rangeStepperButton}
      activeOpacity={0.82}
      onPress={onPress}
    >
      <Text style={localStyles.rangeStepperText}>{label}</Text>
    </TouchableOpacity>
  );

  useImperativeHandle(
    ref,
    () => ({
      openFilters: () => setIsFiltersVisible(true),
    }),
    [],
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

        <AnimatedSheetModal
          visible={isFiltersVisible}
          onClose={() => setIsFiltersVisible(false)}
          offsetY={320}
          sheetStyle={localStyles.filtersSheet}
        >
            <>
              <View style={localStyles.filtersHandle} />
              <View style={localStyles.filtersHeader}>
                <View style={localStyles.filtersHeaderText}>
                  <Text style={localStyles.filtersTitle}>{t("discover.filters")}</Text>
                  <Text style={localStyles.filtersSubtitle}>
                    {t("discover.filtersSubtitle")}
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
                  {filterSectionTitle(t("discover.age"))}
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
                      <Text style={localStyles.rangeReset}>{t("discover.clear")}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={localStyles.rangeRow}>
                    <View style={localStyles.rangeCard}>
                      <Text style={localStyles.rangeLabel}>{t("discover.min")}</Text>
                      <View style={localStyles.rangeControls}>
                        {renderStepperButton("-", () => adjustAgeMin(-1))}
                        <Text style={localStyles.rangeValue}>
                          {discoverFilters.ageMin ?? t("discover.noLimit")}
                        </Text>
                        {renderStepperButton("+", () => adjustAgeMin(1))}
                      </View>
                    </View>
                    <View style={localStyles.rangeCard}>
                      <Text style={localStyles.rangeLabel}>{t("discover.max")}</Text>
                      <View style={localStyles.rangeControls}>
                        {renderStepperButton("-", () => adjustAgeMax(-1))}
                        <Text style={localStyles.rangeValue}>
                          {discoverFilters.ageMax ?? t("discover.noLimit")}
                        </Text>
                        {renderStepperButton("+", () => adjustAgeMax(1))}
                      </View>
                    </View>
                  </View>
                </View>

                <View style={localStyles.filtersSection}>
                  {filterSectionTitle(t("discover.distance"))}
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
                      <Text style={localStyles.rangeReset}>{t("discover.clear")}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={localStyles.rangeRow}>
                    <View style={localStyles.rangeCard}>
                      <Text style={localStyles.rangeLabel}>{t("discover.min")}</Text>
                      <View style={localStyles.rangeControls}>
                        <Text style={localStyles.rangeValue}>
                          {discoverFilters.distanceMinKm === null
                            ? t("discover.noLimit")
                            : `${discoverFilters.distanceMinKm} km`}
                        </Text>
                      </View>
                    </View>
                    <View style={localStyles.rangeCard}>
                      <Text style={localStyles.rangeLabel}>{t("discover.max")}</Text>
                      <View style={localStyles.rangeControls}>
                        <Text style={localStyles.rangeValue}>
                          {discoverFilters.maxDistanceKm === null
                            ? t("discover.noLimit")
                            : `${discoverFilters.maxDistanceKm} km`}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={localStyles.filtersSection}>
                  {filterSectionTitle(t("discover.smoking"))}
                  <View style={localStyles.filtersPillRow}>
                    {(
                      [
                        { value: "all", label: t("discover.smokingAll") },
                        { value: "no", label: t("discover.smokingNo") },
                        { value: "occasionally", label: t("discover.smokingSometimes") },
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
                  onPress={() => setDiscoverFilters(DEFAULT_FILTERS)}
                >
                  <Text style={localStyles.filtersSecondaryButtonText}>
                    {t("discover.clear")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={localStyles.filtersPrimaryButton}
                  onPress={() => setIsFiltersVisible(false)}
                >
                  <Text style={localStyles.filtersPrimaryButtonText}>
                    {t("discover.apply")}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
        </AnimatedSheetModal>

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
          secondaryActionLabel={t("discover.dismiss")}
          onSecondaryActionPress={() => dismissProfile(selectedProfile)}
        />

        {showHeader ? (
          <AppHeader
            title={t("discover.title")}
            style={localStyles.header}
            titleStyle={localStyles.title}
            right={
              <TouchableOpacity
                style={localStyles.filtersButton}
                activeOpacity={0.84}
                onPress={() => setIsFiltersVisible(true)}
              >
                <Icon name="options-outline" size={17} color="#2B2B2B" />
                <Text style={localStyles.filtersButtonText}>{t("discover.filters")}</Text>
              </TouchableOpacity>
            }
          />
        ) : null}

        <View style={localStyles.orbitWrap}>
          {isLoading ? (
            <View style={localStyles.emptyState}>
              <VibesLoader size={86} />
              <Text style={localStyles.emptyText}>{t("discover.loadingProfiles")}</Text>
            </View>
          ) : isError ? (
            <View style={localStyles.emptyState}>
              <Text style={localStyles.emptyTitle}>{t("discover.loadFailed")}</Text>
              <Text style={localStyles.emptyText}>{errorMessage}</Text>
            </View>
          ) : (
            <>
              <DiscoverOrbitCanvas
                users={visibleProfiles.filter((item) => item.id !== centerProfile.id)}
                dismissedUsers={dismissedProfiles}
                centerUser={centerProfile}
                onCenterPress={() => navigation.navigate("Aura" as never)}
                onUserPress={(profile) => {
                  setSelectedProfile(profile);
                  setShowProfileSheet(true);
                }}
                onDismissedUserPress={(profile) => {
                  setSelectedProfile(profile);
                  setShowProfileSheet(true);
                }}
              />
              {canShowMoreProfiles ? (
                <TouchableOpacity
                  style={localStyles.showMoreButton}
                  activeOpacity={0.86}
                  onPress={() =>
                    setVisibleProfileCount((count) => count + DISCOVER_PAGE_SIZE)
                  }
                >
                  <Text style={localStyles.showMoreButtonText}>
                    {t("discover.showMore")}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {profiles.length === 0 ? (
                <View style={localStyles.orbitHint}>
                  <Text style={localStyles.emptyTitle}>{t("discover.noProfiles")}</Text>
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

const Discover = () => <DiscoverContent />;

const localStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFDF8",
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
    color: TEXT_PRIMARY,
    fontSize: 32,
    lineHeight: 38,
    fontFamily: SERIF_FONT,
    textAlign: "center",
  },
  filtersButton: {
    marginTop: 8,
    minHeight: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.82)",
    backgroundColor: "rgba(255, 253, 248, 0.88)",
    paddingHorizontal: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 3,
  },
  filtersButtonText: {
    color: "#2B2B2B",
    fontSize: 15,
    fontFamily: vibesTheme.fonts.semibold,
  },
  orbitWrap: {
    flex: 1,
  },
  showMoreButton: {
    position: "absolute",
    alignSelf: "center",
    bottom: 24,
    minHeight: 46,
    borderRadius: 23,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 253, 248, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.38)",
    shadowColor: "#8C7B63",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  showMoreButtonText: {
    color: "#2B2B2B",
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
  emptyTitle: {
    color: "#2B2B2B",
    fontSize: 24,
    fontFamily: vibesTheme.fonts.semibold,
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
    fontFamily: vibesTheme.fonts.bold,
  },
  filtersSubtitle: {
    marginTop: 4,
    color: "rgba(43, 43, 43, 0.64)",
    fontSize: 15,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.medium,
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
    fontFamily: vibesTheme.fonts.semibold,
  },
  rangeReset: {
    color: "#2B2B2B",
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
    fontFamily: vibesTheme.fonts.semibold,
    textTransform: "uppercase",
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
    color: "#2B2B2B",
    fontSize: 16,
    fontFamily: vibesTheme.fonts.bold,
  },
  rangeStepperButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(174, 191, 209, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
  },
  rangeStepperText: {
    color: "#2B2B2B",
    fontSize: 22,
    lineHeight: 24,
    fontFamily: vibesTheme.fonts.bold,
  },
  filtersSectionTitle: {
    color: "#2B2B2B",
    fontSize: 22,
    fontFamily: vibesTheme.fonts.semibold,
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
    fontFamily: vibesTheme.fonts.semibold,
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
    fontFamily: vibesTheme.fonts.semibold,
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
    fontFamily: vibesTheme.fonts.semibold,
  },
});

export default Discover;
