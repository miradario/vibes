import React, { useMemo } from "react";
import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text, View } from "react-native";
import Icon from "../components/Icon";
import VibesActionButton from "../components/VibesActionButton";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  dismissSuggestedUpdate,
  openAppUpdateStore,
  type AppUpdateGateState,
} from "../src/lib/appUpdateGate";
import { useI18n } from "../src/i18n";
import { vibesTheme } from "../src/theme/vibesTheme";

type UpdateGateRoute = {
  key: string;
  name: string;
  params?: AppUpdateGateState;
};

const UpdateGate = () => {
  const navigation = useNavigation();
  const route = useRoute<UpdateGateRoute>();
  const { t } = useI18n();
  const { data: session } = useAuthSession();

  const mode = route.params?.mode ?? "suggested";
  const targetVersion = route.params?.targetVersion ?? "";
  const currentVersion = route.params?.currentVersion ?? "";
  const storeUrl = route.params?.storeUrl ?? null;
  const isForce = mode === "force";

  const body = useMemo(() => {
    if (isForce) {
      return t("update.forceBody", {
        current: currentVersion,
        target: targetVersion,
      });
    }

    return t("update.suggestedBody", {
      current: currentVersion,
      target: targetVersion,
    });
  }, [currentVersion, isForce, t, targetVersion]);

  const continueIntoApp = () => {
    const hasSession = Boolean(session?.user?.id);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: hasSession
          ? [
              {
                name: "Tab",
                params: {
                  screen: "Home",
                  params: { startupFadeIn: true },
                },
              },
            ]
          : [{ name: "Welcome" }],
      }),
    );
  };

  const handleUpdateNow = async () => {
    await openAppUpdateStore(storeUrl);
  };

  const handleLater = async () => {
    if (targetVersion) {
      await dismissSuggestedUpdate(targetVersion);
    }
    continueIntoApp();
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Icon
            name={isForce ? "warning-outline" : "sparkles-outline"}
            size={34}
            color={isForce ? vibesTheme.colors.accentCoral : vibesTheme.colors.accentMustard}
          />
        </View>

        <Text style={styles.eyebrow}>
          {isForce ? t("update.forceEyebrow") : t("update.suggestedEyebrow")}
        </Text>
        <Text style={styles.title}>
          {isForce ? t("update.forceTitle") : t("update.suggestedTitle")}
        </Text>
        <Text style={styles.body}>{body}</Text>

        <View style={styles.versionCard}>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>{t("update.currentVersion")}</Text>
            <Text style={styles.versionValue}>{currentVersion || "-"}</Text>
          </View>
          <View style={styles.versionDivider} />
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>{t("update.targetVersion")}</Text>
            <Text style={styles.versionValue}>{targetVersion || "-"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <VibesActionButton
          label={t("update.updateNow")}
          onPress={() => {
            void handleUpdateNow();
          }}
        />
        {!isForce ? (
          <VibesActionButton
            label={t("update.later")}
            variant="skip"
            onPress={() => {
              void handleLater();
            }}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: vibesTheme.colors.background,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(228, 183, 110, 0.14)",
    marginBottom: 24,
  },
  eyebrow: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontFamily: vibesTheme.fonts.medium,
    textAlign: "center",
  },
  title: {
    marginTop: 10,
    color: vibesTheme.colors.primaryText,
    fontSize: 32,
    lineHeight: 36,
    textAlign: "center",
    fontFamily: "CormorantGaramond_700Bold",
  },
  body: {
    marginTop: 12,
    color: vibesTheme.colors.secondaryText,
    fontSize: 18,
    lineHeight: 24,
    textAlign: "center",
    fontFamily: vibesTheme.fonts.medium,
    maxWidth: 310,
  },
  versionCard: {
    marginTop: 28,
    width: "100%",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: vibesTheme.colors.borderSoft,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  versionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  versionLabel: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.medium,
  },
  versionValue: {
    color: vibesTheme.colors.primaryText,
    fontSize: 18,
    lineHeight: 22,
    fontFamily: vibesTheme.fonts.medium,
  },
  versionDivider: {
    height: 1,
    backgroundColor: vibesTheme.colors.borderSoft,
    marginVertical: 12,
  },
  actions: {
    paddingBottom: 18,
  },
});

export default UpdateGate;
