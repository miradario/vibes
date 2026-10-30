import MeetPeopleSettings from "../components/MeetPeopleSettings";
/** @format */

import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Text } from "../components/Typography";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles, { GRAY, TEXT_SECONDARY } from "../assets/styles";
import Icon from "../components/Icon";
import NotificationPreferencesSection from "../components/NotificationPreferencesSection";
import AppHeader from "../components/AppHeader";
import { useI18n } from "../src/i18n";
import { vibesTheme } from "../src/theme/vibesTheme";
import { supabase } from "../src/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { authKeys } from "../src/auth/auth.queries";
import { resetVibiDailyGreeting } from "../src/lib/vibiDailyPrompts";
import { cardStyles } from "../components/ui/surfaceStyles";
import * as ds from "../src/theme/tokens";

const Configuration = () => {
  const navigation = useNavigation();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const deleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        method: "POST",
        body: {},
      });
      if (error || !(data as { ok?: boolean } | null)?.ok) {
        throw error ?? new Error("delete-account failed");
      }
      // The auth user no longer exists: clear the local session (with a
      // timeout, since signOut can hang once the user is gone), reset the
      // cached session and send the app back to the Welcome screen.
      await Promise.race([
        supabase.auth.signOut({ scope: "local" }).catch(() => undefined),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
      resetVibiDailyGreeting();
      queryClient.setQueryData(authKeys.session, null);
      queryClient.clear();
      setIsDeletingAccount(false);
      const resetToWelcome = CommonActions.reset({
        index: 0,
        routes: [{ name: "Welcome" as never }],
      });
      const parentNavigation = navigation.getParent();
      (parentNavigation ?? navigation).dispatch(resetToWelcome);
    } catch (error) {
      console.error("[Configuration] delete account failed", error);
      setIsDeletingAccount(false);
      Alert.alert(
        t("profile.deleteAccountErrorTitle"),
        t("profile.deleteAccountErrorMessage")
      );
    }
  };

  const handleDeleteAccount = () => {
    if (isDeletingAccount) return;
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
            void deleteAccount();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.bg} edges={["top", "bottom", "left", "right"]}>
      <View style={localStyles.fixedHeader}>
        <AppHeader
          title={t("configuration.title")}
          titleNumberOfLines={1}
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
        <MeetPeopleSettings />
        <NotificationPreferencesSection />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: isDeletingAccount, busy: isDeletingAccount }}
          disabled={isDeletingAccount}
          style={[
            localStyles.card,
            { marginTop: ds.spacing[8] },
            isDeletingAccount && { opacity: 0.6 },
          ]}
          onPress={handleDeleteAccount}
        >
          <Icon name="trash-outline" size={ds.iconSize.lg} color={TEXT_SECONDARY} />
          <Text style={[localStyles.cardText, { flex: 1, marginLeft: ds.spacing[3] }]}>
            {isDeletingAccount
              ? t("profile.deletingAccount")
              : t("profile.deleteAccount")}
          </Text>
          {isDeletingAccount ? (
            <ActivityIndicator size="small" color={TEXT_SECONDARY} />
          ) : (
            <Icon name="chevron-forward" size={ds.iconSize.md} color={TEXT_SECONDARY} />
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  fixedHeader: {
    backgroundColor: vibesTheme.colors.background,
    paddingHorizontal: ds.spacing[6],
    paddingTop: ds.spacing[2],
    paddingBottom: ds.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: ds.colors.border.subtle,
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
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.display,
    includeFontPadding: true,
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: ds.spacing[6],
  },
  scrollContent: {
    paddingTop: ds.spacing[3],
    paddingBottom: /* ds-lint-allow layout: paddingBottom 150 (medida de layout fuera de la escala) */ 150,
  },
  card: { ...cardStyles.base, padding: ds.spacing[4], flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: ds.spacing[4] },
  cardText: {
    color: GRAY,
    ...ds.textStyles.bodySmall,
  },
});

export default Configuration;
