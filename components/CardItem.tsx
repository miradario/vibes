/** @format */

import React, { useEffect, useState } from "react";
import {
  Text,
  View,
  Image,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import Icon from "./Icon";
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

const SHOW_DISCOVER_DEBUG = false;

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
  vibe,
  intention,
  prompt,
  tags,
  preferences,
  spiritualPath,
  spiritualPathDetails,
  vegetarian,
  smoking,
  pets,
  images,
  onContactPress,
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
    fontFamily: "CormorantGaramond_500Medium",
  };

  const discoverSubtitle =
    [vibe, intention].filter(Boolean).join(" \u00b7 ") ||
    location ||
    (description ? description.slice(0, 64) : "");
  const discoverAgeLabel = age ? `${age} años` : null;
  const discoverPathDetails = normalizeSpiritualPathDetails(spiritualPathDetails);
  const discoverSpiritualPaths = getSelectedSpiritualPaths(
    spiritualPath,
    spiritualPathDetails,
  );
  // Construir lista de preferencias extendida
  const extraPrefs: string[] = [];
  if (preferences && Array.isArray(preferences)) {
    extraPrefs.push(...preferences.filter((p) => !p.startsWith("Camino espiritual:")));
  }
  // Agregar campos individuales si existen
  const addIf = (label: string, value: any) => {
    if (value && typeof value === 'string' && value.trim()) extraPrefs.push(`${label}: ${value}`);
  };
  addIf('Sobre mí', (spiritualPathDetails && spiritualPathDetails.about_me) || description);
  addIf('Abierto a', spiritualPathDetails?.open_to);
  addIf('Idiomas', spiritualPathDetails?.languages);
  addIf('Signo', spiritualPathDetails?.zodiac);
  addIf('Educación', spiritualPathDetails?.education);
  addIf('Plan familiar', spiritualPathDetails?.family_plan);
  addIf('Vacuna', spiritualPathDetails?.vaccine);
  addIf('Personalidad', spiritualPathDetails?.personality);
  addIf('Comunicación', spiritualPathDetails?.communication_style);
  addIf('Estilo de amor', spiritualPathDetails?.love_style);
  addIf('Mascotas', spiritualPathDetails?.pets);
  const discoverPreferences = extraPrefs;
  const discoverHabits = [
    vegetarian ? `Vegetariano: ${vegetarian}` : null,
    smoking ? `Fuma: ${smoking}` : null,
    pets ? `Mascotas: ${pets}` : null,
  ].filter(Boolean) as string[];
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
              <Image source={activeDiscoverImage} style={styles.discoverPhoto} />
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
                  <Image source={thumb} style={styles.discoverGalleryThumb} />
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

          {(vibe || intention) ? (
            <View style={styles.discoverInfoSection}>
              <Text style={styles.discoverSectionTitle}>Datos</Text>
              <View style={styles.discoverTagRowLeft}>
                {vibe ? (
                  <View style={styles.discoverTagPill}>
                    <Text style={styles.discoverTagText}>Vibe: {vibe}</Text>
                  </View>
                ) : null}
                {intention ? (
                  <View style={styles.discoverTagPill}>
                    <Text style={styles.discoverTagText}>Intención: {intention}</Text>
                  </View>
                ) : null}
              </View>
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
              <View style={styles.discoverTagRowLeft}>
                {discoverHabits.map((habit, index) => (
                  <View key={`${habit}-${index}`} style={styles.discoverTagPill}>
                    <Text style={styles.discoverTagText}>{habit}</Text>
                  </View>
                ))}
              </View>
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
              <Text style={styles.discoverSectionTitle}>Preferencias</Text>
              <View style={styles.discoverTagRowLeft}>
                {discoverPreferences.map((preference, index) => (
                  <View key={`${preference}-${index}`} style={styles.discoverTagPill}>
                    <Text style={styles.discoverTagText}>{preference}</Text>
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
        {onContactPress ? (
          <View style={styles.discoverFixedFooter}>
            <TouchableOpacity
              style={styles.discoverConnectButton}
              onPress={onContactPress}
              activeOpacity={0.9}
            >
              <Text style={styles.discoverConnectButtonText}>Conectar</Text>
            </TouchableOpacity>
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
        {matches && (
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
