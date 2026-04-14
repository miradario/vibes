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

const SHOW_DISCOVER_DEBUG = true;

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
  const discoverPreferences = (preferences && preferences.length > 0 ? preferences : tags) || [];
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
  };
  const discoverGallery = (images && images.length > 0 ? images : [image]).slice(0, 6);
  const [activeDiscoverImage, setActiveDiscoverImage] = useState(discoverGallery[0] ?? image);
  const activeDiscoverIndex = Math.max(
    0,
    discoverGallery.findIndex((galleryImage) => galleryImage === activeDiscoverImage),
  );

  useEffect(() => {
    setActiveDiscoverImage(discoverGallery[0] ?? image);
  }, [image, images]);

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

          {SHOW_DISCOVER_DEBUG ? (
            <View style={styles.discoverInfoSection}>
              <Text style={styles.discoverSectionTitle}>Debug</Text>
              <View style={styles.discoverDebugBox}>
                <Text style={styles.discoverDebugText}>
                  {JSON.stringify(discoverDebugPayload, null, 2)}
                </Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
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
