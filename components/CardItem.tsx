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
} from "../assets/styles";

const CardItem = ({
  description,
  hasActions,
  hasVariant,
  image,
  onImagePress,
  isOnline,
  matches,
  name,
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

  const imageStyle = [
    {
      borderRadius: isDiscover ? 22 : 8,
      width: hasVariant ? fullWidth / 2 - 30 : fullWidth - 80,
      height: hasVariant ? 170 : 350,
      margin: hasVariant ? 0 : 20,
    },
  ];

  const nameStyle = [
    {
      paddingTop: hasVariant ? 10 : isDiscover ? 12 : 15,
      paddingBottom: hasVariant ? 5 : isDiscover ? 6 : 7,
      color: DARK_GRAY,
      fontSize: hasVariant ? 15 : 30,
    },
  ];

  return (
    <View style={[styles.containerCardItem, isDiscover && styles.containerCardItemDiscover]}>
      {/* IMAGE */}
      <View style={[styles.cardImageWrap, isDiscover && styles.discoverImageWrap]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onImagePress}
          disabled={!onImagePress}
        >
          <Image source={image} style={[imageStyle, isDiscover && styles.discoverImage]} />
        </TouchableOpacity>
        {/* MATCHES */}
        {matches && (
          <View style={isDiscover ? styles.discoverMatchesOverlay : styles.matchesCardOverlay}>
            <View style={[styles.matchesCardItem, isDiscover && styles.discoverMatchesPill]}>
              <Text style={[styles.matchesTextCardItem, isDiscover && styles.matchesTextCardItemDiscover]}>
                <Icon name="star" color={isDiscover ? DARK_GRAY : WHITE} size={13} /> {matches}% Sync
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

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onContactPress}
        disabled={!onContactPress}
      >
        {/* NAME */}
        <Text style={nameStyle}>{name}</Text>

        {/* DESCRIPTION */}
        {description && (
          <Text style={[styles.descriptionCardItem, isDiscover && styles.descriptionCardItemDiscover]}>
            {description}
          </Text>
        )}

        {prompt && <Text style={[styles.promptText, isDiscover && styles.promptTextDiscover]}>{prompt}</Text>}

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
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.contactButton, isDiscover && styles.contactButtonDiscover]}
        onPress={onContactPress}
        disabled={!onContactPress}
      >
        <Icon name="library" size={14} color={WHITE} />
        <Text style={styles.contactButtonText}>Assets shared</Text>
      </TouchableOpacity>

      {/* STATUS */}
      {!description && (
        <View style={styles.status}>
          <View style={isOnline ? styles.online : styles.offline} />
          <Text style={styles.statusText}>
            {isOnline ? "Online" : "Offline"}
          </Text>
        </View>
      )}

      {/* ACTIONS */}
      {hasActions && (
        <View style={[styles.actionsCardItem, isDiscover && styles.actionsCardItemDiscover]}>
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
