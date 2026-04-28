/** @format */

import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { ResizeMode } from "expo-av";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useAuthSession } from "../src/auth/auth.queries";
import VibesActionButton from "../components/VibesActionButton";
import LoopingVideo from "../components/LoopingVideo";
import { vibesTheme } from "../src/theme/vibesTheme";
import VibesHeader from "../src/components/VibesHeader";
import { useI18n } from "../src/i18n";

const Welcome = () => {
  const { t } = useI18n();
  const navigation = useNavigation();
  const { data: session, isLoading } = useAuthSession();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isLoading) return;
    if (isFocused && session?.user?.id) {
      navigation.navigate("Tab" as never);
    }
  }, [isFocused, isLoading, navigation, session?.user?.id]);

  return (
    <View style={localStyles.container}>
      <View style={localStyles.content}>
        <View style={localStyles.top}>
          <View style={localStyles.illustrationWrap}>
            <LoopingVideo
              source={require("../assets/videos/bienvenidx.mp4")}
              posterSource={require("../assets/images/challenges/vibesLogo.png")}
              style={localStyles.video}
              resizeMode={ResizeMode.CONTAIN}
            />
          </View>
          <VibesHeader subtitle={t("welcome.subtitle")} />
        </View>

        <View style={localStyles.card}>
          <View style={localStyles.buttons}>
            <VibesActionButton
              label={t("welcome.login")}
              variant="start"
              onPress={() => navigation.navigate("Login" as never)}
            />
            <VibesActionButton
              label={t("welcome.signup")}
              variant="skip"
              onPress={() => navigation.navigate("Signup" as never)}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default Welcome;

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: vibesTheme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    paddingTop: 72,
    paddingBottom: 40,
  },
  top: {
    alignItems: "center",
    marginTop: 30,
  },
  illustrationWrap: {
    width: 348,
    height: 368,
    marginTop: -18,
    marginBottom: 2,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  card: {
    marginBottom: 20,
  },
  buttons: {
    width: "100%",
    gap: 12,
  },
});
