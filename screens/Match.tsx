import LikeBubbles from "../components/LikeBubbles";
/** @format */

import React, { useEffect, useMemo, useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../components/Typography";
import * as Haptics from "expo-haptics";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import VibesActionButton from "../components/VibesActionButton";
import { useAuthSession } from "../src/auth/auth.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { mapOwnProfileToConnectionProfile } from "../src/lib/connectionProfiles";
import { useFindMatchQuery } from "../src/queries/matches.queries";
import { vibesTheme } from "../src/theme/vibesTheme";

const getFirstName = (value?: string | null) =>
  value?.trim()?.split(" ")?.[0] || "Vibes";

const getPrimaryPhotoUri = (profile: any) => {
  if (!profile) return null;
  if (typeof profile.avatarUri === "string" && profile.avatarUri.trim()) {
    return profile.avatarUri.trim();
  }

  const image =
    Array.isArray(profile.images) && profile.images[0]
      ? profile.images[0]
      : profile.image;

  if (typeof image === "object" && image && "uri" in image) {
    return String((image as { uri?: string }).uri ?? "") || null;
  }

  return null;
};

const Match = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const didPlayMatchHaptic = useRef(false);
  const { data: session } = useAuthSession();
  const { data: ownProfileData } = useProfileQuery(session?.user?.id);
  const ownProfile = useMemo(
    () =>
      mapOwnProfileToConnectionProfile(
        ownProfileData,
        session?.user?.email?.split("@")[0]
      ),
    [ownProfileData, session?.user?.email]
  );
  const profile = route?.params?.profile ?? null;
  const { data: matchData } = useFindMatchQuery(profile?.id);
  const ownName = getFirstName(ownProfile.name);
  const otherName = getFirstName(profile?.name);

  useEffect(() => {
    if (didPlayMatchHaptic.current) return;

    didPlayMatchHaptic.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const openChat = () => {
    if (!profile || !matchData) {
      navigation.goBack();
      return;
    }

    navigation.navigate(
      "Chat" as never,
      {
        matchId: matchData.id,
        otherUserId: String(profile.id),
        otherUserName: profile.name,
        otherUserPhoto: getPrimaryPhotoUri(profile),
      } as never
    );
  };

  return (
    <SafeAreaView style={localStyles.screen} edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          localStyles.content,
          { paddingBottom: Math.max(insets.bottom + 22, 34) },
        ]}
      >
        <View style={localStyles.header}>
          <View style={localStyles.sparkleCluster}>
            <Text style={localStyles.sparkleLarge}>✦</Text>
            <Text style={localStyles.sparkleSmall}>✧</Text>
          </View>
          <Text style={localStyles.title}>¡Hay conexión!</Text>
          <View style={localStyles.divider}>
            <View style={localStyles.dividerLine} />
            <View style={localStyles.dividerDot} />
            <View style={localStyles.dividerLine} />
          </View>
        </View>

        <View style={localStyles.peopleRow}>
          <View style={localStyles.personBlock}>
            <View style={[localStyles.avatar, localStyles.avatarBlue]}>
              <Avatar uri={ownProfile.avatarUri ?? null} size={76} />
            </View>
            <Text style={localStyles.personName}>{ownName}</Text>
          </View>

          <View style={localStyles.centerMark}>
            <View style={localStyles.dottedLine} />
            <View style={localStyles.centerSeal}>
              <Icon name="leaf-outline" size={24} color={vibesTheme.colors.accentMustard} />
            </View>
            <View style={localStyles.dottedLine} />
          </View>

          <View style={localStyles.personBlock}>
            <View style={[localStyles.avatar, localStyles.avatarGold]}>
              <Avatar uri={getPrimaryPhotoUri(profile)} size={76} />
            </View>
            <Text style={localStyles.personName}>{otherName}</Text>
          </View>
        </View>

        <View style={localStyles.actions}>
          <VibesActionButton
            label="Enviar mensaje"
            variant="start"
            onPress={openChat}
            disabled={!profile || !matchData}
          />

          <VibesActionButton
            label="Seguir descubriendo"
            variant="skip"
            onPress={() => navigation.goBack()}
          />
        </View>

      </ScrollView>
      <LikeBubbles trigger={1} />
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: vibesTheme.colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 18,
    alignItems: "center",
  },
  header: {
    width: "100%",
    alignItems: "center",
  },
  sparkleCluster: {
    position: "absolute",
    left: 18,
    top: 0,
    width: 34,
    height: 34,
  },
  sparkleLarge: {
    position: "absolute",
    left: 0,
    top: 4,
    color: vibesTheme.colors.accentMustard,
    fontSize: 24,
  },
  sparkleSmall: {
    position: "absolute",
    right: 0,
    top: 0,
    color: vibesTheme.colors.accentMustard,
    fontSize: 16,
  },
  title: {
    color: vibesTheme.colors.primaryText,
    fontSize: 36,
    lineHeight: 39,
    textAlign: "center",
    fontFamily: vibesTheme.fonts.thin,
  },
  divider: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: {
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  dividerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  heroWrap: {
    width: "100%",
    height: 260,
    marginTop: 8,
    marginBottom: 0,
  },
  heroVideo: {
    width: "100%",
    height: "100%",
  },
  peopleRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 0,
    marginBottom: 18,
  },
  personBlock: {
    width: 102,
    alignItems: "center",
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: vibesTheme.colors.accentMustard,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  avatarBlue: {
    backgroundColor: "rgba(127, 152, 183, 0.20)",
    borderColor: "rgba(110, 110, 110, 0.30)",
  },
  avatarGold: {
    backgroundColor: "rgba(228, 183, 110, 0.37)",
    borderColor: vibesTheme.colors.accentMustard,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 38,
  },
  personName: {
    marginTop: 8,
    color: vibesTheme.colors.primaryText,
    fontSize: 20,
    textAlign: "center",
    fontFamily: vibesTheme.fonts.bold,
  },
  centerMark: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  dottedLine: {
    flex: 1,
    maxWidth: 78,
    borderTopWidth: 4,
    borderStyle: "dotted",
    borderColor: vibesTheme.colors.accentMustard,
  },
  centerSeal: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(228, 183, 110, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.32)",
    shadowColor: vibesTheme.colors.accentMustard,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  messageCard: {
    width: "100%",
    minHeight: 112,
    borderRadius: 18,
    backgroundColor: "rgba(254, 254, 253, 0.78)",
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  messageIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(254, 254, 253, 0.92)",
  },
  messageText: {
    flex: 1,
    color: vibesTheme.colors.primaryText,
    fontSize: 19,
    lineHeight: 25,
    fontFamily: vibesTheme.fonts.semibold,
  },
  actions: {
    width: "100%",
    marginTop: 24,
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
    gap: 14,
  },
  footerSparkle: {
    color: vibesTheme.colors.accentMustard,
    fontSize: 22,
  },
  footerText: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 19,
    lineHeight: 24,
    textAlign: "center",
    fontFamily: vibesTheme.fonts.medium,
  },
});

export default Match;
