import React, { useMemo } from "react";
import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../components/Typography";
import VibesActionButton from "../components/VibesActionButton";
import ScreenContainer from "../components/ScreenContainer";
import QuietBrandHeader from "../components/QuietBrandHeader";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  dismissSuggestedUpdate,
  openAppUpdateStore,
  type AppUpdateGateState,
} from "../src/lib/appUpdateGate";
import { useI18n } from "../src/i18n";
import { vibesTheme } from "../src/theme/vibesTheme";
import { getPostAuthRoute } from "../src/lib/onboardingFlow";
import * as ds from "../src/theme/tokens";

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
    <ScreenContainer
      style={styles.screen}
      edges={["top", "bottom", "left", "right"]}
    >
      <View style={styles.content}>
        <QuietBrandHeader
          title={isForce ? t("update.forceTitle") : t("update.suggestedTitle")}
          subtitle={body}
        />
      </View>

      <View style={styles.actions}>
        <VibesActionButton
          label={t("update.updateNow")}
          style={styles.primaryButton}
          onPress={() => {
            void handleUpdateNow();
          }}
        />
        {!isForce ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void handleLater();
            }}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryText}>{t("update.later")}</Text>
          </Pressable>
        ) : null}
      </View>
    </ScreenContainer>
  );
};

const colors = vibesTheme.colors;
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: ds.spacing[6],
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  actions: {
    gap: ds.spacing[3],
    alignItems: "center",
    paddingBottom: ds.spacing[8],
  },
  primaryButton: {
    maxWidth: 480,
    ...ds.shadows.none,
  },
  secondaryButton: {
    width: "100%",
    maxWidth: 480,
    height: 58,
    borderRadius: ds.radii.xl,
    borderWidth: 1,
    borderColor: colors.accentBlue,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    color: colors.accentBlue,
    ...ds.textStyles.heading,
  },
  pressed: { opacity: 0.8 },
});

export default UpdateGate;
