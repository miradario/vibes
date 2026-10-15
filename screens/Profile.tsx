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
import AppHeader from "../components/AppHeader";
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

        <AppHeader title="Vibes" style={localStyles.header}
          right={<TouchableOpacity accessibilityRole="button" accessibilityLabel={t("profile.configuration")} onPress={() => navigation.navigate("Settings" as never)} style={localStyles.settingsButton}>
            <Icon name="settings-outline" size={24} color={vibesTheme.colors.primaryText} />
          </TouchableOpacity>} />
        <Text style={localStyles.eyebrow}>TU ESPACIO</Text>
        <Text style={localStyles.title}>{t("profile.title")}</Text>

        <View style={localStyles.profileCard}>
          <View style={localStyles.avatarWrap}><ProfileCompletionAvatar
            uri={ownAvatarUri}
            percent={
              profile && !loadingPreferences && !preferencesError && !loadingAnswers && !answersError
                ? completion.percent
                : null
            }
            onPress={() => navigation.navigate(completion.nextScreen as never)}
          /></View>
          <View style={localStyles.profileInfo}>
            <Text style={localStyles.profileName}>{displayName}</Text>
            <Text style={localStyles.profileLocation}>{location}</Text>
            {ownProfile.zodiac ? (
              <Text style={[localStyles.profileLocation, localStyles.zodiac]}>
                {ownProfile.zodiac}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={localStyles.editButton}
            accessibilityRole="button" accessibilityLabel="Editar perfil"
            onPress={() => navigation.navigate("EditProfile" as never)}
          >
            <Icon name="create-outline" size={20} color={vibesTheme.colors.surface} />
            <Text style={localStyles.editText}>{t("common.edit")}</Text>
            <Icon name="arrow-forward" size={20} color={vibesTheme.colors.surface} />
          </TouchableOpacity>
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
                <Icon name={item.icon} size={22} color={vibesTheme.colors.primaryText} />
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
              <Icon name="power" size={22} color={TEXT_SECONDARY} />
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

        <View style={styles.auraFooter}>
          <Text style={styles.auraFooterVersion}>
            Vibes - v {formattedAppVersion}
          </Text>
        </View>
    </ScreenContainer>
  );
};

const colors = vibesTheme.colors;
const localStyles = StyleSheet.create({
  header: { paddingHorizontal: 0, paddingTop: 8, paddingBottom: 16 },
  settingsButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 24, backgroundColor: `${colors.primaryText}08` },
  eyebrow: { color: colors.accentBlue, fontFamily: vibesTheme.fonts.semibold, fontSize: 12, letterSpacing: 2, marginTop: 16 },
  title: { color: colors.primaryText, fontFamily: vibesTheme.fonts.extraBold, fontSize: 36, lineHeight: 44, marginTop: 10, marginBottom: 24 },
  profileCard: { backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: `${colors.primaryText}20`, padding: 24, alignItems: "center", marginBottom: 28 },
  avatarWrap: { paddingLeft: 12 },
  profileInfo: { width: "100%", alignItems: "center", marginTop: 16, marginBottom: 22, gap: 6 },
  profileName: { fontFamily: vibesTheme.fonts.bold, fontSize: 26, lineHeight: 34, textAlign: "center", color: colors.primaryText },
  profileLocation: { fontFamily: vibesTheme.fonts.regular, fontSize: 15, lineHeight: 22, textAlign: "center", color: colors.secondaryText },
  zodiac: { color: colors.accentBlue },
  editButton: { minHeight: 56, borderRadius: 28, paddingHorizontal: 24, paddingVertical: 14, width: "100%", backgroundColor: colors.primaryText, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  editText: { fontFamily: vibesTheme.fonts.semibold, fontSize: 17, color: colors.surface, flexShrink: 1 },
  menuList: { gap: 12, marginBottom: 12 },
  menuItem: { minHeight: 76, flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 20, borderWidth: 1, borderColor: `${colors.primaryText}20`, backgroundColor: `${colors.primaryText}03`, gap: 14 },
  menuItemLast: { marginBottom: 0 },
  menuIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: `${colors.accentCoral}24` },
  menuLabel: { flex: 1, fontFamily: vibesTheme.fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.primaryText },
});

export default Profile;
