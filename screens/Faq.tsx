/** @format */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY, TEXT_SECONDARY, WHITE } from "../assets/styles";
import Icon from "../components/Icon";
import AppHeader from "../components/AppHeader";
import { useI18n } from "../src/i18n";
import { vibesTheme } from "../src/theme/vibesTheme";

const Faq = () => {
  const { t } = useI18n();
  const navigation = useNavigation();
  const FAQ_ITEMS = [
    { question: t("faq.q1"), answer: t("faq.a1") },
    { question: t("faq.q2"), answer: t("faq.a2") },
    { question: t("faq.q3"), answer: t("faq.a3") },
    { question: t("faq.q4"), answer: t("faq.a4") },
  ];

  return (
    <View style={styles.bg}>
      <View style={styles.settingsContainer}>
        <AppHeader
          title={t("faq.title")}
          showBack
          onBack={() => navigation.goBack()}
          style={localStyles.header}
          titleStyle={styles.settingsTitle}
        />


        <Text style={localStyles.subtitle}>
          {t("faq.subtitle")}
        </Text>

        <View style={localStyles.card}>
          {FAQ_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.question}
              style={[localStyles.row, index === FAQ_ITEMS.length - 1 && localStyles.rowLast]}
              onPress={() => Alert.alert(item.question, item.answer)}
            >
              <Text style={localStyles.rowText}>{item.question}</Text>
              <Icon name="chevron-forward" size={18} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  header: {
    paddingHorizontal: 0,
    marginBottom: 6,
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
    fontFamily: vibesTheme.fonts.medium,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#AEBFD1",
    overflow: "hidden",
  },
  row: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#AEBFD1",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowText: {
    flex: 1,
    color: DARK_GRAY,
    fontSize: 16,
    fontFamily: vibesTheme.fonts.medium,
  },
});

export default Faq;
