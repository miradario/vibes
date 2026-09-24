/** @format */

import React, { useEffect, useState } from "react";
import { View, Image, Dimensions, ScrollView, TouchableOpacity } from "react-native";
import { Text } from "./Typography";
import Icon from "./Icon";
import ProfileMediaImage from "./ProfileMediaImage";
import DiscoverCirclesOverlay from "./DiscoverCirclesOverlay";
import SpiritualPathDetailsModal from "./SpiritualPathDetailsModal";
import { CardItemT } from "../types";
import styles, {
  DISLIKE_ACTIONS,
  FLASH_ACTIONS,
  LIKE_ACTIONS,
  STAR_ACTIONS,
  DARK_GRAY,
  WHITE,
  TEXT_PRIMARY,
  BG_MAIN,
} from "../assets/styles";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import {
  getSelectedSpiritualPaths,
  normalizeSpiritualPathDetails,
} from "../src/lib/spiritualPaths";
import { vibesTheme } from "../src/theme/vibesTheme";

const SHOW_DISCOVER_DEBUG = false;
const DISCOVER_PREFERENCE_EXCLUDED_PREFIXES = [
  "camino espiritual:",
  "vegetarianismo:",
  "fuma:",
  "mascotas:",
  "sobre mí:",
  "sobre mi:",
  "intereses:",
  "abierto a:",
];

const shouldShowDiscoverPreference = (preference: string) => {
  const normalizedPreference = preference.trim().toLowerCase();
  return !DISCOVER_PREFERENCE_EXCLUDED_PREFIXES.some((prefix) =>
    normalizedPreference.startsWith(prefix),
  );
};

type DiscoverChipGroup = {
  title: string;
  values: string[];
};

const splitChipValues = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const createChipGroup = (
  title: string,
  value: unknown,
): DiscoverChipGroup | null => {
  const values = Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : typeof value === "string"
    ? splitChipValues(value)
    : value
    ? [String(value).trim()].filter(Boolean)
    : [];

  if (!title.trim() || values.length === 0) return null;

  return { title: title.trim(), values: Array.from(new Set(values)) };
};

const parsePreferenceGroup = (preference: string): DiscoverChipGroup | null => {
  const [rawTitle, ...rawValues] = preference.split(":");
  if (rawValues.length === 0) {
    return createChipGroup("Detalles", preference);
  }

  return createChipGroup(rawTitle, rawValues.join(":"));
};

const mergeChipGroups = (groups: DiscoverChipGroup[]) => {
  const merged = new Map<string, DiscoverChipGroup>();

  groups.forEach((group) => {
    const key = group.title.toLowerCase();
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { title: group.title, values: [...group.values] });
      return;
    }

    existing.values = Array.from(new Set([...existing.values, ...group.values]));
  });

  return Array.from(merged.values());
};

