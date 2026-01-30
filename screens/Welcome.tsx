import React from "react";
import { View, Text, ImageBackground, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles from "../assets/styles";

const Welcome = () => {
  const navigation = useNavigation();

  return (
    <ImageBackground
      source={require("../assets/images/background.png")}
      style={styles.bg}
    >
      <View style={styles.welcomeContainer}>
        <View style={styles.welcomeTop}>
          <Text style={styles.welcomeTitle}>Vibes</Text>
          <Text style={styles.welcomeSubtitle}>
            A space for conscious connection, intention, and presence.
          </Text>
        </View>

        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeQuestion}>How are you today?</Text>
          <Text style={styles.welcomeQuestion}>What are you looking for?</Text>

          <View style={styles.welcomeButtons}>
            <TouchableOpacity
              style={styles.welcomePrimary}
              onPress={() => navigation.navigate("Tab" as never)}
            >
              <Text style={styles.welcomePrimaryText}>Begin</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.welcomeSecondary}
              onPress={() => navigation.navigate("Meditations" as never)}
            >
              <Text style={styles.welcomeSecondaryText}>Meditate first</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.welcomeSecondary}
              onPress={() => navigation.navigate("Login" as never)}
            >
              <Text style={styles.welcomeSecondaryText}>Log in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
};

export default Welcome;
