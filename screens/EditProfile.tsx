import {
  onboardingFullName,
  splitOnboardingName,
} from "../src/lib/onboardingBasics";
import ProfilePhotoPicker from "../components/onboarding/ProfilePhotoPicker";
import VibesLoader from "../components/VibesLoader";
import { saveProfilePhotoSelection } from "../src/queries/onboarding.queries";
import CountrySelector from "../components/CountrySelector";
import {
  findCountryCodeByName,
  normalizeCountryForStorage,
} from "../src/constants/countries";
import { saveProfileNationality } from "../src/lib/profileNationality";
/** @format */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Linking,
} from "react-native";
import { Text, TextInput } from "../components/Typography";
import {
  useIsFocused,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import styles, {
  BLACK,
  DARK_GRAY,
  GRAY,
  PRIMARY_COLOR,
  WHITE,
} from "../assets/styles";
import Icon from "../components/Icon";
import AppHeader from "../components/AppHeader";
import EmailVerificationCard from "../components/EmailVerificationCard";
import ScreenContainer from "../components/ScreenContainer";
import * as Location from "expo-location";
import { supabase } from "../src/lib/supabase";
import { useAuthSession } from "../src/auth/auth.queries";
import { profileKeys, useProfileQuery } from "../src/queries/profile.queries";

import { useI18n } from "../src/i18n";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

const PROFILE_SINGLE_PHOTO_KEYS = [
  "photo_url",
  "avatar_url",
  "image_url",
  "picture_url",
  "photo",
  "avatar",
  "image",
  "profile_photo",
  "profile_picture",
] as const;

const buildProfilePhotosFromRow = (profileRow: Record<string, any> | null) => {
  if (!profileRow) return [];
  if (Array.isArray(profileRow.photos)) {
    return profileRow.photos
      .map((photo: any, index: number) => {
        if (typeof photo === "string" && photo.trim().length > 0) {
          return {
            url: photo.trim(),
            order: index,
          };
        }

        if (
          photo &&
          typeof photo === "object" &&
          typeof photo.url === "string" &&
          photo.url.trim().length > 0
        ) {
          return {
            url: photo.url.trim(),
            order: typeof photo.order === "number" ? photo.order : index,
          };
        }

        return null;
      })
      .filter(
        (
          photo
        ): photo is {
          url: string;
          order: number;
        } => Boolean(photo)
      )
      .sort((left, right) => left.order - right.order)
      .reduce<string[]>((acc, photo) => {
        acc[photo.order] = photo.url;
        return acc;
      }, []);
  }

  for (const key of PROFILE_SINGLE_PHOTO_KEYS) {
    const value = profileRow[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return [value];
    }
  }

  return [];
};

type ResolvedLocationMeta = {
  label: string;
  neighborhood: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
};

const formatCityCountryLabel = (
  city?: string | null,
  country?: string | null
) =>
  [city, country]
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .join(", ");

const parseCityCountryFromLabel = (label?: string | null) => {
  const parts =
    typeof label === "string"
      ? label
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

  return {
    city: parts.length > 1 ? parts[parts.length - 2] : parts[0] ?? "",
    country: parts.length > 1 ? parts[parts.length - 1] : "",
  };
};

const EditProfile = () => {
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const route = useRoute();
  const focused = useIsFocused();
  const photoRequestId = (
    route.params as { photoRequestId?: number } | undefined
  )?.photoRequestId;
  const leaveProfile = (saved = false) => {
    if (!saved && (photoSaveBusy.current || savingProfile)) return;
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Tab" as never, { screen: "Home" } as never);
    }
  };
  const queryClient = useQueryClient();
  const { data: session } = useAuthSession();
  const { data: profileData, refetch } = useProfileQuery(session?.user?.id);

  const maxPhotos = 6;
  const supportsMultiPhotos = useMemo(
    () => Array.isArray((profileData as any)?.photos),
    [profileData]
  );
  const profilePhotos = useMemo(
    () => buildProfilePhotosFromRow(profileData ?? null),
    [profileData]
  );
  const buildSlots = (photos: (string | undefined | null)[]) =>
    Array.from({ length: maxPhotos }, (_, index) => photos[index] ?? null);
  const [mediaSlots, setMediaSlots] = useState<(string | null)[]>(
    buildSlots(profilePhotos)
  );

  useEffect(() => {
    if (!supportsMultiPhotos) return;
    const nextSlots = buildSlots(profilePhotos);
    setMediaSlots((prev) => {
      const isSame =
        prev.length === nextSlots.length &&
        prev.every((item, index) => item === nextSlots[index]);
      return isSame ? prev : nextSlots;
    });
  }, [profilePhotos, supportsMultiPhotos]);

  const [firstName, setFirstName] = useState(
    () => splitOnboardingName(profileData?.displayName ?? "").firstName
  );
  const [lastName, setLastName] = useState(
    () => splitOnboardingName(profileData?.displayName ?? "").lastName
  );
  const displayName = onboardingFullName(firstName, lastName);
  const [savingName, setSavingName] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPhotos, setSavingPhotos] = useState(false);
  const [photoOriginals, setPhotoOriginals] = useState<Record<string, string>>(
    {}
  );
  const photoSaveBusy = useRef(false);
  const handlePhotoSelection = async (
    uris: string[],
    originals?: Record<string, string>
  ) => {
    const userId = session?.user?.id;
    if (!userId || photoSaveBusy.current) return;
    photoSaveBusy.current = true;
    setSavingPhotos(true);
    try {
      await saveProfilePhotoSelection(userId, uris);
      await refreshProfileCache();
      const refreshed = queryClient.getQueryData<Record<string, any>>(
        profileKeys.byUser(userId)
      );
      const savedUris = buildProfilePhotosFromRow(refreshed ?? null).filter(
        Boolean
      );
      setPhotoOriginals(
        Object.fromEntries(
          savedUris.map((uri, index) => [
            uri!,
            originals?.[uris[index]] ?? uris[index],
          ])
        )
      );
    } catch (error) {
      Alert.alert(
        t("common.error"),
        locale.startsWith("en")
          ? "Could not save photos. Please try again."
          : "No se pudieron guardar las fotos. Intentá de nuevo."
      );
      await refreshProfileCache();
    } finally {
      photoSaveBusy.current = false;
      setSavingPhotos(false);
    }
  };
  const [profileCity, setProfileCity] = useState("");
  const [profileCountry, setProfileCountry] = useState("");
  const [profileNeighborhood, setProfileNeighborhood] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [currentLocationMeta, setCurrentLocationMeta] =
    useState<ResolvedLocationMeta | null>(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [savingNationality, setSavingNationality] = useState(false);
  const nationalitySaving = useRef(false);
  const updateNationality = async (codes: string[]) => {
    const userId = session?.user?.id;
    if (!userId || nationalitySaving.current) return;
    nationalitySaving.current = true;
    setSavingNationality(true);
    try {
      const nationalityCode = await saveProfileNationality(
        userId,
        codes[0] ?? null
      );
      queryClient.setQueryData(
        profileKeys.byUser(userId),
        (previous: Record<string, unknown> | undefined) => ({
          ...previous,
          nationalityCode,
        })
      );
      await queryClient.invalidateQueries({ queryKey: profileKeys.all });
      await queryClient.invalidateQueries({ queryKey: ["candidates"] });
    } catch (error) {
      console.warn("saveNationality:error", error);
      Alert.alert(
        t("common.error"),
        locale.startsWith("en")
          ? "Could not save nationality. Please try again."
          : "No se pudo guardar la nacionalidad. Intentá de nuevo."
      );
    } finally {
      nationalitySaving.current = false;
      setSavingNationality(false);
    }
  };

  const refreshProfileCache = async () => {
    const userId = session?.user?.id;
    const refreshed = await refetch();
    if (refreshed.error) throw refreshed.error;

    if (!userId || refreshed.data === undefined) return;

    queryClient.setQueryData(profileKeys.byUser(userId), refreshed.data);
    await queryClient.invalidateQueries({ queryKey: profileKeys.all });
    await queryClient.invalidateQueries({ queryKey: ["candidates"] });
  };

  useEffect(() => {
    const name = (profileData as any)?.displayName;
    if (typeof name === "string") {
      const parts = splitOnboardingName(name);
      setFirstName(parts.firstName);
      setLastName(parts.lastName);
    }
  }, [(profileData as any)?.displayName]);

  useEffect(() => {
    const parsedFallback = parseCityCountryFromLabel(
      profileData?.locationLabel
    );
    const nextCity =
      typeof profileData?.city === "string" && profileData.city.trim()
        ? profileData.city
        : parsedFallback.city;
    const nextCountry =
      typeof profileData?.country === "string" && profileData.country.trim()
        ? profileData.country
        : parsedFallback.country;

    setProfileCity(nextCity);
    setProfileCountry(nextCountry);
    setProfileNeighborhood(profileData?.neighborhood ?? "");
  }, [
    profileData?.city,
    profileData?.country,
    profileData?.neighborhood,
    profileData?.locationLabel,
  ]);

  useEffect(() => {
    let active = true;

    const loadCurrentLocation = async () => {
      setIsResolvingLocation(true);
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!active || permission.status !== "granted") return;

        const current = await Location.getCurrentPositionAsync({});
        if (!active) return;

        const [address] = await Location.reverseGeocodeAsync({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
        if (!active) return;

        const city = address?.city ?? address?.region ?? null;
        const country =
          normalizeCountryForStorage(address?.country, locale) || null;
        const neighborhood = address?.district?.trim() || null;
        const label = Array.from(
          new Set([neighborhood, city, country].filter(Boolean))
        ).join(", ");

        if (!label) return;

        setCurrentLocation(label);
        setCurrentLocationMeta({
          label,
          neighborhood,
          city,
          country,
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
      } catch (_error) {
        // Keep editing available even if geolocation fails.
      } finally {
        if (active) {
          setIsResolvingLocation(false);
        }
      }
    };

    loadCurrentLocation();

    return () => {
      active = false;
    };
  }, []);

  const saveDisplayName = async () => {
    const userId = session?.user?.id;
    if (!userId || !firstName.trim()) return false;
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() })
        .eq("id", userId);
      if (error) {
        Alert.alert(t("common.error"), t("editProfile.saveNameError"));
        console.error("saveDisplayName:error", error);
        return false;
      } else {
        await refreshProfileCache();
        return true;
      }
    } catch (err) {
      console.error("saveDisplayName:error", err);
      Alert.alert(t("common.error"), t("editProfile.saveNameError"));
      return false;
    } finally {
      setSavingName(false);
    }
  };

  const saveLocation = async (
    nextCity = profileCity,
    nextCountry = profileCountry,
    nextNeighborhood = profileNeighborhood
  ) => {
    const userId = session?.user?.id;
    if (!userId) return false;

    const trimmedCity = nextCity.trim();
    const trimmedCountry = nextCountry.trim();
    const locationLabel = Array.from(
      new Set(
        [nextNeighborhood.trim(), trimmedCity, trimmedCountry].filter(Boolean)
      )
    ).join(", ");
    setSavingLocation(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          city: trimmedCity || null,
          country: trimmedCountry || null,
          neighborhood: nextNeighborhood.trim() || null,
          location_label: locationLabel || null,
        })
        .eq("id", userId);

      if (error) {
        Alert.alert(t("common.error"), t("settings.saveError"));
        console.error("saveLocation:error", error);
        return false;
      } else {
        await refreshProfileCache();
        return true;
      }
    } catch (error) {
      Alert.alert(t("common.error"), t("settings.saveError"));
      console.error("saveLocation:error", error);
      return false;
    } finally {
      setSavingLocation(false);
    }
  };

  const applyCurrentLocation = async () => {
    const userId = session?.user?.id;
    if (!userId) return;

    if (!currentLocationMeta) {
      return;
    }

    const nextCity = currentLocationMeta.city?.trim() ?? "";
    const nextCountry = currentLocationMeta.country?.trim() ?? "";
    setProfileCity(nextCity);
    setProfileCountry(nextCountry);
    setProfileNeighborhood(currentLocationMeta.neighborhood ?? "");
    setSavingLocation(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          location_label: currentLocationMeta.label,
          neighborhood: currentLocationMeta.neighborhood,
          city: currentLocationMeta.city,
          country: currentLocationMeta.country,
          latitude: currentLocationMeta.latitude,
          longitude: currentLocationMeta.longitude,
        })
        .eq("id", userId);

      if (error) {
        Alert.alert(t("common.error"), t("settings.saveError"));
        console.error("applyCurrentLocation:error", error);
      } else {
        await refreshProfileCache();
      }
    } catch (error) {
      console.error("applyCurrentLocation:error", error);
    } finally {
      setSavingLocation(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScreenContainer
        scroll
        edges={["top", "bottom", "left", "right"]}
        scrollViewProps={{
          style: styles.editContainer,
          showsVerticalScrollIndicator: false,
          keyboardShouldPersistTaps: "handled",
          keyboardDismissMode: "on-drag",
        }}
        contentContainerStyle={localStyles.scrollContent}
      >
        <AppHeader
          title={t("editProfile.title")}
          showBack
          onBack={leaveProfile}
          style={localStyles.header}
          titleStyle={[styles.title, { fontFamily: vibesTheme.fonts.semibold }]}
        />

        <View style={styles.editSection}>
          <View
            pointerEvents={savingPhotos ? "none" : "auto"}
            accessibilityState={{ busy: savingPhotos }}
          >
            <ProfilePhotoPicker
              uris={mediaSlots.filter((uri): uri is string => Boolean(uri))}
              originalUris={photoOriginals}
              requestOpen={focused && profileData ? photoRequestId : undefined}
              onChange={(uris, originals) =>
                void handlePhotoSelection(uris, originals)
              }
            />
          </View>
          {savingPhotos ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: ds.spacing[2] }}
            >
              <VibesLoader size={24} />
              <Text>
                {locale.startsWith("en")
                  ? "Saving photos…"
                  : "Guardando fotos…"}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.editSection}>
          <Text style={styles.editSectionTitle}>{t("editProfile.name")}</Text>
          <TextInput
            style={localStyles.nameInput}
            value={firstName}
            onChangeText={setFirstName}
            autoComplete="given-name"
            autoCapitalize="words"
            onBlur={() => void saveDisplayName()}
            onSubmitEditing={() => void saveDisplayName()}
            placeholder={t("editProfile.namePlaceholder")}
            placeholderTextColor={GRAY}
            returnKeyType="done"
            editable={!savingName}
            maxLength={50}
          />
        </View>

        <View style={styles.editSection}>
          <Text style={styles.editSectionTitle}>
            {locale.startsWith("en") ? "Last name" : "Apellido"}
          </Text>
          <TextInput
            style={localStyles.nameInput}
            accessibilityLabel={
              locale.startsWith("en")
                ? "Last name, optional"
                : "Apellido, opcional"
            }
            value={lastName}
            onChangeText={setLastName}
            onBlur={() => void saveDisplayName()}
            onSubmitEditing={() => void saveDisplayName()}
            placeholder={
              locale.startsWith("en")
                ? "Enter your last name"
                : "Ingresá tu apellido"
            }
            placeholderTextColor={GRAY}
            autoComplete="family-name"
            autoCapitalize="words"
            returnKeyType="done"
            editable={!savingName}
            maxLength={50}
          />
        </View>

        <View style={styles.editSection}>
          <Text style={styles.editSectionTitle}>{t("editProfile.email")}</Text>
          <EmailVerificationCard
            userId={session?.user?.id}
            email={session?.user?.email}
          />
        </View>

        <View style={styles.editSection}>
          <Text style={styles.editSectionTitle}>
            {t("editProfile.location")}
          </Text>
          <View style={localStyles.locationFields}>
            <CountrySelector
              title={locale.startsWith("en") ? "Country" : "País"}
              selected={(() => {
                const code = findCountryCodeByName(profileCountry);
                return code ? [code] : [];
              })()}
              fallbackLabel={profileCountry}
              onChange={(codes) => {
                const nextCountry = codes[0]
                  ? normalizeCountryForStorage(codes[0], locale)
                  : "";
                setProfileCountry(nextCountry);
                void saveLocation(profileCity, nextCountry);
              }}
              disabled={savingLocation}
            />
            <TextInput
              style={localStyles.nameInput}
              value={profileCity}
              onChangeText={setProfileCity}
              onBlur={() => void saveLocation()}
              onSubmitEditing={() => void saveLocation()}
              placeholder={t("settings.cityPlaceholder")}
              placeholderTextColor={GRAY}
              autoCapitalize="words"
              returnKeyType="next"
              editable={!savingLocation}
            />
            <TextInput
              style={localStyles.nameInput}
              accessibilityLabel={
                locale.startsWith("en") ? "Neighborhood" : "Barrio"
              }
              value={profileNeighborhood}
              onChangeText={setProfileNeighborhood}
              onBlur={() => void saveLocation()}
              onSubmitEditing={() => void saveLocation()}
              placeholder={
                locale.startsWith("en")
                  ? "Neighborhood (optional)"
                  : "Barrio (opcional)"
              }
              placeholderTextColor={GRAY}
              autoCapitalize="words"
              returnKeyType="done"
              editable={!savingLocation}
              maxLength={100}
            />
          </View>
          {currentLocation ? (
            <TouchableOpacity
              style={localStyles.currentLocationButton}
              onPress={() => void applyCurrentLocation()}
              disabled={savingLocation}
            >
              <Text style={localStyles.currentLocationButtonText}>
                {t("settings.useCurrentLocation")}
              </Text>
            </TouchableOpacity>
          ) : isResolvingLocation ? (
            <Text style={localStyles.helperText}>
              {t("settings.resolvingLocation")}
            </Text>
          ) : null}
        </View>
        <View style={styles.editSection}>
          <Text style={styles.editSectionTitle}>
            {locale.startsWith("en") ? "Nationality" : "Nacionalidad"}
          </Text>
          <CountrySelector
            selected={
              profileData?.nationalityCode ? [profileData.nationalityCode] : []
            }
            onChange={(codes) => {
              void updateNationality(codes);
            }}
            disabled={savingNationality || !profileData}
          />
        </View>
        <View style={localStyles.saveFooter}>
          <TouchableOpacity
            style={localStyles.saveButton}
            disabled={
              savingProfile || savingName || savingLocation || savingPhotos
            }
            accessibilityRole="button"
            accessibilityLabel={
              savingProfile ? "Guardando perfil" : "Guardar perfil"
            }
            accessibilityState={{
              busy: savingProfile,
              disabled:
                savingProfile || savingName || savingLocation || savingPhotos,
            }}
            onPress={async () => {
              if (savingProfile) return;
              setSavingProfile(true);
              try {
                const nameSaved = await saveDisplayName();
                if (nameSaved && (await saveLocation())) leaveProfile(true);
              } finally {
                setSavingProfile(false);
              }
            }}
          >
            {savingProfile ? (
              <VibesLoader size={22} />
            ) : (
              <Icon
                name="checkmark"
                color={vibesTheme.colors.surface}
                size={ds.iconSize.lg}
              />
            )}
            <Text style={localStyles.saveButtonLabel}>
              {locale.startsWith("en") ? "Save" : "Guardar"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
};

