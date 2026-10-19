import ScreenContainer from "../components/ScreenContainer";
import { useQuery } from "@tanstack/react-query";
import { readProfileAnswers } from "../src/lib/profileQuestions";
import { useEmailOwnershipQuery } from "../src/queries/emailOwnership.queries";
import { isEmailOwnershipVerified } from "../src/auth/emailVerification";
/** @format */

import React, { useCallback } from "react";
import {
  Platform,
  StyleSheet,
  View,
  TouchableOpacity,
} from "react-native";
import { Text } from "../components/Typography";
import { CommonActions, useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components";
import VibesWordmark from "../components/VibesWordmark";
import ProfileCompletionAvatar from "../components/ProfileCompletionAvatar";
import styles, { TEXT_SECONDARY } from "../assets/styles";
import { useAuthSession, useLogoutMutation } from "../src/auth/auth.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { mapOwnProfileToConnectionProfile } from "../src/lib/connectionProfiles";
import { getBottomTabContentPadding } from "../src/lib/tabBarLayout";
import { useI18n } from "../src/i18n";
import { getProfileCompletion } from "../src/lib/profileCompletion";
import VibesLoader from "../components/VibesLoader";
import { getInstalledAppVersion, getInstalledAppBuildNumber } from "../src/lib/appUpdateGate";
import appConfig from "../app.json";
import { vibesTheme } from "../src/theme/vibesTheme";

const Profile = () => {
  const { t } = useI18n();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { data: session } = useAuthSession();
  const { data: profile, refetch: refetchProfile } = useProfileQuery(session?.user?.id);
  useFocusEffect(
    useCallback(() => {
      if (session?.user?.id) void refetchProfile();
    }, [session?.user?.id, refetchProfile])
  );
  const {
    data: userPreferences,
    isPending: loadingPreferences,
    isError: preferencesError,
  } = useUserPreferencesQuery(session?.user?.id);
  const { mutate: logout, isPending: isLoggingOut } = useLogoutMutation();
  const ownProfile = mapOwnProfileToConnectionProfile(
    {
      ...(profile ?? {}),
      ...(userPreferences ?? {}),
      photos: profile?.photos,
    },
    session?.user?.email?.split("@")[0]
  );

  const displayName = ownProfile.name;

  const location = ownProfile.location || "Ubicación sin completar";
  const ownAvatarUri = ownProfile.avatarUri ?? null;

  const { data: emailOwner } = useEmailOwnershipQuery(session?.user?.id);
  const { data: answers, isPending: loadingAnswers, isError: answersError } = useQuery({
    queryKey: ["profileAnswers", session?.user?.id],
    queryFn: () => readProfileAnswers(session!.user.id),
    enabled: !!session?.user?.id,
  });
  const completion = getProfileCompletion(profile, userPreferences, isEmailOwnershipVerified(emailOwner), answers);
  const appVersion = Platform.OS === "android"
    ? getInstalledAppVersion()
    : appConfig.expo.version;
  const buildNumber = Platform.OS === "android"
    ? getInstalledAppBuildNumber()
    : Platform.OS === "ios" ? appConfig.expo.ios.buildNumber : null;
  const formattedAppVersion = buildNumber
    ? `${appVersion} (${buildNumber})`
    : appVersion;

  const menuItems = [
    {
      icon: "create-outline",
      label: "Sobre mí",
      screen: "ProfileQuestions",
    },
    {
      icon: "heart-outline",
      label: t("profile.preferences"),
      screen: "Settings",
    },
    {
      icon: "options",
      label: t("profile.configuration"),
      screen: "Configuration",
    },
    {
      icon: "document-text",
      label: t("profile.terms"),
      screen: "TermsConditions",
    },
  ];

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        const resetToWelcome = CommonActions.reset({
          index: 0,
          routes: [{ name: "Welcome" as never }],
        });
        const parentNavigation = navigation.getParent();

        if (parentNavigation) {
          parentNavigation.dispatch(resetToWelcome);
          return;
        }

        navigation.dispatch(resetToWelcome);
      },
    });
  };

  return (
    <ScreenContainer scroll edges={["top", "left", "right"]}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: getBottomTabContentPadding(insets.bottom, 48) }}
      scrollViewProps={{ showsVerticalScrollIndicator: false }}>

        <View style={localStyles.header}>
          <Text style={localStyles.title}>{t("profile.title")}</Text>

        </View>

        <View style={localStyles.profileCard}>
          <View style={localStyles.profileRow}>
          <View style={localStyles.avatarWrap}><ProfileCompletionAvatar
            uri={ownAvatarUri}
            percent={
              profile && !loadingPreferences && !preferencesError && !loadingAnswers && !answersError
                ? completion.percent
                : null
            }
            onPress={() => navigation.navigate("VibesOnboardingFlow" as never, {resume:true} as never)}
          /></View>
          <View style={localStyles.profileInfo}>
            <View style={localStyles.nameRow}>
            <Text style={localStyles.profileName} numberOfLines={2}>{displayName}</Text>
          <TouchableOpacity
            style={localStyles.editButton}
            accessibilityRole="button" accessibilityLabel="Editar perfil"
            onPress={() => navigation.navigate("EditProfile" as never)}
          >
            <Icon name="create-outline" size={20} color={vibesTheme.colors.accentBlue} />
            <Text style={localStyles.editText}>{t("common.edit")}</Text>
          </TouchableOpacity>
            </View>
            <Text style={localStyles.profileLocation}>{location}</Text>
            {ownProfile.zodiac ? (
              <Text style={[localStyles.profileLocation, localStyles.zodiac]}>
                {ownProfile.zodiac}
              </Text>
            ) : null}
          </View>
          </View>

        </View>

        <View style={localStyles.menuList}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[
                localStyles.menuItem,
                index === menuItems.length - 1 && localStyles.menuItemLast,
              ]}
              onPress={() =>
                item.screen && navigation.navigate(item.screen as never)
              }
            >
              <View style={[localStyles.menuIcon, { backgroundColor: `${[vibesTheme.colors.accentBlue, vibesTheme.colors.accentMustard, vibesTheme.colors.accentCoral][index % 3]}24` }]}>
                <Icon name={item.icon} size={19} color={vibesTheme.colors.primaryText} />
              </View>
              <Text style={localStyles.menuLabel}>{item.label}</Text>
              <Icon name="chevron-forward" size={20} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[localStyles.menuItem, localStyles.menuItemLast]}
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            <View style={localStyles.menuIcon}>
              <Icon name="power" size={19} color={TEXT_SECONDARY} />
            </View>
            <Text style={localStyles.menuLabel}>
              {isLoggingOut ? t("profile.loggingOut") : t("profile.logout")}
            </Text>
            {isLoggingOut ? (
              <VibesLoader />
            ) : (
              <Icon name="chevron-forward" size={20} color={TEXT_SECONDARY} />
            )}
          </TouchableOpacity>
        </View>

        <View style={localStyles.footer}>
          <VibesWordmark fontSize={32} />
          <Text style={styles.auraFooterVersion}>
            v {formattedAppVersion}
          </Text>
        </View>
    </ScreenContainer>
  );
};

