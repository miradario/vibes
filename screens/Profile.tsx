import EmailVerificationCard from "../components/EmailVerificationCard";
/** @format */

import React from "react";
import { ScrollView, View, Text, TouchableOpacity } from "react-native";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components";
import AppHeader from "../components/AppHeader";
import Avatar from "../components/Avatar";
import styles, { TEXT_SECONDARY } from "../assets/styles";
import { useAuthSession, useLogoutMutation } from "../src/auth/auth.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { mapOwnProfileToConnectionProfile } from "../src/lib/connectionProfiles";
import { getBottomTabContentPadding } from "../src/lib/tabBarLayout";
import { useI18n } from "../src/i18n";
import { getProfileCompletion } from "../src/lib/profileCompletion";
import VibesLoader from "../components/VibesLoader";

const Profile = () => {
  const { t } = useI18n();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { data: session } = useAuthSession();
  const { data: profile } = useProfileQuery(session?.user?.id);
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
    },
    session?.user?.email?.split("@")[0]
  );

  const displayName = ownProfile.name;

  const location = ownProfile.location || "Ubicación sin completar";
  const ownAvatarUri = ownProfile.avatarUri ?? null;

  const completion = getProfileCompletion(profile, userPreferences);

  const menuItems = [
    {
      icon: "create-outline",
      label: "Completar y editar respuestas",
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
          <View style={styles.auraProfileAvatarWrap}>
            <Avatar uri={ownAvatarUri} size={70} />
          </View>
          <View style={styles.auraProfileInfo}>
            <Text style={styles.auraProfileName}>{displayName}</Text>
            <Text style={styles.auraProfileLocation}>{location}</Text>
          </View>
          <TouchableOpacity
            style={styles.auraEditButton}
            onPress={() => navigation.navigate("EditProfile" as never)}
          >
            <Text style={styles.auraEditButtonText}>{t("common.edit")}</Text>
          </TouchableOpacity>
        </View>

        {profile && !loadingPreferences && !preferencesError ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Perfil completado ${completion.percent} por ciento. Editar respuestas`}
            onPress={() => navigation.navigate(completion.nextScreen as never)}
            style={{
              padding: 18,
              marginBottom: 16,
              borderRadius: 18,
              backgroundColor: "#F8F3E8",
            }}
          >
            <Text style={{ color: "#2B2B2B", fontSize: 17 }}>
              Perfil completado · {completion.percent}%
            </Text>
            <View
              style={{
                height: 6,
                backgroundColor: "#E8DFCC",
                borderRadius: 3,
                marginVertical: 10,
              }}
            >
              <View
                style={{
                  height: 6,
                  width: `${completion.percent}%`,
                  backgroundColor: "#D7B56D",
                  borderRadius: 3,
                }}
              />
            </View>
            <Text style={{ color: "#666", lineHeight: 20 }}>
              {completion.completed} de {completion.total} datos públicos. Todo
              es opcional.
            </Text>
            {completion.nextLabel ? (
              <Text style={{ color: "#796036", marginTop: 8 }}>
                Completar: {completion.nextLabel}
              </Text>
            ) : null}
          </TouchableOpacity>
        ) : null}

        <EmailVerificationCard userId={session?.user?.id} />

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
          <Text style={styles.auraFooterTitle}>{t("profile.aboutVibes")}</Text>
          <Text style={styles.auraFooterVersion}>version 1.1.4</Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default Profile;
