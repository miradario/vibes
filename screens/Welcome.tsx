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
      <View pointerEvents="none" style={localStyles.authBackdrop}>
        <View style={localStyles.blobTopLeft} />
        <View style={localStyles.blobTopRight} />
        <View style={localStyles.blobBottom} />
      </View>
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
  authBackdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  blobTopLeft: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255, 226, 200, 0.6)",
    top: -60,
    right: -60,
  },
  blobTopRight: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(247, 210, 201, 0.48)",
    top: 300,
    left: -90,
  },
  blobBottom: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(193, 213, 255, 0.4)",
    bottom: -100,
    right: -70,
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
