/** @format */

import React from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
} from "react-native";
import { Text } from "../components/Typography";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles, { GRAY, TEXT_SECONDARY } from "../assets/styles";
import Icon from "../components/Icon";
import NotificationPreferencesSection from "../components/NotificationPreferencesSection";
import AppHeader from "../components/AppHeader";
import { useI18n } from "../src/i18n";
import { vibesTheme } from "../src/theme/vibesTheme";

const ACCOUNT_DELETION_URL =
  "https://vibes.gurudevelopers.dev/eliminacion-de-datos";

const Configuration = () => {
  const navigation = useNavigation();
  const { t } = useI18n();
  const handleDeleteAccount = () => {
    Alert.alert(
      t("profile.deleteAccountTitle"),
      t("profile.deleteAccountMessage"),
      [
        {
          text: t("profile.deleteAccountCancel"),
          style: "cancel",
        },
        {
          text: t("profile.deleteAccountConfirm"),
          style: "destructive",
          onPress: () => {
            void Linking.openURL(ACCOUNT_DELETION_URL);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.bg} edges={["top", "left", "right"]}>
      <View style={localStyles.fixedHeader}>
        <AppHeader
          title={t("configuration.title")}
          titleNumberOfLines={2}
          showBack
          onBack={() => navigation.goBack()}
          style={localStyles.appHeader}
          contentStyle={localStyles.headerCopy}
          titleStyle={localStyles.headerTitle}
        />
      </View>

      <ScrollView
        style={localStyles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={localStyles.scrollContent}
      >
        <NotificationPreferencesSection />
        <TouchableOpacity
          accessibilityRole="button"
          style={[localStyles.card, { marginTop: 28 }]}
          onPress={handleDeleteAccount}
        >
          <Icon name="trash-outline" size={22} color={TEXT_SECONDARY} />
          <Text style={[localStyles.cardText, { flex: 1, marginLeft: 12 }]}>
            {t("profile.deleteAccount")}
          </Text>
          <Icon name="chevron-forward" size={20} color={TEXT_SECONDARY} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  fixedHeader: {
    backgroundColor: vibesTheme.colors.background,
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(43, 43, 43, 0.06)",
    zIndex: 10,
  },
  appHeader: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  headerCopy: {
    flex: 1,
  },

  headerTitle: {
    fontFamily: vibesTheme.fonts.semibold,
    color: vibesTheme.colors.primaryText,
    fontSize: 30,
    lineHeight: 38,
    includeFontPadding: true,
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 118,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.06)",
    backgroundColor: vibesTheme.colors.background,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  cardText: {
    color: GRAY,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default Configuration;
