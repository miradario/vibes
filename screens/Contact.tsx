/** @format */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";
import styles, { DARK_GRAY, GRAY, TEXT_SECONDARY, WHITE } from "../assets/styles";
import Icon from "../components/Icon";
import AppHeader from "../components/AppHeader";
import { useI18n } from "../src/i18n";
import { vibesTheme } from "../src/theme/vibesTheme";

const Contact = () => {
  const { t } = useI18n();
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
  ];

  return (
    <View style={styles.bg}>
      <View style={styles.settingsContainer}>
        <AppHeader
          title={t("contact.title")}
          subtitle={t("contact.subtitle")}
          style={localStyles.header}
        />



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

        <Text style={localStyles.note}>{t("contact.confidential")}</Text>
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  header: {
    paddingHorizontal: 0,
    marginBottom: 14,
  },
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
    fontFamily: vibesTheme.fonts.subtitle,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#AEBFD1",
    overflow: "hidden",
  },
  row: {
    minHeight: 74,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#AEBFD1",
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
    backgroundColor: "#F6F6F4",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    color: DARK_GRAY,
    fontSize: 16,
    fontFamily: vibesTheme.fonts.thin,
  },
  rowSubtitle: {
    fontFamily: vibesTheme.fonts.subtitle,
    color: GRAY,
    fontSize: 13,
    marginTop: 2,
  },
  note: {
    marginTop: 14,
    textAlign: "center",
    color: GRAY,
    fontSize: 14,
    fontFamily: vibesTheme.fonts.medium,
  },
});

export default Contact;
