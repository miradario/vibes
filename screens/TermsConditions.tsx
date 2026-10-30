/** @format */

import React from "react";
import { View, TouchableOpacity, StyleSheet, Image, ScrollView } from "react-native";
import { Text } from "../components/Typography";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY, GRAY, WHITE } from "../assets/styles";
import AppHeader from "../components/AppHeader";
import { useI18n } from "../src/i18n";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

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

        <Text style={localStyles.subtitle}>{t("terms.subtitle")}</Text>

        <ScrollView
          style={localStyles.card}
          contentContainerStyle={localStyles.cardContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={localStyles.titleText}>{t("terms.welcomeTitle")}</Text>
          <Text style={localStyles.bodyText}>{t("terms.welcomeBody")}</Text>

          <Text style={localStyles.titleText}>
            {t("terms.acceptanceTitle")}
          </Text>
          <Text style={localStyles.bodyText}>{t("terms.acceptanceBody")}</Text>

          <Text style={localStyles.titleText}>{t("terms.ageTitle")}</Text>
          <Text style={localStyles.bodyText}>{t("terms.ageBody")}</Text>

          <Text style={localStyles.titleText}>{t("terms.privacyTitle")}</Text>
          <Text style={localStyles.bodyText}>{t("terms.privacyBody")}</Text>

          <Text style={localStyles.titleText}>{t("terms.contentTitle")}</Text>
          <Text style={localStyles.bodyText}>{t("terms.contentBody")}</Text>

          <Text style={localStyles.titleText}>
            {t("terms.moderationTitle")}
          </Text>
          <Text style={localStyles.bodyText}>{t("terms.moderationBody")}</Text>
        </ScrollView>
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
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: ds.radii.lg,
    borderWidth: 1,
    borderColor: vibesTheme.colors.accentBlue,
  },
  cardContent: {
    padding: ds.spacing[4],
    paddingBottom: ds.spacing[8],
  },
  titleText: {
    color: DARK_GRAY,
    ...ds.textStyles.body,
    marginTop: ds.spacing[2],
    marginBottom: ds.spacing[2],
  },
  bodyText: {
    color: GRAY,
    ...ds.textStyles.bodySmall,
    marginBottom: ds.spacing[3],
  },
});

export default TermsConditions;
