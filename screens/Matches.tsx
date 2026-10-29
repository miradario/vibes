import { messagePreview } from "../src/lib/chatPhotos";
/** @format */

import React from "react";
import { View, TouchableOpacity, FlatList } from "react-native";
import { Text } from "../components/Typography";
import { useNavigation } from "@react-navigation/native";
import AppHeader from "../components/AppHeader";
import Avatar from "../components/Avatar";
import styles from "../assets/styles";
import {
  useMatchesQuery,
  type MatchWithProfile,
} from "../src/queries/matches.queries";
import VibesLoader from "../components/VibesLoader";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";



const Matches = () => {
  const navigation = useNavigation();
  const { data: matches, isLoading } = useMatchesQuery();

  const renderItem = ({ item }: { item: MatchWithProfile }) => (
    <TouchableOpacity
      style={localStyles.matchRow}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate(
          "Chat" as never,
          {
            matchId: item.id,
            otherUserId: item.otherUserId,
            otherUserName: item.otherUserName,
            otherUserPhoto: item.otherUserPhoto,
          } as never,
        )
      }
    >
      <Avatar uri={item.otherUserPhoto} size={50} />
      <View style={localStyles.info}>
        <Text style={localStyles.name} numberOfLines={1}>
          {item.otherUserName}
        </Text>
        <Text style={localStyles.subtitle} numberOfLines={1}>
          {messagePreview(item.lastMessage) ?? "Nueva conexión"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.bg}>
      <View style={styles.soulmateScreen}>
        <AppHeader
          title="Comunidad"
          showBack
          onBack={() => navigation.goBack()}
          style={localStyles.header}
          titleStyle={styles.soulmateTitle}
        />

        {isLoading ? (
          <View style={localStyles.emptyState}>
            <VibesLoader />
          </View>
        ) : (matches ?? []).length === 0 ? (
          <View style={localStyles.emptyState}>
            <Text style={localStyles.emptyTitle}>Todavía no hay conexiones</Text>
            <Text style={localStyles.emptyText}>
              Cuando conectes con alguien, va a aparecer acá.
            </Text>
          </View>
        ) : (
          <FlatList
            data={matches}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: ds.spacing[5] }}
          />
        )}

        <TouchableOpacity style={styles.soulmateFooterButton}>
          <Text style={styles.soulmateFooterText}>Ver conexiones anteriores</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Matches;

const localStyles = {
  header: {
    paddingHorizontal: 0,
    marginBottom: ds.spacing[1],
  },
  matchRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
    borderBottomWidth: 0.5,
    borderBottomColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.scrim),
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: ds.radii.pill,
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  info: {
    flex: 1,
    marginLeft: ds.spacing[3],
  },
  name: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.subtitle,
  },
  subtitle: {
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.labelMedium,
    marginTop: ds.spacing[1],
  },
  emptyState: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: ds.spacing[8],
  },
  emptyTitle: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.title,
    textAlign: "center" as const,
  },
  emptyText: {
    marginTop: ds.spacing[3],
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.subtitleMedium,
    textAlign: "center" as const,
  },
};
