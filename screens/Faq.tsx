/** @format */

import React from "react";
import { View, TouchableOpacity, StyleSheet, Image, Alert } from "react-native";
import { Text } from "../components/Typography";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY, TEXT_SECONDARY, WHITE } from "../assets/styles";
import Icon from "../components/Icon";
import AppHeader from "../components/AppHeader";
import { useI18n } from "../src/i18n";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

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
              <Icon name="chevron-forward" size={ds.iconSize.md} color={TEXT_SECONDARY} />
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
    marginBottom: ds.spacing[2],
  },
  hero: {
    width: 160,
    height: 160,
    alignSelf: "center",
    resizeMode: "contain",
    marginTop: ds.spacing[2],
  },
  subtitle: {
    textAlign: "center",
    color: DARK_GRAY,
    ...ds.textStyles.subtitleMedium,
    marginTop: ds.spacing[2],
    marginBottom: ds.spacing[4],
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: ds.radii.lg,
    borderWidth: 1,
    borderColor: vibesTheme.colors.accentBlue,
    overflow: "hidden",
  },
  row: {
    minHeight: 64,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: vibesTheme.colors.accentBlue,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: ds.spacing[3],
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowText: {
    flex: 1,
    color: DARK_GRAY,
    ...ds.textStyles.subtitleMedium,
  },
});

export default Faq;