const colors = vibesTheme.colors;
const localStyles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4, marginBottom: 16 },
  footer: { alignItems: "center", gap: 8, paddingTop: 24, paddingBottom: 16 },
  title: { color: colors.primaryText, fontFamily: vibesTheme.fonts.bold, fontSize: 25, lineHeight: 32, marginTop: 0, marginBottom: 0 },
  profileCard: { marginBottom: 20 },
  profileRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  avatarWrap: { alignSelf: "flex-start" },
  profileInfo: { flex: 1, minWidth: 0, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "space-between" },
  profileName: { flex: 1, minWidth: 0, fontFamily: vibesTheme.fonts.bold, fontSize: 20, lineHeight: 26, color: colors.primaryText },
  profileLocation: { fontFamily: vibesTheme.fonts.regular, fontSize: 13, lineHeight: 18, color: colors.secondaryText },
  zodiac: { color: colors.accentBlue },
  editButton: { minHeight: 44, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: `${colors.accentBlue}18`, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  editText: { fontFamily: vibesTheme.fonts.semibold, fontSize: 14, color: colors.accentBlue, flexShrink: 1 },
  menuList: { gap: 8, marginBottom: 12 },
  menuItem: { minHeight: 56, flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 14, borderWidth: 1, borderColor: `${colors.primaryText}20`, backgroundColor: `${colors.primaryText}03`, gap: 10 },
  menuItemLast: { marginBottom: 0 },
  menuIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: `${colors.accentCoral}24` },
  menuLabel: { flex: 1, fontFamily: vibesTheme.fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.primaryText },
});

export default Profile;
