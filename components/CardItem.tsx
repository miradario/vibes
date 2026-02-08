/** @format */

import React from "react";
import { Text, View, Image, Dimensions, TouchableOpacity } from "react-native";
import Icon from "./Icon";
import { CardItemT } from "../types";
import styles, {
  DISLIKE_ACTIONS,
  FLASH_ACTIONS,
  LIKE_ACTIONS,
  STAR_ACTIONS,
  DARK_GRAY,
  WHITE,
  TEXT_PRIMARY,
} from "../assets/styles";

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
  location,
  vibe,
  intention,
  prompt,
  tags,
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

  const nameStyle = [
    {
      paddingTop: hasVariant ? 10 : isDiscover ? 8 : 15,
      paddingBottom: hasVariant ? 5 : isDiscover ? 4 : 7,
      color: DARK_GRAY,
      fontSize: hasVariant ? 15 : isDiscover ? 22 : 30,
      textAlign: isDiscover ? "center" : "left",
      fontFamily: isDiscover ? "serif" : undefined,
    },
  ];

  return (
    <View
      style={[
        styles.containerCardItem,
        isDiscover && styles.containerCardItemDiscover,
      ]}
    >
      {isDiscover && (
        <View pointerEvents="none" style={styles.discoverSparkleLayer}>
          <Image
            source={require("../assets/images/sparklings.png")}
            style={styles.discoverSparkleImage}
            resizeMode="contain"
          />
          {[
            { top: "8%", left: "12%", size: 4 },
            { top: "14%", right: "18%", size: 3 },
            { top: "22%", left: "40%", size: 2 },
            { top: "32%", right: "12%", size: 4 },
            { top: "46%", left: "18%", size: 3 },
            { top: "54%", right: "28%", size: 2 },
            { top: "62%", left: "55%", size: 3 },
            { top: "70%", right: "16%", size: 4 },
            { top: "78%", left: "24%", size: 2 },
            { top: "86%", right: "34%", size: 3 },
          ].map((dot, index) => (
            <View
              key={`sparkle-${index}`}
              style={[
                styles.discoverSparkleDot,
                {
                  width: dot.size,
                  height: dot.size,
                  borderRadius: dot.size / 2,
                  top: dot.top,
                  left: dot.left,
                  right: dot.right,
                },
              ]}
            />
          ))}
        </View>
      )}
      {/* IMAGE */}
      <View
        style={[styles.cardImageWrap, isDiscover && styles.discoverImageWrap]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onImagePress}
          disabled={!onImagePress}
        >
          {isDiscover ? (
            <View style={styles.discoverAvatarWrap}>
              <Image
                source={require("../assets/images/halo.png")}
                style={styles.discoverAvatarHalo}
                resizeMode="contain"
              />
              <Image
                source={image}
                style={[imageStyle, styles.discoverImage]}
                blurRadius={imageBlurRadius}
              />
            </View>
          ) : hasVariant ? (
            <View style={styles.soulmateAvatarWrap}>
              <Image
                source={require("../assets/images/logo.png")}
                style={styles.soulmateAvatarHalo}
                resizeMode="contain"
              />
              <Image
                source={image}
                style={[imageStyle, styles.soulmateAvatarImage]}
              />
            </View>
          ) : (
            <Image
              source={image}
              style={[imageStyle, isDiscover && styles.discoverImage]}
              blurRadius={imageBlurRadius}
            />
          )}
        </TouchableOpacity>
        {/* MATCHES */}
        {matches && !isDiscover && (
          <View
            style={
              isDiscover
                ? styles.discoverMatchesOverlay
                : styles.matchesCardOverlay
            }
          >
            <View
              style={[
                styles.matchesCardItem,
                isDiscover && styles.discoverMatchesPill,
              ]}
            >
              <Text
                style={[
                  styles.matchesTextCardItem,
                  isDiscover && styles.matchesTextCardItemDiscover,
                ]}
              >
                <Icon
                  name="star"
                  color={isDiscover ? DARK_GRAY : WHITE}
                  size={13}
                />{" "}
                {matches}% Sync
              </Text>
            </View>
          </View>
        )}
      </View>

      {!hasVariant && !isDiscover && images && images.length > 1 && (
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
          style={isDiscover ? styles.discoverContent : undefined}
        >
          {/* NAME */}
          <Text style={nameStyle}>{name}</Text>

          {isDiscover && location ? (
            <Text style={styles.discoverLocation}>{location}</Text>
          ) : null}

          {/* DESCRIPTION */}
          {description && (
            <Text
              style={[
                styles.descriptionCardItem,
                isDiscover && styles.descriptionCardItemDiscover,
              ]}
            >
              {description}
            </Text>
          )}

          {(vibe || intention) && !isDiscover && (
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

          {tags && tags.length > 0 && !isDiscover && (
            <View style={styles.vibeRow}>
              {tags.map((tag, index) => (
                <View key={`${tag}-${index}`} style={styles.vibePill}>
                  <Text style={styles.vibeText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {prompt && isDiscover && (
            <View style={styles.discoverPromptPill}>
              <Text style={styles.discoverPromptText}>{prompt}</Text>
            </View>
          )}

          {prompt && !isDiscover && (
            <Text style={styles.promptText}>{prompt}</Text>
          )}

          {isDiscover && images && images.length > 1 && (
            <View style={styles.cardThumbRow}>
              {images.slice(0, 4).map((thumb, index) => (
                <TouchableOpacity
                  key={`thumb-discover-${index}`}
                  style={styles.cardThumbWrap}
                  onPress={onImagePress}
                >
                  <Image source={thumb} style={styles.cardThumb} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </TouchableOpacity>
      )}

      {!hideDetails && !isDiscover && (
        <TouchableOpacity
          style={[
            styles.contactButton,
            isDiscover && styles.contactButtonDiscover,
          ]}
          onPress={onContactPress}
          disabled={!onContactPress}
        >
          <Icon name="library" size={14} color={contactTextColor} />
          <Text style={[styles.contactButtonText, { color: contactTextColor }]}>
            Assets shared
          </Text>
        </TouchableOpacity>
      )}

      {/* STATUS */}
      {!hideDetails && !description && (
        <View style={styles.status}>
          <View style={isOnline ? styles.online : styles.offline} />
          <Text style={styles.statusText}>
            {isOnline ? "Online" : "Offline"}
          </Text>
        </View>
      )}

      {/* ACTIONS */}
      {hasActions && !isDiscover && (
        <View
          style={[
            styles.actionsCardItem,
            isDiscover && styles.actionsCardItemDiscover,
          ]}
        >
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
