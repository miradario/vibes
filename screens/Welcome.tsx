/** @format */

import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useAuthSession } from "../src/auth/auth.queries";
import VibesActionButton from "../components/VibesActionButton";
import { vibesTheme } from "../src/theme/vibesTheme";
import AnimatedIllustration from "../src/components/illustrations/AnimatedIllustration";
import { welcomeIllustrationConfig } from "../src/components/illustrations/presets/welcomeIllustrationConfig";
import VibesHeader from "../src/components/VibesHeader";

const Welcome = () => {
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
            <AnimatedIllustration {...welcomeIllustrationConfig} />
          </View>
          <VibesHeader subtitle="A calm space to begin" />
        </View>

        <View style={localStyles.card}>
          <View style={localStyles.buttons}>
            <VibesActionButton
              label="Log in"
              variant="start"
              onPress={() => navigation.navigate("Login" as never)}
            />
            <VibesActionButton
              label="Sign up"
              variant="skip"
              onPress={() => navigation.navigate("Signup" as never)}
            />
            <TouchableOpacity
              style={localStyles.guruLink}
              onPress={() =>
                navigation.navigate(
                  "Session" as never,
                  { title: "AI Session" } as never,
                )
              }
            >
              <Text style={localStyles.guruLinkText}>Try Guru Vibe</Text>
            </TouchableOpacity>
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
  logo: {
    width: 200,
    height: 110,
    resizeMode: "contain",
    opacity: 0.9,
  },
  illustrationWrap: {
    width: 348,
    height: 368,
    marginTop: -18,
    marginBottom: 2,
  },
  card: {
    marginBottom: 20,
  },
  buttons: {
    width: "100%",
    gap: 12,
  },
  guruLink: {
    alignItems: "center",
    marginTop: 10,
    paddingVertical: 8,
  },
  guruLinkText: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 16,
    fontFamily: "CormorantGaramond_500Medium",
  },
});
