import { useQuery } from "@tanstack/react-query";
import { readProfileAnswers } from "../src/lib/profileQuestions";
import { useEmailOwnershipQuery } from "../src/queries/emailOwnership.queries";
import { isEmailOwnershipVerified } from "../src/auth/emailVerification";
/** @format */

import React, { useCallback } from "react";
import {
  Platform,
  ScrollView,
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
    <View style={styles.bg}>
      <ScrollView
        style={styles.containerProfile}
        contentContainerStyle={{
          paddingBottom: getBottomTabContentPadding(insets.bottom, 48),
        }}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          title={t("profile.title")}
          style={{ paddingHorizontal: 0, marginBottom: 8 }}
          contentStyle={{ alignItems: "flex-start", paddingHorizontal: 0 }}
          titleStyle={styles.auraScreenTitle}
        />

        <View style={styles.auraProfileCard}>
          <ProfileCompletionAvatar
            uri={ownAvatarUri}
            percent={
              profile && !loadingPreferences && !preferencesError && !loadingAnswers && !answersError
                ? completion.percent
                : null
            }
            onPress={() => navigation.navigate(completion.nextScreen as never)}
          />
          <View style={styles.auraProfileInfo}>
            <Text style={styles.auraProfileName}>{displayName}</Text>
            <Text style={styles.auraProfileLocation}>{location}</Text>
            {ownProfile.zodiac ? (
              <Text style={[styles.auraProfileLocation, localStyles.zodiac]}>
                {ownProfile.zodiac}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.auraEditButton}
            onPress={() => navigation.navigate("EditProfile" as never)}
          >
            <Text style={styles.auraEditButtonText}>{t("common.edit")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.auraMenuList}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.auraMenuItem,
                index === menuItems.length - 1 && styles.auraMenuItemLast,
              ]}
              onPress={() =>
                item.screen && navigation.navigate(item.screen as never)
              }
            >
              <View style={styles.auraMenuIconWrap}>
                <Icon name={item.icon} size={22} color={TEXT_SECONDARY} />
              </View>
              <Text style={styles.auraMenuLabel}>{item.label}</Text>
              <Icon name="chevron-forward" size={20} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.auraMenuItem, styles.auraMenuItemLast]}
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            <View style={styles.auraMenuIconWrap}>
              <Icon name="power" size={22} color={TEXT_SECONDARY} />
            </View>
            <Text style={styles.auraMenuLabel}>
              {isLoggingOut ? t("profile.loggingOut") : t("profile.logout")}
            </Text>
            {isLoggingOut ? (
              <VibesLoader size={28} />
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
      </ScrollView>
    </View>
  );
};

const localStyles = StyleSheet.create({
  zodiac: {
    color: vibesTheme.colors.accentBlue,
  },
});

export default Profile;
