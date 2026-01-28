import React from "react";
import { Text, View } from "react-native";
import Icon from "./Icon";
import { ProfileItemT } from "../types";
import styles, { DARK_GRAY, WHITE } from "../assets/styles";

const ProfileItem = ({
  age,
  info1,
  info2,
  info3,
  info4,
  location,
  matches,
  name,
  meditations,
  videos,
  events,
  shareToCommunity,
  pricing,
}: ProfileItemT) => (
  <View style={styles.containerProfileItem}>
    <View style={styles.matchesProfileItem}>
      <Text style={styles.matchesTextProfileItem}>
        <Icon name="star" size={13} color={WHITE} /> {matches}% Sync
      </Text>
    </View>

    <Text style={styles.name}>{name}</Text>

    <Text style={styles.descriptionProfileItem}>
      {age} - {location}
    </Text>

    <View style={styles.info}>
      <Text style={styles.iconProfile}>
        <Icon name="planet" size={12} color={DARK_GRAY} />
      </Text>
      <Text style={styles.infoContent}>{info1}</Text>
    </View>

    <View style={styles.info}>
      <Text style={styles.iconProfile}>
        <Icon name="leaf" size={12} color={DARK_GRAY} />
      </Text>
      <Text style={styles.infoContent}>{info2}</Text>
    </View>

    <View style={styles.info}>
      <Text style={styles.iconProfile}>
        <Icon name="moon" size={12} color={DARK_GRAY} />
      </Text>
      <Text style={styles.infoContent}>{info3}</Text>
    </View>

    <View style={styles.info}>
      <Text style={styles.iconProfile}>
        <Icon name="star" size={12} color={DARK_GRAY} />
      </Text>
      <Text style={styles.infoContent}>{info4}</Text>
    </View>

    {meditations && (
      <View style={styles.profileSection}>
        <Text style={styles.profileSectionTitle}>Meditations</Text>
        {meditations.map((item, index) => (
          <View key={`meditation-${index}`} style={styles.profileRow}>
            <View>
              <Text style={styles.profileRowTitle}>{item.title}</Text>
              <Text style={styles.profileRowMeta}>{item.duration}</Text>
            </View>
            <View style={styles.profileBadge}>
              <Text style={styles.profileBadgeText}>{item.access}</Text>
            </View>
          </View>
        ))}
      </View>
    )}

    {videos && (
      <View style={styles.profileSection}>
        <Text style={styles.profileSectionTitle}>Videos</Text>
        {videos.map((item, index) => (
          <View key={`video-${index}`} style={styles.profileRow}>
            <View>
              <Text style={styles.profileRowTitle}>{item.title}</Text>
              <Text style={styles.profileRowMeta}>{item.duration}</Text>
            </View>
            <View style={styles.profileBadge}>
              <Text style={styles.profileBadgeText}>{item.access}</Text>
            </View>
          </View>
        ))}
      </View>
    )}

    {events && (
      <View style={styles.profileSection}>
        <Text style={styles.profileSectionTitle}>Events</Text>
        {events.map((item, index) => (
          <View key={`event-${index}`} style={styles.profileRow}>
            <View>
              <Text style={styles.profileRowTitle}>{item.title}</Text>
              <Text style={styles.profileRowMeta}>
                {item.date} · {item.location}
              </Text>
            </View>
            <View style={styles.profileBadge}>
              <Text style={styles.profileBadgeText}>{item.access}</Text>
            </View>
          </View>
        ))}
      </View>
    )}

    {(shareToCommunity !== undefined || pricing) && (
      <View style={styles.profileSection}>
        <Text style={styles.profileSectionTitle}>Sharing</Text>
        {shareToCommunity !== undefined && (
          <View style={styles.profileRow}>
            <Text style={styles.profileRowTitle}>Community sharing</Text>
            <View style={styles.profileBadge}>
              <Text style={styles.profileBadgeText}>
                {shareToCommunity ? "On" : "Off"}
              </Text>
            </View>
          </View>
        )}
        {pricing && (
          <View style={styles.profileRow}>
            <Text style={styles.profileRowTitle}>Pricing</Text>
            <View style={styles.profileBadge}>
              <Text style={styles.profileBadgeText}>{pricing}</Text>
            </View>
          </View>
        )}
      </View>
    )}
  </View>
);

export default ProfileItem;
