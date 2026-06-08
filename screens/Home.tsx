/** @format */

import React, { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ImageBackground,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import AnimatedSheetModal from "../components/AnimatedSheetModal";
import Avatar from "../components/Avatar";
import AvatarGroup from "../components/AvatarGroup";
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
import { useEventsFeedQuery } from "../src/queries/events.queries";
import { useMatchesQuery } from "../src/queries/matches.queries";
import { supabase } from "../src/lib/supabase";
import { upsertUserPreferences } from "../src/lib/userPreferencesStore";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { handleApiError } from "../src/utils/handleApiError";
import { vibesTheme } from "../src/theme/vibesTheme";

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

let hasPlayedHomeEntryFade = false;

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

const formatEventDayBox = (startsAt?: string | null) => {
  const fallback = { weekday: "SÁB", day: "25" };
  if (!startsAt) return fallback;

  const parsed = new Date(startsAt);
  if (Number.isNaN(parsed.getTime())) return fallback;

  return {
    weekday: parsed
      .toLocaleDateString("es-AR", { weekday: "short" })
      .slice(0, 3)
      .toUpperCase(),
    day: parsed.toLocaleDateString("es-AR", { day: "2-digit" }),
  };
};

const areFiltersEqual = (
  left: DiscoverFiltersState,
  right: DiscoverFiltersState
) =>
  left.ageMin === right.ageMin &&
  left.ageMax === right.ageMax &&
  left.distanceMinKm === right.distanceMinKm &&
  left.maxDistanceKm === right.maxDistanceKm &&
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
  smoking: normalizeSmoking(
    preferences?.discoverSmoking ?? preferences?.discover_smoking
  ),
});

