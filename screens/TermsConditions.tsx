/** @format */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY, GRAY, WHITE } from "../assets/styles";
import AppHeader from "../components/AppHeader";
import { useI18n } from "../src/i18n";
import { vibesTheme } from "../src/theme/vibesTheme";

const TermsConditions = () => {
  const { t } = useI18n();
  const navigation = useNavigation();

  return (
    <View style={styles.bg}>
      <View style={styles.settingsContainer}>
        <AppHeader
          title={t("terms.title")}
          showBack
          onBack={() => navigation.goBack()}
          style={localStyles.header}
          titleStyle={styles.settingsTitle}
        />


        <Text style={localStyles.subtitle}>
          {t("terms.subtitle")}
        </Text>

        <ScrollView
          style={localStyles.card}
          contentContainerStyle={localStyles.cardContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={localStyles.titleText}>{t("terms.welcomeTitle")}</Text>
          <Text style={localStyles.bodyText}>{t("terms.welcomeBody")}</Text>

          <Text style={localStyles.titleText}>{t("terms.acceptanceTitle")}</Text>
          <Text style={localStyles.bodyText}>{t("terms.acceptanceBody")}</Text>

          <Text style={localStyles.titleText}>{t("terms.ageTitle")}</Text>
          <Text style={localStyles.bodyText}>{t("terms.ageBody")}</Text>

          <Text style={localStyles.titleText}>{t("terms.privacyTitle")}</Text>
          <Text style={localStyles.bodyText}>{t("terms.privacyBody")}</Text>

          <Text style={localStyles.titleText}>{t("terms.contentTitle")}</Text>
          <Text style={localStyles.bodyText}>{t("terms.contentBody")}</Text>
        </ScrollView>
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
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#AEBFD1",
  },
  cardContent: {
    padding: 16,
    paddingBottom: 30,
  },
  titleText: {
    color: DARK_GRAY,
    fontSize: 17,
    fontFamily: vibesTheme.fonts.medium,
    marginTop: 8,
    marginBottom: 6,
  },
  bodyText: {
    color: GRAY,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 10,
  },
});

export default TermsConditions;
