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
          {item.lastMessage ?? "Nueva conexión"}
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
            <VibesLoader size={82} />
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
            contentContainerStyle={{ paddingBottom: 20 }}
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
    marginBottom: 4,
  },
  matchRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(127, 152, 183, 0.3)",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    color: vibesTheme.colors.primaryText,
    fontSize: 16,
    fontFamily: vibesTheme.fonts.semibold,
  },
  subtitle: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 14,
    fontFamily: vibesTheme.fonts.subtitle,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 28,
  },
  emptyTitle: {
    color: vibesTheme.colors.primaryText,
    fontSize: 24,
    fontFamily: vibesTheme.fonts.thin,
    textAlign: "center" as const,
  },
  emptyText: {
    marginTop: 10,
    color: vibesTheme.colors.secondaryText,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: vibesTheme.fonts.medium,
    textAlign: "center" as const,
  },
};
