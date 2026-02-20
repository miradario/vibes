/** @format */

import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import { useAuthSession } from "../src/auth/auth.queries";
import VibesActionButton from "../components/VibesActionButton";
import { vibesTheme } from "../src/theme/vibesTheme";

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
            <Svg width="100%" height="100%" viewBox="0 0 240 260">
              <Ellipse
                cx="121"
                cy="98"
                rx="30"
                ry="42"
                fill="#AEBFD1"
                opacity={0.28}
              />
              <Circle cx="172" cy="203" r="22" fill="#E4B76E" opacity={0.52} />
              <Circle cx="40" cy="34" r="6" fill="#D88C7A" opacity={0.9} />
              <Circle cx="24" cy="47" r="3.5" fill="#D88C7A" opacity={0.45} />

              <Path
                d="M110 26c-4 23-16 33-28 43-11 10-7 26-4 43 3 16 10 34 11 54 1 18-7 36-7 54 0 18 9 23 22 27 11 3 24 4 35 0"
                stroke="#2B2B2B"
                strokeWidth={1.5}
                opacity={0.55}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M123 24c-3 22 4 32 12 43 8 10 11 29 7 45-5 17-13 33-12 53 0 19 8 33 10 49"
                stroke="#2B2B2B"
                strokeWidth={1.5}
                opacity={0.55}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M114 72c-10-12-26-4-28 10-3 15 15 32 22 44 5 10 3 21-7 25"
                stroke="#2B2B2B"
                strokeWidth={1.5}
                opacity={0.55}
                fill="none"
                strokeLinecap="round"
              />
              <Path
                d="M28 182c8-4 16-1 19 8 10 28 31 45 64 50 23 3 43 1 62-10 20-12 31-30 42-45 8-10 15-8 18 2"
                stroke="#2B2B2B"
                strokeWidth={1.5}
                opacity={0.55}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M186 78c4-4 8-4 11 0"
                stroke="#D88C7A"
                strokeWidth={1.8}
                fill="none"
                strokeLinecap="round"
              />
            </Svg>
          </View>
          <Text style={localStyles.title}>Vibes</Text>
          <Text style={localStyles.subtitle}>A calm space to begin</Text>
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
    width: 210,
    height: 228,
    marginTop: -10,
    marginBottom: 2,
  },
  title: {
    marginTop: 18,
    fontSize: 42,
    color: vibesTheme.colors.primaryText,
    fontFamily: "CormorantGaramond_500Medium",
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 8,
    color: vibesTheme.colors.secondaryText,
    fontSize: 15,
    fontFamily: "CormorantGaramond_500Medium",
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
