/** @format */

import React from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { Icon } from "../components";
import DEMO from "../assets/data/demo";
import styles, { TEXT_SECONDARY } from "../assets/styles";
import {
  useAuthSession,
  useLogoutMutation,
} from "../src/auth/auth.queries";
import {
  useOnboardingDraft,
  useResetOnboardingMutation,
} from "../src/queries/onboarding.queries";
import { useProfileQuery } from "../src/queries/profile.queries";

const Profile = () => {
  const navigation = useNavigation();
  const fallbackProfile = DEMO[0];
  const { data: session } = useAuthSession();
  const { data: profile } = useProfileQuery(session?.user?.id);
  const { mutate: logout, isPending: isLoggingOut } = useLogoutMutation();
  const { resetDraft } = useOnboardingDraft();
  const { mutate: resetOnboarding, isPending: isResettingOnboarding } =
    useResetOnboardingMutation();

  const displayName =
    (typeof profile?.displayName === "string" && profile.displayName.trim()) ||
    (typeof profile?.name === "string" && profile.name.trim()) ||
    session?.user?.email?.split("@")[0] ||
    fallbackProfile.name ||
    "Vibes";

  const location =
    (typeof profile?.location === "string" && profile.location.trim()) ||
    (typeof profile?.country === "string" && profile.country.trim()) ||
    fallbackProfile.location ||
    "Buenos Aires";

  const profileImageUrl =
    (Array.isArray(profile?.photos) &&
      profile.photos.find((photo: any) => Boolean(photo?.url))?.url) ||
    (typeof profile?.avatarUrl === "string" && profile.avatarUrl.trim()) ||
    (typeof profile?.photoUrl === "string" && profile.photoUrl.trim()) ||
    (typeof profile?.imageUrl === "string" && profile.imageUrl.trim()) ||
    (typeof profile?.avatar === "string" && profile.avatar.trim()) ||
    (typeof profile?.photo === "string" && profile.photo.trim()) ||
    (typeof profile?.image === "string" && profile.image.trim()) ||
    null;

  const [firstName, ...restNames] = displayName.split(" ").filter(Boolean);
  const shortName = restNames.length
    ? `${firstName} ${restNames[0].charAt(0)}.`
    : firstName;

  const menuItems = [
    { icon: "options", label: "Preferencias", screen: "Settings" },
    { icon: "mail", label: "Contacto", screen: "Contact" },
    {
      icon: "document-text",
      label: "Términos y condiciones",
      screen: "TermsConditions",
    },
    { icon: "help-circle", label: "Preguntas frecuentes", screen: "Faq" },
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

  const handleResetOnboardingForCurrentUser = () => {
    const userId = session?.user?.id;
    if (!userId) {
      Alert.alert("Error", "No active session found.");
      return;
    }

    Alert.alert(
      "Reset onboarding (dev)",
      "Esto reinicia tu onboarding para test. No borra tu cuenta.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Resetear",
          style: "destructive",
          onPress: () => {
            resetOnboarding(
              { userId },
              {
                onSuccess: () => {
                  resetDraft();
                  const resetToOnboarding = CommonActions.reset({
                    index: 0,
                    routes: [{ name: "OnboardingName" as never }],
                  });
                  const parentNavigation = navigation.getParent();

                  if (parentNavigation) {
                    parentNavigation.dispatch(resetToOnboarding);
                    return;
                  }

                  navigation.dispatch(resetToOnboarding);
                },
                onError: (error) => {
                  const message =
                    error instanceof Error
                      ? error.message
                      : typeof error === "object" &&
                        error !== null &&
                        "message" in error &&
                        typeof (error as { message?: unknown }).message === "string"
                      ? ((error as { message?: string }).message as string)
                      : "Could not reset onboarding.";
                  Alert.alert("Error", message);
                },
              },
            );
          },
        },
      ],
    );
  };

  return (
    <View style={styles.bg}>
      <ScrollView
        style={styles.containerProfile}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.auraScreenTitle}>Ajustes</Text>

        <View style={styles.auraProfileCard}>
          <View style={styles.auraProfileAvatarWrap}>
            <Image
              source={require("../assets/images/halo.png")}
              style={styles.auraProfileHalo}
            />
            <Image
              source={
                profileImageUrl
                  ? { uri: profileImageUrl }
                  : fallbackProfile.image
              }
              style={styles.auraProfileAvatar}
            />
          </View>
          <View style={styles.auraProfileInfo}>
            <Text style={styles.auraProfileName}>{shortName}</Text>
            <Text style={styles.auraProfileLocation}>{location}</Text>
          </View>
          <TouchableOpacity
            style={styles.auraEditButton}
            onPress={() => navigation.navigate("EditProfile" as never)}
          >
            <Text style={styles.auraEditButtonText}>Editar</Text>
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
              {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
            </Text>
            <Icon name="chevron-forward" size={20} color={TEXT_SECONDARY} />
          </TouchableOpacity>

          {__DEV__ ? (
            <TouchableOpacity
              style={[styles.auraMenuItem, styles.auraMenuItemLast]}
              onPress={handleResetOnboardingForCurrentUser}
              disabled={isResettingOnboarding}
            >
              <View style={styles.auraMenuIconWrap}>
                <Icon name="refresh" size={22} color={TEXT_SECONDARY} />
              </View>
              <Text style={styles.auraMenuLabel}>
                {isResettingOnboarding
                  ? "Reseteando..."
                  : "Reset onboarding (dev)"}
              </Text>
              <Icon name="chevron-forward" size={20} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.auraCard}>
          <Text style={styles.auraCardTitle}>Vibe Plus</Text>
          <Text style={styles.auraCardSubtitle}>
            Level up every action you take on Vibe.
          </Text>
          <View style={styles.auraDots}>
            <View style={[styles.auraDot, styles.auraDotActive]} />
            <View style={styles.auraDot} />
            <View style={styles.auraDot} />
            <View style={styles.auraDot} />
          </View>
          <TouchableOpacity
            style={styles.auraCta}
            onPress={() => navigation.navigate("Premium" as never)}
          >
            <Text style={styles.auraCtaText}>GET VIBE PLUS</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.auraFooter}>
          <Text style={styles.auraFooterTitle}>Sobre Vibes</Text>
          <Text style={styles.auraFooterVersion}>version 1.1.4</Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default Profile;