const Home = () => {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const shouldRunHomeEntryFade =
    Boolean(route.params?.startupFadeIn) && !hasPlayedHomeEntryFade;
  const homeEntryOverlayOpacity = useSharedValue(
    shouldRunHomeEntryFade ? 1 : 0
  );
  const { data: session } = useAuthSession();
  const { data: ownProfileData } = useProfileQuery(session?.user?.id);
  const { data: userPreferences } = useUserPreferencesQuery(session?.user?.id);
  const { data: candidates = [] } = useCandidatesQuery();
  const { data: events = [] } = useEventsFeedQuery();
  const { data: matches = [] } = useMatchesQuery();
  const [discoverFilters, setDiscoverFilters] =
    useState<DiscoverFiltersState>(DEFAULT_FILTERS);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [hasHydratedStoredFilters, setHasHydratedStoredFilters] =
    useState(false);
  const ownProfileRecord = (ownProfileData ?? null) as Record<
    string,
    any
  > | null;
  const profiles = useMemo<DataT[]>(() => {
    return candidates
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

        if (
          !matchesNumberRange(
            candidateAge,
            discoverFilters.ageMin,
            discoverFilters.ageMax,
            { includeNullValue: true }
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
              : null
          ),
          match: profile.match ?? "0",
        };
      }) as DataT[];
  }, [
    candidates,
    discoverFilters,
    ownProfileRecord?.latitude,
    ownProfileRecord?.longitude,
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
  const [showGuruCard, setShowGuruCard] = useState(true);
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
  const nextEvent = futureEvents[0] ?? events[0] ?? null;
  const nextEventDate = formatEventDayBox(nextEvent?.startsAt);
  const isCompactConnectionsCard = width < 390;
  const visibleConnectionPreviewCount = isCompactConnectionsCard ? 2 : 3;
  const connectionPreviewProfiles = profiles.slice(0, visibleConnectionPreviewCount);
  const connectionCount = Math.max(profiles.length, matches.length);
  const guruDismissStorageKey = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return `vibes:home-guru-dismissed:${today}`;
  }, []);
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
    let active = true;

    const loadGuruDismissState = async () => {
      try {
        const stored = await AsyncStorage.getItem(guruDismissStorageKey);
        if (active) {
          setShowGuruCard(stored !== "1");
        }
      } catch {
        if (active) {
          setShowGuruCard(true);
        }
      }
    };

    void loadGuruDismissState();

    return () => {
      active = false;
    };
  }, [guruDismissStorageKey]);

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
          { onConflict: "id" }
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
      initialIndex >= 0 && initialIndex < images.length ? initialIndex : 0
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
          handleApiError(error, { toastTitle: "Error de conexión" }),
      }
    );

    closeProfileSheet();
  };

  const dismissProfile = (profile: DataT | null) => {
    if (!profile) return;

    swipeMutation.mutate(
      {
        targetUserId: String(profile.id),
        direction: "pass",
      },
      {
        onError: (error) =>
          handleApiError(error, { toastTitle: "Dismiss Error" }),
      }
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

  useEffect(() => {
    if (!shouldRunHomeEntryFade) return;

    hasPlayedHomeEntryFade = true;
    homeEntryOverlayOpacity.value = withTiming(0, {
      duration: 680,
      easing: Easing.out(Easing.cubic),
    });

    if (typeof (navigation as any).setParams === "function") {
      (navigation as any).setParams({ startupFadeIn: false });
    }
  }, [homeEntryOverlayOpacity, navigation, shouldRunHomeEntryFade]);

  const homeEntryOverlayStyle = useAnimatedStyle(() => ({
    opacity: homeEntryOverlayOpacity.value,
  }));

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
                  index ?? 0
                )
              : undefined
          }
          onContactPress={() =>
            selectedProfile ? connectProfile(selectedProfile) : undefined
          }
          secondaryActionLabel="Dismiss"
          onSecondaryActionPress={() =>
            selectedProfile ? dismissProfile(selectedProfile) : undefined
          }
        />

        <ScrollView
          style={localStyles.homeScroll}
          contentContainerStyle={localStyles.homeContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={localStyles.heroHeader}>
            <View style={localStyles.heroCopy}>
              <Text
                style={localStyles.heroTitle}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
              >
                Hola, {firstName}
              </Text>
              <Text style={localStyles.heroSubtitle}>
                <Text style={localStyles.heroSubtitleStrong}>Conectá con vos</Text> para poder conectar con otros.
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Ir a tu perfil"
              activeOpacity={0.84}
              onPress={() => navigation.navigate("Aura" as never)}
              style={localStyles.heroAvatarButton}
            >
              <Ionicons name="person-outline" size={30} color="#2B2B2B" />
            </TouchableOpacity>
          </View>

          {showGuruCard ? (
            <ImageBackground
              source={require("../assets/images/guruVibes.png")}
              imageStyle={localStyles.featureImage}
              resizeMode="cover"
              style={localStyles.guruFeatureCard}
            >
              <View style={localStyles.featureScrim} />
              <View style={localStyles.guruBadgeRow}>
                <View style={localStyles.guruFeatureBadge}>
                  <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
                </View>
                <Text style={localStyles.featureEyebrow}>GURU VIBES</Text>
              </View>
              <Text style={localStyles.featureTitle}>
                Toma una respiración profunda.
              </Text>
              <Text style={localStyles.featureBody}>
                Tu energía ya sabe hacia dónde abrirse. Elegí desde la calma y
                dejá que Vibes acerque lo que hoy resuena con vos.
              </Text>
            </ImageBackground>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.86}
            style={localStyles.connectionsCard}
            onPress={() =>
              navigation.navigate(
                "Tab" as never,
                {
                  screen: "Calendar",
                  params: { initialSection: "discover" },
                } as never
              )
            }
          >
            <Text style={localStyles.connectionsEyebrow}>
              NUEVAS CONEXIONES
            </Text>
            <View style={localStyles.connectionsRow}>
              <View style={localStyles.connectionAvatars}>
                {connectionPreviewProfiles.length > 0
                  ? connectionPreviewProfiles.map((profile, index) => (
                      <View
                        key={String(profile.id ?? index)}
                        style={[
                          localStyles.connectionAvatarWrap,
                          index > 0 && localStyles.connectionAvatarOverlap,
                        ]}
                      >
                        <Avatar uri={profile.avatarUri ?? null} size={52} />
                        <View style={localStyles.connectionDot} />
                      </View>
                    ))
                  : Array.from({ length: visibleConnectionPreviewCount }).map((_, item) => (
                      <Image
                        key={`placeholder-${item}`}
                        source={require("../assets/images/01.jpg")}
                        style={[
                          localStyles.connectionAvatarPlaceholder,
                          item > 0 && localStyles.connectionAvatarOverlap,
                        ]}
                      />
                    ))}
              </View>
              {connectionPreviewProfiles.length === 0 ? (
                <View style={localStyles.connectionIconCircle}>
                  <Ionicons name="people-outline" size={32} color="#8E78A8" />
                </View>
              ) : null}
              <View style={localStyles.connectionsCopy}>
                <Text style={localStyles.connectionsText}>
                  {Math.max(3, connectionCount)} nuevas personas vibran parecido
                  a vos
                </Text>
                <View style={localStyles.inlineLink}>
                  <Text style={localStyles.inlineLinkText}>Ver más</Text>
                  <Ionicons name="chevron-forward" size={18} color="#14283E" />
                </View>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.86}
            style={localStyles.eventPreviewCard}
            onPress={() =>
              nextEvent
                ? navigation.navigate(
                    "EventDetail" as never,
                    { event: nextEvent } as never
                  )
                : navigation.navigate(
                    "Tab" as never,
                    {
                      screen: "EventsTab",
                      params: { section: "event" },
                    } as never
                  )
            }
          >
            <Text style={localStyles.eventPreviewEyebrow}>
              PRÓXIMOS EVENTOS
            </Text>
            <View style={localStyles.eventPreviewRow}>
              <View style={localStyles.eventDateBox}>
                <Text style={localStyles.eventDateWeekday}>
                  {nextEventDate.weekday}
                </Text>
                <Text style={localStyles.eventDateDay}>
                  {nextEventDate.day}
                </Text>
              </View>
              <View style={localStyles.eventPreviewCopy}>
                <Text style={localStyles.eventPreviewTitle} numberOfLines={1}>
                  {nextEvent?.title ?? "Círculo de conexión"}
                </Text>
                <Text style={localStyles.eventPreviewMeta} numberOfLines={1}>
                  {nextEvent?.date ?? "Sábado 25 de mayo · 18:00"}
                </Text>
                <View style={localStyles.eventParticipantsRow}>
                  <AvatarGroup
                    size={24}
                    overlap={7}
                    max={4}
                    items={Array.from({ length: 4 }).map((_, index) => ({
                      id: `event-preview-${index}`,
                      uri:
                        nextEvent?.participantPreviewImages?.[index] ??
                        nextEvent?.hostImage ??
                        null,
                    }))}
                  />
                  <Text style={localStyles.eventParticipantsText}>
                    {nextEvent?.attendees ?? "12 personas se suman"}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={32} color="#6D6D6D" />
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
      <Animated.View
        pointerEvents="none"
        style={[localStyles.homeEntryOverlay, homeEntryOverlayStyle]}
      />
    </View>
  );
};

const localStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F7F4",
  },
  homeEntryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: vibesTheme.colors.background,
    zIndex: 999,
  },
  safeArea: {
    flex: 1,
  },
  homeScroll: {
    flex: 1,
  },
  homeContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 118,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginBottom: 16,
  },
  heroAvatarButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    color: "#252323",
    fontSize: 17,
    lineHeight: 22,
    fontFamily: vibesTheme.fonts.medium,
  },
  heroSubtitle: {
    marginTop: 10,
    color: "#727070",
    fontSize: 20,
    lineHeight: 27,
    fontFamily: vibesTheme.fonts.regular,
  },
  heroSubtitleStrong: {
    color: "#142033",
    fontFamily: vibesTheme.fonts.semibold,
  },
  featureImage: {
    ...StyleSheet.absoluteFillObject,
    width: "148%",
    height: "148%",
    borderRadius: 20,
    transform: [{ translateX: -58 }, { translateY: -38 }],
  },
  guruFeatureCard: {
    minHeight: 184,
    borderRadius: 20,
    overflow: "hidden",
    paddingHorizontal: 22,
    paddingVertical: 18,
    justifyContent: "flex-start",
    marginBottom: 14,
    backgroundColor: "#FFF1DE",
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  featureScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 244, 228, 0.28)",
  },
  guruBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  guruFeatureBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0C879",
  },
  featureEyebrow: {
    color: "#D69A27",
    fontSize: 12,
    lineHeight: 15,
    fontFamily: vibesTheme.fonts.bold,
  },
  featureTitle: {
    maxWidth: "62%",
    color: "#13263C",
    fontSize: 22,
    lineHeight: 27,
    fontFamily: vibesTheme.fonts.regular,
  },
  featureBody: {
    maxWidth: "58%",
    marginTop: 8,
    color: "#3D3A37",
    fontSize: 13,
    lineHeight: 17,
    fontFamily: vibesTheme.fonts.regular,
  },
  connectionsCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.06)",
    paddingHorizontal: 20,
    paddingVertical: 22,
    marginBottom: 18,
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  connectionsEyebrow: {
    color: "#8E78A8",
    fontSize: 14,
    lineHeight: 18,
    fontFamily: vibesTheme.fonts.bold,
    marginBottom: 18,
  },
  connectionsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  connectionAvatars: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
  connectionAvatarWrap: {
    position: "relative",
  },
  connectionAvatarOverlap: {
    marginLeft: -12,
  },
  connectionAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  connectionDot: {
    position: "absolute",
    top: -2,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#DCA338",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  connectionIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0EAF2",
    flexShrink: 0,
  },
  connectionsCopy: {
    flex: 1,
    minWidth: 0,
  },
  connectionsText: {
    color: "#595754",
    fontSize: 15,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.regular,
  },
  inlineLink: {
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  inlineLinkText: {
    color: "#14283E",
    fontSize: 16,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.semibold,
  },
  eventPreviewCard: {
    borderRadius: 20,
    backgroundColor: "#FFF8EE",
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.16)",
    paddingHorizontal: 28,
    paddingVertical: 22,
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  eventPreviewEyebrow: {
    color: "#D69A27",
    fontSize: 14,
    lineHeight: 18,
    fontFamily: vibesTheme.fonts.bold,
    marginBottom: 18,
  },
  eventPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  eventDateBox: {
    width: 82,
    height: 82,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.68)",
  },
  eventDateWeekday: {
    color: "#625D57",
    fontSize: 15,
    lineHeight: 18,
    fontFamily: vibesTheme.fonts.semibold,
  },
  eventDateDay: {
    color: "#14283E",
    fontSize: 36,
    lineHeight: 40,
    fontFamily: vibesTheme.fonts.medium,
  },
  eventPreviewCopy: {
    flex: 1,
    minWidth: 0,
  },
  eventPreviewTitle: {
    color: "#252323",
    fontSize: 20,
    lineHeight: 24,
    fontFamily: vibesTheme.fonts.medium,
  },
  eventPreviewMeta: {
    marginTop: 6,
    color: "#625D57",
    fontSize: 14,
    lineHeight: 18,
    fontFamily: vibesTheme.fonts.regular,
  },
  eventParticipantsRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  eventParticipantsText: {
    flex: 1,
    color: "#716B65",
    fontSize: 14,
    lineHeight: 18,
    fontFamily: vibesTheme.fonts.regular,
  },
  summaryCard: {
    minHeight: 116,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowColor: "#3E352B",
    shadowOffset: { height: 6, width: 0 },
    padding: 12,
    marginBottom: 16,
  },
  summaryTitle: {
    color: "#2B2B2B",
    fontSize: 24,
    lineHeight: 28,
    fontFamily: vibesTheme.fonts.regular,
    marginBottom: 8,
  },
  summaryContent: {
    justifyContent: "center",
  },
  statsRow: {
    gap: 6,
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
    height: 1,
    backgroundColor: "rgba(43, 43, 43, 0.08)",
  },
  statLead: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  statValue: {
    color: "#4B3728",
    fontSize: 24,
    lineHeight: 26,
    fontFamily: vibesTheme.fonts.regular,
  },
  statMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
    gap: 4,
  },
  statLabel: {
    color: "#3F3A36",
    fontSize: 15,
    lineHeight: 17,
    fontFamily: vibesTheme.fonts.regular,
    flexShrink: 1,
  },
  meditationCard: {
    minHeight: 102,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "rgba(174, 191, 209, 0.20)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.74)",
    marginBottom: 18,
    position: "relative",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowColor: "#CFD7E5",
    shadowOffset: { height: 8, width: 0 },
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    borderRadius: 24,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  meditationButtonIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.64)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.84)",
  },
  meditationButtonCopy: {
    flex: 1,
  },
  meditationButtonTitle: {
    color: "#24364A",
    fontSize: 24,
    lineHeight: 26,
    fontFamily: vibesTheme.fonts.regular,
  },
  meditationButtonSubtitle: {
    marginTop: 4,
    color: "#314762",
    fontSize: 16,
    lineHeight: 18,
    fontFamily: vibesTheme.fonts.regular,
  },
  meditationArrowWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.64)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.84)",
  },
  meditationButtonArrow: {
    marginLeft: 2,
  },
  guruCard: {
    borderRadius: 20,
    backgroundColor: "#FFF9EF",
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.22)",
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 18,
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowColor: "#3E352B",
    shadowOffset: { height: 7, width: 0 },
  },
  guruCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  guruCardHeading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  guruBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DCA453",
  },
  guruCopy: {
    flex: 1,
  },
  guruDismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(122, 116, 109, 0.08)",
  },
  guruTitle: {
    color: "#2B2B2B",
    fontSize: 22,
    lineHeight: 26,
    fontFamily: vibesTheme.fonts.regular,
  },
  guruSubtitle: {
    marginTop: 2,
    color: "#7A746D",
    fontSize: 13,
    lineHeight: 16,
    fontFamily: vibesTheme.fonts.regular,
  },
  guruChallengeName: {
    marginTop: 12,
    color: "#4B3728",
    fontSize: 16,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.regular,
  },
  guruBreathPrompt: {
    marginTop: 10,
    color: "#2B2B2B",
    fontSize: 18,
    lineHeight: 24,
    fontFamily: vibesTheme.fonts.regular,
  },
  guruBody: {
    marginTop: 6,
    color: "#4D453F",
    fontSize: 17,
    lineHeight: 25,
    fontFamily: vibesTheme.fonts.regular,
  },
  presenceCard: {
    borderRadius: 20,
    backgroundColor: "#FDFBF7",
    borderWidth: 1,
    borderColor: "rgba(174, 191, 209, 0.20)",
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 18,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowColor: "#3E352B",
    shadowOffset: { height: 6, width: 0 },
  },
  presenceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  presenceTitle: {
    color: "#2B2B2B",
    fontSize: 19,
    lineHeight: 22,
    fontFamily: vibesTheme.fonts.regular,
  },
  presenceSubtitle: {
    marginTop: 3,
    color: "#7A746D",
    fontSize: 13,
    lineHeight: 17,
    fontFamily: vibesTheme.fonts.regular,
  },
  presenceBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(228, 183, 110, 0.14)",
  },
  presenceRow: {
    gap: 14,
    paddingTop: 14,
    paddingBottom: 2,
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
    borderRadius: 30,
    backgroundColor: "rgba(174, 191, 209, 0.18)",
  },
  presenceAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: "#EEF2F6",
  },
  presenceName: {
    marginTop: 8,
    color: "#2B2B2B",
    fontSize: 13,
    lineHeight: 16,
    fontFamily: vibesTheme.fonts.regular,
  },
  presenceMeta: {
    marginTop: 2,
    color: "#7A746D",
    fontSize: 11,
    lineHeight: 14,
    fontFamily: vibesTheme.fonts.regular,
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
    fontFamily: vibesTheme.fonts.regular,
  },
  sectionLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  sectionLinkText: {
    color: "#8A8178",
    fontSize: 16,
    fontFamily: vibesTheme.fonts.regular,
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
    borderColor: "rgba(228, 183, 110, 0.30)",
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 14,
    backgroundColor: "rgba(255, 246, 234, 0.96)",
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
    backgroundColor: "#F7E7CC",
  },
  feedListRow: {
    minHeight: 96,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 2,
  },
  feedListRowChallenge: {
    backgroundColor: "rgba(255, 246, 234, 0.96)",
    borderColor: "rgba(228, 183, 110, 0.30)",
  },
  feedListThumb: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#F0E8DE",
  },
  feedListInfo: {
    flex: 1,
  },
  feedListTitle: {
    color: "#252323",
    fontSize: 18,
    lineHeight: 22,
    fontFamily: vibesTheme.fonts.regular,
    marginBottom: 4,
  },
  feedListMeta: {
    color: "#7A746D",
    fontSize: 14,
    lineHeight: 17,
    fontFamily: vibesTheme.fonts.regular,
  },
  feedCommunityRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  feedCommunityText: {
    flex: 1,
    color: "#916E39",
    fontSize: 13,
    lineHeight: 16,
    fontFamily: vibesTheme.fonts.regular,
  },
  feedListBottomRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  feedAvatarStack: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 56,
  },
  feedAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  feedArrowWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  feedProgressPill: {
    alignSelf: "flex-start",
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(174, 191, 209, 0.18)",
  },
  feedProgressPillPending: {
    backgroundColor: "rgba(228, 183, 110, 0.18)",
  },
  feedProgressPillDone: {
    backgroundColor: "rgba(216, 140, 122, 0.18)",
  },
  feedProgressText: {
    color: "#5F6E7D",
    fontSize: 12,
    lineHeight: 14,
    fontFamily: vibesTheme.fonts.regular,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    color: "#252323",
    fontSize: 20,
    lineHeight: 24,
    fontFamily: vibesTheme.fonts.regular,
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
    fontFamily: vibesTheme.fonts.regular,
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
  discoverTop: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 6,
  },
  discoverTitle: {
    fontSize: 42,
    lineHeight: 46,
    color: "#2B2B2B",
    fontFamily: vibesTheme.fonts.regular,
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
    fontFamily: vibesTheme.fonts.regular,
    textAlign: "center",
  },
  emptyStateText: {
    marginTop: 10,
    color: "rgba(43, 43, 43, 0.7)",
    fontSize: 16,
    lineHeight: 22,
    fontFamily: vibesTheme.fonts.regular,
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
  filtersTitle: {
    color: "#2B2B2B",
    fontSize: 30,
    fontFamily: vibesTheme.fonts.regular,
  },
  filtersSubtitle: {
    marginTop: 4,
    color: "rgba(43, 43, 43, 0.64)",
    fontSize: 15,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.regular,
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
    fontFamily: vibesTheme.fonts.regular,
  },
  rangeReset: {
    color: "#2B2B2B",
    fontSize: 14,
    fontFamily: vibesTheme.fonts.regular,
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
    fontFamily: vibesTheme.fonts.regular,
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
    fontFamily: vibesTheme.fonts.regular,
  },
  filtersSectionTitle: {
    color: "#2B2B2B",
    fontSize: 22,
    fontFamily: vibesTheme.fonts.regular,
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
    fontFamily: vibesTheme.fonts.regular,
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
    fontFamily: vibesTheme.fonts.regular,
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
    fontFamily: vibesTheme.fonts.regular,
  },
});

export default Home;
