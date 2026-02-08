/** @format */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  StyleSheet,
  Animated,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { useNavigation } from "@react-navigation/native";
import styles from "../assets/styles";

const Welcome = () => {
  const navigation = useNavigation();
  const [videoError, setVideoError] = useState(false);

  return (
    <View style={styles.bg}>
      <ImageBackground
        source={require("../assets/images/background.png")}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />

      <Video
        source={require("../assets/videos/welcome.mp4")}
        style={StyleSheet.absoluteFillObject}
        resizeMode={ResizeMode.COVER}
        isLooping={false}
        shouldPlay
        isMuted={false}
        volume={1.0}
        onError={() => setVideoError(true)}
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
          </View>
        </View>
      </View>
    </View>
  );
};

export default Welcome;
