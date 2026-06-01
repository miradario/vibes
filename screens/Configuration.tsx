/** @format */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles, {
  DARK_GRAY,
  GRAY,
  PRIMARY_COLOR,
  TEXT_SECONDARY,
  WHITE,
} from "../assets/styles";
import Icon from "../components/Icon";
import AppHeader from "../components/AppHeader";
import { useAuthSession } from "../src/auth/auth.queries";
import { upsertUserPreferences } from "../src/lib/userPreferencesStore";
import { deactivateUserPushTokens } from "../src/notifications/pushNotifications";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { showToast } from "../src/utils/toast";
import { useI18n } from "../src/i18n";

const Configuration = () => {
  const navigation = useNavigation();
  const { t } = useI18n();
  const { data: session } = useAuthSession();
  const { data: prefs, refetch } = useUserPreferencesQuery(session?.user?.id);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNotificationsEnabled(prefs?.notificationsEnabled ?? true);
  }, [prefs?.notificationsEnabled]);

  const handleSave = async () => {
    const userId = session?.user?.id;
    if (!userId) {
      Alert.alert(t("common.error"), t("configuration.missingSession"));
      return;
    }

    setIsSaving(true);

    try {
      await upsertUserPreferences(userId, {
        notifications_enabled: notificationsEnabled,
      });

      if (!notificationsEnabled) {
        await deactivateUserPushTokens(userId);
      }

      await refetch();
      navigation.goBack();
      setTimeout(() => {
        showToast(t("configuration.saved"), {
          type: "success",
          text1: t("configuration.saved"),
        });
      }, 180);
    } catch (error: any) {
      Alert.alert(t("common.error"), error?.message || t("configuration.saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.bg} edges={["top", "left", "right"]}>
      <View style={localStyles.fixedHeader}>
        <AppHeader
          title={t("configuration.title")}
          subtitle={t("configuration.subtitle")}
          showBack
          onBack={() => navigation.goBack()}
          style={localStyles.appHeader}
          contentStyle={localStyles.headerCopy}
          titleStyle={localStyles.headerTitle}
          subtitleStyle={localStyles.headerSubtitle}
        />
      </View>

      <ScrollView
        style={localStyles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={localStyles.scrollContent}
      >
        <View style={localStyles.section}>
          <View style={localStyles.sectionHeader}>
            <Icon name="notifications-outline" size={18} color={TEXT_SECONDARY} />
            <Text style={localStyles.sectionTitle}>{t("configuration.notifications")}</Text>
            <View style={localStyles.line} />
          </View>

          <View style={localStyles.card}>
            <View style={localStyles.cardCopy}>
              <Text style={localStyles.cardText}>{t("configuration.notificationsHint")}</Text>
              <Text
                style={[
                  localStyles.cardStatus,
                  notificationsEnabled && localStyles.cardStatusEnabled,
                ]}
              >
                {notificationsEnabled
                  ? t("configuration.enabled")
                  : t("configuration.disabled")}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: "#D8D3CC", true: "#E4B76E" }}
              thumbColor={Platform.OS === "ios" ? WHITE : notificationsEnabled ? PRIMARY_COLOR : WHITE}
              ios_backgroundColor="#D8D3CC"
            />
          </View>
        </View>
      </ScrollView>

      <View style={localStyles.saveButtonFixedWrap}>
        <TouchableOpacity
          style={[localStyles.saveButton, isSaving && localStyles.saveButtonDisabled]}
          onPress={() => {
            void handleSave();
          }}
          disabled={isSaving}
        >
          <Text style={localStyles.saveButtonText}>{t("common.save")}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  fixedHeader: {
    backgroundColor: "#FFFFFF",
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
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F6F4",
    marginTop: 6,
  },
  headerCopy: {
    flex: 1,
  },
  headerTextWrap: {
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 40,
    lineHeight: 44,
  },
  headerSubtitle: {
    fontSize: 18,
    lineHeight: 22,
  },
  headerSpacer: {
    width: 20,
    height: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 118,
  },
  section: {
    marginTop: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    color: DARK_GRAY,
    fontWeight: "400",
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#F6F6F4",
    marginLeft: 10,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.06)",
    backgroundColor: "#FFFFFF",
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  cardCopy: {
    flex: 1,
  },
  cardText: {
    color: GRAY,
    fontSize: 14,
    lineHeight: 20,
  },
  cardStatus: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    marginTop: 10,
  },
  cardStatusEnabled: {
    color: PRIMARY_COLOR,
  },
  saveButtonFixedWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopWidth: 1,
    borderTopColor: "rgba(43, 43, 43, 0.06)",
  },
  saveButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "400",
  },
});

export default Configuration;
