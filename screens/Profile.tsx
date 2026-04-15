/** @format */

import React from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
} from "react-native";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { Icon } from "../components";
import styles, { TEXT_SECONDARY } from "../assets/styles";
import {
  useAuthSession,
  useLogoutMutation,
} from "../src/auth/auth.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { mapOwnProfileToConnectionProfile } from "../src/lib/connectionProfiles";

const Profile = () => {
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const { data: profile } = useProfileQuery(session?.user?.id);
  const { data: userPreferences } = useUserPreferencesQuery(session?.user?.id);
  const { mutate: logout, isPending: isLoggingOut } = useLogoutMutation();
  const ownProfile = mapOwnProfileToConnectionProfile(
    {
      ...(profile ?? {}),
      ...(userPreferences ?? {}),
    },
    session?.user?.email?.split("@")[0],
  );

  const displayName =
    ownProfile.name;

  const location =
    ownProfile.location ||
    "Buenos Aires";

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
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.auraScreenTitle}>Ajustes</Text>

        <View style={styles.auraProfileCard}>
          <View style={styles.auraProfileAvatarWrap}>
            <Image
              source={ownProfile.image}
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
        </View>

        {ownProfile.preferences && ownProfile.preferences.length > 0 ? (
          <View style={localStyles.preferencesCard}>
            <View style={localStyles.preferencesWrap}>
              {ownProfile.preferences.map((preference, index) => (
                <View
                  key={`${preference}-${index}`}
                  style={localStyles.preferenceChip}
                >
                  <Text style={localStyles.preferenceChipText}>
                    {preference}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.auraFooter}>
          <Text style={styles.auraFooterTitle}>Sobre Vibes</Text>
          <Text style={styles.auraFooterVersion}>version 1.1.4</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const localStyles = {
  preferencesCard: {
    marginTop: 18,
    marginHorizontal: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: "#FBF7F4",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
  },
  preferencesWrap: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
  },
  preferenceChip: {
    backgroundColor: "#F6F6F4",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  preferenceChipText: {
    color: "#2B2B2B",
    fontSize: 14,
    fontFamily: "CormorantGaramond_500Medium",
  },
};

export default Profile;