const CardItem = ({
  description,
  hasActions,
  hasVariant,
  image,
  imageBlurRadius,
  hideDetails,
  onImagePress,
  isOnline,
  matches,
  name,
  age,
  location,
  distanceLabel,
  vibe,
  intention,
  prompt,
  tags,
  preferences,
  sharedEvents,
  sharedChallenges,
  spiritualPath,
  spiritualPathDetails,
  vegetarian,
  smoking,
  pets,
  images,
  onContactPress,
  secondaryActionLabel,
  onSecondaryActionPress,
  variant,
}: CardItemT) => {
  // Custom styling
  const fullWidth = Dimensions.get("window").width;
  const isDiscover = variant === "discover";
  const contactTextColor = isDiscover ? WHITE : TEXT_PRIMARY;

  const imageStyle = [
    {
      borderRadius: hasVariant ? 85 : isDiscover ? 90 : 8,
      width: hasVariant
        ? fullWidth / 2 - 30
        : isDiscover
        ? 180
        : fullWidth - 80,
      height: hasVariant ? 170 : isDiscover ? 180 : 350,
      margin: hasVariant ? 0 : isDiscover ? 0 : 20,
    },
  ];

  const nameStyle = {
    paddingTop: hasVariant ? 10 : isDiscover ? 8 : 15,
    paddingBottom: hasVariant ? 5 : isDiscover ? 4 : 7,
    color: DARK_GRAY,
    fontSize: hasVariant ? 15 : isDiscover ? 22 : 30,
    textAlign: isDiscover ? ("center" as const) : ("left" as const),
    fontFamily: vibesTheme.fonts.medium,
  };

  const discoverLocationLine =
    location && distanceLabel && location.includes(distanceLabel)
      ? location
      : [location, distanceLabel].filter(Boolean).join(" \u00b7 ");
  const discoverSubtitle =
    discoverLocationLine ||
    [vibe, intention].filter(Boolean).join(" \u00b7 ") ||
    (description ? description.slice(0, 64) : "");
  const discoverAgeLabel = age ? `${age} años` : null;
  const discoverBasics = [
    discoverAgeLabel,
    location,
  ].filter(Boolean) as string[];
  const discoverPathDetails = normalizeSpiritualPathDetails(spiritualPathDetails);
  const discoverSpiritualPaths = getSelectedSpiritualPaths(
    spiritualPath,
    spiritualPathDetails,
  );
  // Construir lista de preferencias extendida
  const extraPreferenceGroups: DiscoverChipGroup[] = [];
  if (preferences && Array.isArray(preferences)) {
    preferences
      .filter(shouldShowDiscoverPreference)
      .forEach((preference) => {
        const group = parsePreferenceGroup(preference);
        if (group) extraPreferenceGroups.push(group);
      });
  }
  // Agregar campos individuales si existen
  const addIf = (label: string, value: any) => {
    const group = createChipGroup(label, value);
    if (group) extraPreferenceGroups.push(group);
  };
  addIf('Género', spiritualPathDetails?.gender);
  addIf('Estatura', spiritualPathDetails?.height_cm ? `${spiritualPathDetails.height_cm} cm` : "");
  addIf('Busca', spiritualPathDetails?.looking_for);
  addIf('Idiomas', spiritualPathDetails?.languages);
  addIf('Signo', spiritualPathDetails?.zodiac);
  addIf('Educación', spiritualPathDetails?.education);
  addIf('Plan familiar', spiritualPathDetails?.family_plan);
  addIf('Vacuna', spiritualPathDetails?.vaccine);
  addIf('Personalidad', spiritualPathDetails?.personality);
  addIf('Comunicación', spiritualPathDetails?.communication_style);
  addIf('Estilo de amor', spiritualPathDetails?.love_style);
  addIf('Mascotas', spiritualPathDetails?.pets);
  const discoverPreferences = mergeChipGroups(extraPreferenceGroups);
  const sharedEventsList = (sharedEvents ?? []).filter(Boolean);
  const sharedChallengesList = (sharedChallenges ?? []).filter(Boolean);
  const discoverHabits = mergeChipGroups(
    [
      createChipGroup("Vegetarianismo", vegetarian),
      createChipGroup("Fuma", smoking),
      createChipGroup("Mascotas", pets),
    ].filter(Boolean) as DiscoverChipGroup[],
  );
  const discoverDebugPayload = {
    name,
    age,
    vegetarian: vegetarian ?? null,
    smoking: smoking ?? null,
    pets: pets ?? null,
    tags: tags ?? [],
    preferences: preferences ?? [],
    spiritualPath: spiritualPath ?? [],
    spiritualPathDetails: discoverPathDetails,
  };
  const discoverGallery = (images && images.length > 0 ? images : [image]).slice(0, 6);
  const [activeDiscoverImage, setActiveDiscoverImage] = useState(discoverGallery[0] ?? image);
  const [activeDiscoverPath, setActiveDiscoverPath] = useState<string | null>(null);
  const activeDiscoverIndex = Math.max(
    0,
    discoverGallery.findIndex((galleryImage) => galleryImage === activeDiscoverImage),
  );

  useEffect(() => {
    setActiveDiscoverImage(discoverGallery[0] ?? image);
  }, [image, images]);

  useEffect(() => {
    if (activeDiscoverPath && !discoverSpiritualPaths.includes(activeDiscoverPath)) {
      setActiveDiscoverPath(null);
    }
  }, [activeDiscoverPath, discoverSpiritualPaths]);

  if (isDiscover) {
    const renderChipGroup = (
      group: DiscoverChipGroup,
      index: number,
      prefix: string,
    ) => (
      <View key={`${prefix}-${group.title}-${index}`} style={styles.discoverDetailGroup}>
        <Text style={styles.discoverDetailLabel}>{group.title}</Text>
        <View style={styles.discoverDetailChips}>
          {group.values.map((value, valueIndex) => (
            <View
              key={`${prefix}-${group.title}-${value}-${valueIndex}`}
              style={[styles.discoverTagPill, styles.discoverPreferencePill]}
            >
              <Text
                style={[styles.discoverTagText, styles.discoverPreferenceTagText]}
              >
                {value}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );

    return (
      <View style={[styles.containerCardItem, styles.containerCardItemDiscover]}>
        <View style={styles.discoverCardBackground} />
        <DiscoverCirclesOverlay />
        <ScrollView
          style={styles.discoverScroll}
          contentContainerStyle={styles.discoverScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.discoverHeaderWrap}>
            <Text style={styles.discoverTitle}>{name}</Text>
            {discoverAgeLabel ? (
              <Text style={styles.discoverAge}>{discoverAgeLabel}</Text>
            ) : null}
            {discoverSubtitle ? (
              <Text style={styles.discoverSubtitle}>{discoverSubtitle}</Text>
            ) : null}
          </View>

          <View style={styles.discoverDivider} />

          <View style={styles.discoverPhotoCard}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onImagePress?.(activeDiscoverImage, activeDiscoverIndex)}
              disabled={!onImagePress}
              style={styles.discoverPhotoTouch}
            >
              <ProfileMediaImage source={activeDiscoverImage} style={styles.discoverPhoto} />
              <View pointerEvents="none" style={styles.discoverPhotoFade}>
                <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <Defs>
                    <LinearGradient id="DiscoverPhotoFade" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={BG_MAIN} stopOpacity={0} />
                      <Stop offset="1" stopColor={BG_MAIN} stopOpacity={0.95} />
                    </LinearGradient>
                  </Defs>
                  <Rect x="0" y="0" width="100" height="100" fill="url(#DiscoverPhotoFade)" />
                </Svg>
              </View>
            </TouchableOpacity>

          </View>

          {discoverGallery.length > 0 ? (
            <View style={styles.discoverGalleryRow}>
              {discoverGallery.map((thumb, index) => (
                <TouchableOpacity
                  key={`discover-gallery-${index}`}
                  style={[
                    styles.discoverGalleryThumbWrap,
                    activeDiscoverImage === thumb && styles.discoverGalleryThumbWrapActive,
                  ]}
                  onPress={() => setActiveDiscoverImage(thumb)}
                  activeOpacity={0.85}
                >
                  <ProfileMediaImage source={thumb} style={styles.discoverGalleryThumb} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {description ? (
            <View style={styles.discoverInfoSection}>
              <Text style={styles.discoverSectionTitle}>Sobre {name}</Text>
              <Text style={styles.discoverDescription}>{description}</Text>
            </View>
          ) : null}

          {discoverBasics.length > 0 ? (
            <View style={styles.discoverInfoSection}>
              <Text style={styles.discoverSectionTitle}>Datos básicos</Text>
              <View style={styles.discoverTagRowLeft}>
                {discoverBasics.map((item, index) => (
                  <View key={`${item}-${index}`} style={styles.discoverTagPill}>
                    <Text style={styles.discoverTagText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {(vibe || intention) ? (
            <View style={styles.discoverInfoSection}>
              <Text style={styles.discoverSectionTitle}>Datos</Text>
              {[
                createChipGroup("Vibe", vibe),
                createChipGroup("Intención", intention),
              ]
                .filter(Boolean)
                .map((group, index) =>
                  renderChipGroup(group as DiscoverChipGroup, index, "data"),
                )}
            </View>
          ) : null}

          {prompt ? (
            <View style={styles.discoverInfoSection}>
              <Text style={styles.discoverSectionTitle}>Ritual</Text>
              <View style={styles.discoverPromptPillFull}>
                <Text style={styles.discoverPromptTextLeft}>{prompt}</Text>
              </View>
            </View>
          ) : null}

          {discoverHabits.length > 0 ? (
            <View style={styles.discoverInfoSection}>
              <Text style={styles.discoverSectionTitle}>Hábitos</Text>
              {discoverHabits.map((group, index) =>
                renderChipGroup(group, index, "habit"),
              )}
            </View>
          ) : null}

          {discoverSpiritualPaths.length > 0 ? (
            <View style={styles.discoverInfoSection}>
              <Text style={styles.discoverSectionTitle}>Camino espiritual</Text>
              <View style={styles.discoverTagRowLeft}>
                {discoverSpiritualPaths.map((path, index) => (
                  <TouchableOpacity
                    key={`${path}-${index}`}
                    style={styles.discoverTagPill}
                    onPress={() => setActiveDiscoverPath(path)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.discoverTagText}>{path}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          {discoverPreferences.length > 0 ? (
            <View style={styles.discoverInfoSection}>
              <Text
                style={[
                  styles.discoverSectionTitle,
                  styles.discoverPreferencesSectionTitle,
                ]}
              >
                Detalles
              </Text>
              {discoverPreferences.map((group, index) =>
                renderChipGroup(group, index, "preference"),
              )}
            </View>
          ) : null}

          {sharedEventsList.length > 0 || sharedChallengesList.length > 0 ? (
            <View style={styles.discoverInfoSection}>
              <Text style={styles.discoverSectionTitle}>En común</Text>
              <View style={styles.discoverSharedSection}>
                {sharedEventsList.map((eventTitle, index) => (
                  <View key={`shared-event-${eventTitle}-${index}`} style={styles.discoverSharedItem}>
                    <View style={styles.discoverSharedIconWrap}>
                      <Icon name="calendar-outline" size={16} color={TEXT_PRIMARY} />
                    </View>
                    <View style={styles.discoverSharedTextWrap}>
                      <Text style={styles.discoverSharedLabel}>Evento</Text>
                      <Text style={styles.discoverSharedValue}>{eventTitle}</Text>
                    </View>
                  </View>
                ))}
                {sharedChallengesList.map((challengeTitle, index) => (
                  <View
                    key={`shared-challenge-${challengeTitle}-${index}`}
                    style={styles.discoverSharedItem}
                  >
                    <View style={styles.discoverSharedIconWrap}>
                      <Icon name="sparkles-outline" size={16} color={TEXT_PRIMARY} />
                    </View>
                    <View style={styles.discoverSharedTextWrap}>
                      <Text style={styles.discoverSharedLabel}>Desafío</Text>
                      <Text style={styles.discoverSharedValue}>{challengeTitle}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Debug removido */}
        </ScrollView>
        <SpiritualPathDetailsModal
          visible={Boolean(activeDiscoverPath)}
          pathLabel={activeDiscoverPath}
          detail={activeDiscoverPath ? discoverPathDetails[activeDiscoverPath] ?? {} : {}}
          onClose={() => setActiveDiscoverPath(null)}
          readOnly
        />
        {onContactPress || onSecondaryActionPress ? (
          <View style={styles.discoverFixedFooter}>
            {onContactPress ? (
              <TouchableOpacity
                style={styles.discoverConnectButton}
                onPress={onContactPress}
                activeOpacity={0.9}
              >
                <Text style={styles.discoverConnectButtonText}>Conectar</Text>
              </TouchableOpacity>
            ) : null}
            {onSecondaryActionPress && secondaryActionLabel ? (
              <TouchableOpacity
                style={styles.discoverSecondaryAction}
                onPress={onSecondaryActionPress}
                activeOpacity={0.8}
              >
                <Text style={styles.discoverSecondaryActionText}>
                  {secondaryActionLabel}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.containerCardItem}>
      <View style={styles.cardImageWrap}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onImagePress}
          disabled={!onImagePress}
        >
          {hasVariant ? (
            <View style={styles.soulmateAvatarWrap}>
              <Image
                source={image}
                style={[imageStyle, styles.soulmateAvatarImage]}
              />
            </View>
          ) : (
            <Image source={image} style={imageStyle} blurRadius={imageBlurRadius} />
          )}
        </TouchableOpacity>
        {matches && Number(String(matches).match(/\d+/)?.[0] ?? 0) > 0 && (
          <View style={styles.matchesCardOverlay}>
            <View style={styles.matchesCardItem}>
              <Text style={styles.matchesTextCardItem}>
                <Icon name="star" color={WHITE} size={13} /> {matches}% Sync
              </Text>
            </View>
          </View>
        )}
      </View>

      {!hasVariant && images && images.length > 1 && (
        <View style={styles.cardThumbRow}>
          {images.slice(0, 4).map((thumb, index) => (
            <TouchableOpacity
              key={`thumb-${index}`}
              style={styles.cardThumbWrap}
              onPress={onImagePress}
            >
              <Image source={thumb} style={styles.cardThumb} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!hideDetails && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onContactPress}
          disabled={!onContactPress}
        >
          <Text style={nameStyle}>{name}</Text>

          {description && (
            <Text style={styles.descriptionCardItem}>{description}</Text>
          )}

          {(vibe || intention) && (
            <View style={styles.vibeRow}>
              {vibe && (
                <View style={styles.vibePill}>
                  <Text style={styles.vibeText}>{vibe}</Text>
                </View>
              )}
              {intention && (
                <View style={styles.vibePill}>
                  <Text style={styles.vibeText}>{intention}</Text>
                </View>
              )}
            </View>
          )}

          {tags && tags.length > 0 && (
            <View style={styles.vibeRow}>
              {tags.map((tag, index) => (
                <View key={`${tag}-${index}`} style={styles.vibePill}>
                  <Text style={styles.vibeText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {prompt && <Text style={styles.promptText}>{prompt}</Text>}
        </TouchableOpacity>
      )}

      {!hideDetails && (
        <TouchableOpacity
          style={styles.contactButton}
          onPress={onContactPress}
          disabled={!onContactPress}
        >
          <Icon name="library" size={14} color={contactTextColor} />
          <Text style={[styles.contactButtonText, { color: contactTextColor }]}>
            Assets shared
          </Text>
        </TouchableOpacity>
      )}

      {!hideDetails && !description && (
        <View style={styles.status}>
          <View style={isOnline ? styles.online : styles.offline} />
          <Text style={styles.statusText}>
            {isOnline ? "Online" : "Offline"}
          </Text>
        </View>
      )}

      {hasActions && (
        <View style={styles.actionsCardItem}>
          <TouchableOpacity style={styles.miniButton}>
            <Icon name="star" color={STAR_ACTIONS} size={14} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.button}>
            <Icon name="heart" color={LIKE_ACTIONS} size={25} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.button}>
            <Icon name="close" color={DISLIKE_ACTIONS} size={25} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.miniButton}>
            <Icon name="moon" color={FLASH_ACTIONS} size={14} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default CardItem;
