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
import DEMO from "../assets/data/demo";
import styles, { TEXT_SECONDARY } from "../assets/styles";
import { useLogoutMutation } from "../src/auth/auth.queries";

const Profile = () => {
  const navigation = useNavigation();
  const { image, name, location } = DEMO[0];
  const { mutate: logout, isPending: isLoggingOut } = useLogoutMutation();

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
            <Image source={image} style={styles.auraProfileAvatar} />
          </View>
          <View style={styles.auraProfileInfo}>
            <Text style={styles.auraProfileName}>
              {name?.split(" ")[0]} {name?.split(" ")[1]?.charAt(0)}.
            </Text>
            <Text style={styles.auraProfileLocation}>
              {location || "Buenos Aires"}
            </Text>
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
