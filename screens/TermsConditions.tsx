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
import Icon from "../components/Icon";
import { useI18n } from "../src/i18n";

const TermsConditions = () => {
  const { t } = useI18n();
  const navigation = useNavigation();

  return (
    <View style={styles.bg}>
      <View style={styles.settingsContainer}>
        <View style={styles.settingsHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={22} color={DARK_GRAY} />
          </TouchableOpacity>
          <Text style={styles.settingsTitle}>{t("terms.title")}</Text>
          <View style={{ width: 22 }} />
        </View>


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
    fontFamily: "CormorantGaramond_500Medium",
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
    fontFamily: "CormorantGaramond_500Medium",
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
