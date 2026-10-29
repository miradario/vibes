import { useVibesPointsEnabled } from "../src/featureFlags/useVibesPointsEnabled";
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
import { getProfileCompletion, nextProfileParams } from "../src/lib/profileCompletion";
import VibesLoader from "../components/VibesLoader";
import { getInstalledAppVersion, getInstalledAppBuildNumber } from "../src/lib/appUpdateGate";
import appConfig from "../app.json";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

const Profile = () => {
  const { t, locale } = useI18n();
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

  const location = [profile?.neighborhood, profile?.city, profile?.country].filter((part):part is string => typeof part === "string" && Boolean(part.trim())).map(part => part.trim()).join(", ") || ownProfile.location || "Ubicación sin completar";
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

  const vibesPointsEnabled = useVibesPointsEnabled();
  const menuItems = [
    ...(vibesPointsEnabled ? [{ icon: "pulse-outline", label: "Tus Vibes", screen: "VibesPoints" }] : []),
    {
      icon: "create-outline",
      label: "Sobre mí",
      screen: "ProfileQuestions",
    },
    {
      icon: "options",
      label: t("profile.configuration"),
      screen: "Configuration",
    },
    {
      icon: "shield-checkmark-outline",
      label: locale.startsWith("en") ? "Help and child safety" : "Ayuda y seguridad infantil",
      screen: "Contact",
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

  const completionReady = Boolean(profile) && !loadingPreferences && !preferencesError && !loadingAnswers && !answersError;
  const openCompletion = () =>
    completionReady && completion.missingSummary
      ? navigation.navigate(completion.nextScreen as never, nextProfileParams(completion) as never)
      : navigation.navigate("VibesOnboardingFlow" as never, {resume:true} as never);

  return (
    <ScreenContainer scroll edges={["top", "left", "right"]}
      contentContainerStyle={{ paddingHorizontal: ds.spacing[6], paddingBottom: getBottomTabContentPadding(insets.bottom, 48) }}
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
            onPress={openCompletion}
          /></View>
          <View style={localStyles.profileInfo}>
            <View style={localStyles.nameRow}>
            <Text style={localStyles.profileName} numberOfLines={2}>{displayName}</Text>
          <TouchableOpacity
            style={localStyles.editButton}
            accessibilityRole="button" accessibilityLabel="Editar perfil"
            onPress={() => navigation.navigate("EditProfile" as never)}
          >
            <Icon name="create-outline" size={ds.iconSize.md} color={vibesTheme.colors.accentBlue} />
            <Text style={localStyles.editText}>{t("common.edit")}</Text>
          </TouchableOpacity>
            </View>
            <Text style={localStyles.profileLocation}>{location}</Text>
            {profile && !loadingPreferences && !preferencesError && !loadingAnswers && !answersError && completion.missingSummary ? (
              <Text style={localStyles.missingSummary} numberOfLines={1} onPress={openCompletion} accessibilityRole="button">
                {`Falta: ${completion.missingSummary}`}
              </Text>
            ) : null}
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
              <View style={[localStyles.menuIcon, { backgroundColor: ds.withAlpha([vibesTheme.colors.accentBlue, vibesTheme.colors.accentMustard, vibesTheme.colors.accentCoral][index % 3], ds.opacity.soft) }]}>
                <Icon name={item.icon} size={ds.iconSize.md} color={vibesTheme.colors.primaryText} />
              </View>
              <Text style={localStyles.menuLabel}>{item.label}</Text>
              <Icon name="chevron-forward" size={ds.iconSize.md} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[localStyles.menuItem, localStyles.menuItemLast]}
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            <View style={localStyles.menuIcon}>
              <Icon name="power" size={ds.iconSize.md} color={TEXT_SECONDARY} />
            </View>
            <Text style={localStyles.menuLabel}>
              {isLoggingOut ? t("profile.loggingOut") : t("profile.logout")}
            </Text>
            {isLoggingOut ? (
              <VibesLoader />
            ) : (
              <Icon name="chevron-forward" size={ds.iconSize.md} color={TEXT_SECONDARY} />
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
  missingSummary: {
    marginTop: ds.spacing[1],
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.bodySmall,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: ds.spacing[1], marginBottom: ds.spacing[4] },
  footer: { alignItems: "center", gap: ds.spacing[2], paddingTop: ds.spacing[6], paddingBottom: ds.spacing[4] },
  title: { color: colors.primaryText, ...ds.textStyles.title, marginTop: 0, marginBottom: 0 },
  profileCard: { marginBottom: ds.spacing[5] },
  profileRow: { flexDirection: "row", alignItems: "center", marginBottom: ds.spacing[4] },
  avatarWrap: { alignSelf: "flex-start" },
  profileInfo: { flex: 1, minWidth: 0, gap: ds.spacing[1] },
  nameRow: { flexDirection: "row", alignItems: "center", gap: ds.spacing[3], justifyContent: "space-between" },
  profileName: { flex: 1, minWidth: 0, ...ds.textStyles.heading, color: colors.primaryText },
  profileLocation: { ...ds.textStyles.bodySmall, color: colors.secondaryText },
  zodiac: { color: colors.accentBlue },
  editButton: { minHeight: 44, borderRadius: ds.radii.lg, paddingHorizontal: ds.spacing[4], paddingVertical: ds.spacing[3], backgroundColor: ds.colors.feedback.infoBg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: ds.spacing[2] },
  editText: { ...ds.textStyles.label, color: colors.accentBlue, flexShrink: 1 },
  menuList: { gap: ds.spacing[2], marginBottom: ds.spacing[3] },
  menuItem: { minHeight: 56, flexDirection: "row", alignItems: "center", padding: ds.spacing[3], borderRadius: ds.radii.lg, borderWidth: 1, borderColor: ds.colors.border.default, backgroundColor: ds.colors.bg.subtle, gap: ds.spacing[3] },
  menuItemLast: { marginBottom: 0 },
  menuIcon: { width: 34, height: 34, borderRadius: ds.radii.md, alignItems: "center", justifyContent: "center", backgroundColor: ds.colors.feedback.errorBg },
  menuLabel: { flex: 1, ...ds.textStyles.label, color: colors.primaryText },
});

export default Profile;