export default EditProfile;

const localStyles = StyleSheet.create({
  saveFooter: { marginHorizontal: ds.spacing[5], marginTop: ds.spacing[6] },
  saveButton: {
    width: "100%",
    minHeight: 56,
    paddingHorizontal: ds.spacing[5],
    borderRadius: vibesTheme.radii.pill,
    flexDirection: "row",
    gap: ds.spacing[3],
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.primaryText,
  },
  saveButtonLabel: {
    ...ds.textStyles.subtitle,
    color: vibesTheme.colors.surface,
  },
  header: {
    paddingHorizontal: 0,
    marginBottom: ds.spacing[1],
  },
  scrollContent: {
    paddingBottom: /* ds-lint-allow DS-TODO: paddingBottom 104 fuera de escala (>48), parece layout */ 104,
  },
  primaryBadge: {
    position: "absolute",
    left: 6,
    top: 6,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: ds.radii.sm,
    paddingHorizontal: ds.spacing[2],
    paddingVertical: ds.spacing[1],
  },
  primaryBadgeText: {
    color: vibesTheme.colors.primaryText,
    fontSize: /* ds-lint-allow DS-TODO: fontSize 10 (peso 400) sin mapeo claro en §3.5.1 */ 10,
    fontFamily: ds.fontFamilies.regular,
  },
  nameInput: {
    backgroundColor: /* ds-lint-allow DS-TODO: paper al 60%: no hay opacidad cercana (más cercana 0.45) */ "rgba(254, 254, 253, 0.6)",
    borderRadius: ds.radii.md,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[4],
    ...ds.textStyles.body,
    color: DARK_GRAY,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.coral, ds.opacity.medium),
  },
  readOnlyField: {
    backgroundColor: vibesTheme.colors.background,
    borderRadius: ds.radii.md,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[4],
    borderWidth: 1,
    borderColor: /* ds-lint-allow DS-TODO: blue al 80%: no hay opacidad cercana (más cercana 1) */ "rgba(57, 120, 184, 0.8)",
  },
  readOnlyValue: {
    color: DARK_GRAY,
    ...ds.textStyles.subtitleMedium,
  },
  helperText: {
    color: GRAY,
    ...ds.textStyles.bodySmall,
    marginTop: ds.spacing[3],
  },
  locationFields: {
    gap: ds.spacing[3],
  },
  currentLocationButton: {
    alignSelf: "flex-start",
    marginTop: ds.spacing[3],
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[2],
    borderRadius: ds.radii.pill,
    backgroundColor: PRIMARY_COLOR,
  },
  currentLocationButtonText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.label,
  },
  languageRow: {
    flexDirection: "row",
    gap: ds.spacing[3],
  },
  languageChip: {
    minHeight: 44,
    borderRadius: ds.radii.pill,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.coral, ds.opacity.scrim),
    backgroundColor: vibesTheme.colors.background,
    paddingHorizontal: ds.spacing[4],
    alignItems: "center",
    justifyContent: "center",
  },
  languageChipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  languageChipText: {
    color: DARK_GRAY,
    ...ds.textStyles.subtitle,
  },
  languageChipTextActive: {
    color: vibesTheme.colors.primaryText,
  },
});
