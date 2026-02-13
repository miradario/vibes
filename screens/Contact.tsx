/** @format */

import React from "react";
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY, GRAY, TEXT_SECONDARY, WHITE } from "../assets/styles";
import Icon from "../components/Icon";

const CONTACT_ITEMS = [
  {
    icon: "mail-open-outline",
    title: "Email",
    subtitle: "hola@esvibes.com",
    action: () => Linking.openURL("mailto:hola@esvibes.com"),
  },
  {
    icon: "logo-instagram",
    title: "Instagram",
    subtitle: "@esvibes",
    action: () => Linking.openURL("https://instagram.com/esvibes"),
  },
  {
    icon: "bulb-outline",
    title: "Sugerencias",
    subtitle: "Ayudanos a mejorar",
    action: () =>
      Linking.openURL(
        "mailto:hola@esvibes.com?subject=Sugerencias%20Vibes&body=Hola%20equipo%20Vibes,"
      ),
  },
];

const Contact = () => {
  const navigation = useNavigation();

  return (
    <ImageBackground
      source={require("../assets/images/backgroundSimple.png")}
      style={styles.bg}
    >
      <View style={styles.settingsContainer}>
        <View style={styles.settingsHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={22} color={DARK_GRAY} />
          </TouchableOpacity>
          <Text style={styles.settingsTitle}>Contacto</Text>
          <View style={{ width: 22 }} />
        </View>

        <Image source={require("../assets/images/logo.png")} style={localStyles.hero} />
        <Text style={localStyles.subtitle}>
          Escribinos con confianza y presencia.
        </Text>

        <View style={localStyles.card}>
          {CONTACT_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.title}
              style={[localStyles.row, index === CONTACT_ITEMS.length - 1 && localStyles.rowLast]}
              onPress={item.action}
            >
              <View style={localStyles.rowLeft}>
                <View style={localStyles.iconCircle}>
                  <Icon name={item.icon} size={18} color={TEXT_SECONDARY} />
                </View>
                <View>
                  <Text style={localStyles.rowTitle}>{item.title}</Text>
                  <Text style={localStyles.rowSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <Icon name="chevron-forward" size={18} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={localStyles.note}>Tu mensaje es 100% confidencial.</Text>
      </View>
    </ImageBackground>
  );
};

const localStyles = StyleSheet.create({
  hero: {
    width: 160,
    height: 160,
    alignSelf: "center",
    resizeMode: "contain",
    marginTop: 8,
  },
  subtitle: {
    textAlign: "center",
    color: DARK_GRAY,
    fontSize: 16,
    marginTop: 8,
    marginBottom: 18,
    fontFamily: "serif",
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8D8C7",
    overflow: "hidden",
  },
  row: {
    minHeight: 74,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE1D4",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3EAE0",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    color: DARK_GRAY,
    fontSize: 16,
    fontFamily: "serif",
  },
  rowSubtitle: {
    color: GRAY,
    fontSize: 13,
    marginTop: 2,
  },
  note: {
    marginTop: 14,
    textAlign: "center",
    color: GRAY,
    fontSize: 14,
    fontFamily: "serif",
  },
});

export default Contact;
