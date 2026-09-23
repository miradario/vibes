import React, { useMemo } from "react";
import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image, StyleSheet, View } from "react-native";
import { Text } from "../components/Typography";
import VibesActionButton from "../components/VibesActionButton";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  dismissSuggestedUpdate,
  openAppUpdateStore,
  type AppUpdateGateState,
} from "../src/lib/appUpdateGate";
import { useI18n } from "../src/i18n";
import { vibesTheme } from "../src/theme/vibesTheme";
import { getPostAuthRoute } from "../src/lib/onboardingFlow";

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

  const continueIntoApp = async () => {
    const userId = session?.user?.id;
    const routeName = userId ? await getPostAuthRoute(userId) : "Welcome";

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes:
          routeName === "Tab"
            ? [
                {
                  name: "Tab",
                  params: { screen: "Home" },
                },
              ]
            : [{ name: routeName }],
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
    await continueIntoApp();
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Image
            source={require("../assets/images/challenges/vibesLogo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.eyebrow}>
          {isForce ? t("update.forceEyebrow") : t("update.suggestedEyebrow")}
        </Text>
        <Text style={styles.title} maxFontSizeMultiplier={1}>
          {isForce ? t("update.forceTitle") : t("update.suggestedTitle")}
        </Text>
        <Text style={styles.body}>{body}</Text>
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
            style={styles.laterButton}
            showDivider={false}
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
  logo: {
    width: 58,
    height: 58,
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
    fontFamily: vibesTheme.fonts.thin,
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
  actions: {
    paddingBottom: 18,
  },
  laterButton: {
    marginTop: 18,
  },
});

export default UpdateGate;
