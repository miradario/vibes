/** @format */

import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  StyleSheet,
} from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import styles from "../assets/styles";
import { useAuthSession } from "../src/auth/auth.queries";

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
    <View style={styles.bg}>
      <ImageBackground
        source={require("../assets/images/background.png")}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />

      <View style={styles.welcomeContainer}>
        <View style={styles.welcomeTop}>
          <Image
            source={require("../assets/images/logo.png")}
            // girar
            style={styles.welcomeLogo}
          />
        </View>

        <View style={styles.welcomeCard}>
          <View style={styles.welcomeButtons}>
            <TouchableOpacity
              style={styles.welcomePrimary}
              onPress={() => navigation.navigate("Login" as never)}
            >
              <Text style={styles.welcomePrimaryText}>Log in</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.welcomeSecondary}
              onPress={() => navigation.navigate("Signup" as never)}
            >
              <Text style={styles.welcomeSecondaryText}>Sign up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.welcomeSecondary}
              onPress={() =>
                navigation.navigate(
                  "Session" as never,
                  { title: "AI Session" } as never
                )
              }
            >
              <Text style={styles.welcomeSecondaryText}>Try Guru Vibe</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

export default Welcome;
