/** @format */

import React, { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { useNavigation, useRoute } from "@react-navigation/native";
import styles from "../assets/styles";
import DEMO from "../assets/data/demo";
import Icon from "../components/Icon";

const Match = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const randomProfile = useMemo(
    () => DEMO[Math.floor(Math.random() * DEMO.length)],
    [],
  );
  const profile = route?.params?.profile ?? randomProfile;

  const leftAvatarX = useRef(new Animated.Value(-120)).current;
  const rightAvatarX = useRef(new Animated.Value(120)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(leftAvatarX, {
        toValue: 0,
        speed: 12,
        bounciness: 6,
        useNativeDriver: true,
      }),
      Animated.spring(rightAvatarX, {
        toValue: 0,
        speed: 12,
        bounciness: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [leftAvatarX, rightAvatarX]);

  return (
    <View style={[styles.matchScreen, matchVideoStyles.container]}>
      <Video
        source={require("../assets/videos/match.mp4")}
        style={matchVideoStyles.video}
        resizeMode={ResizeMode.COVER}
        isLooping
        shouldPlay
        isMuted={false}
        volume={1.0}
      />
      <View style={matchVideoStyles.overlay} />
      <View style={styles.matchScreen}>
        <View style={matchVideoStyles.matchCard}>
          <Text style={matchVideoStyles.matchTitle}>
            Our energies resonated
          </Text>
          <Text style={matchVideoStyles.matchSubtitle}>
            You and {profile?.name?.split(" ")[0] || "your soulmate"} are now
            connected
          </Text>

          <View style={matchVideoStyles.avatarBackground}>
            <View style={matchVideoStyles.matchAvatarRow}>
              {/* Left Avatar with Halo and Sparkles */}
              <Animated.View
                style={[
                  matchVideoStyles.matchAvatarContainer,
                  {
                    transform: [{ translateX: leftAvatarX }],
                  },
                ]}
              >
                <View style={matchVideoStyles.matchHaloWrap}>
                  <Image
                    source={require("../assets/images/sparklings.png")}
                    style={matchVideoStyles.matchSparkles}
                    resizeMode="contain"
                  />
                  <Image
                    source={require("../assets/images/halo.png")}
                    style={matchVideoStyles.matchHalo}
                    resizeMode="contain"
                  />
                  <Image
                    source={require("../assets/images/01.jpg")}
                    style={matchVideoStyles.matchAvatar}
                  />
                </View>
              </Animated.View>

              {/* Right Avatar with Halo and Sparkles */}
              <Animated.View
                style={[
                  matchVideoStyles.matchAvatarContainer,
                  {
                    transform: [{ translateX: rightAvatarX }],
                  },
                ]}
              >
                <View style={matchVideoStyles.matchHaloWrap}>
                  <Image
                    source={require("../assets/images/sparklings.png")}
                    style={matchVideoStyles.matchSparkles}
                    resizeMode="contain"
                  />
                  <Image
                    source={require("../assets/images/halo.png")}
                    style={matchVideoStyles.matchHalo}
                    resizeMode="contain"
                  />
                  <Image
                    source={profile?.image}
                    style={matchVideoStyles.matchAvatar}
                  />
                </View>
              </Animated.View>
            </View>
          </View>

          <View style={matchVideoStyles.buttonsBackground}>
            <View style={matchVideoStyles.matchActions}>
              <TouchableOpacity
                style={matchVideoStyles.matchPrimaryButton}
                onPress={() =>
                  navigation.navigate("Chat" as never, { profile } as never)
                }
              >
                <Text style={matchVideoStyles.matchPrimaryButtonText}>
                  Chat with {profile?.name?.split(" ")[0] || "your soulmate"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={matchVideoStyles.matchSecondaryButton}
                onPress={() =>
                  navigation.navigate(
                    "Tab" as never,
                    { screen: "Discover" } as never
                  )
                }
              >
                <Text style={matchVideoStyles.matchSecondaryButtonText}>
                  Later
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default Match;

const matchVideoStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 248, 240, 0.25)",
  },
  matchCard: {
    width: "100%",
    backgroundColor: "transparent",
    borderRadius: 0,
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowOpacity: 0,
  },
  matchTitle: {
    fontSize: 28,
    color: "#5F6F52",
    fontWeight: "600",
    fontFamily: "serif",
    textAlign: "center",
    marginBottom: 18,
  },
  matchSubtitle: {
    marginTop: 6,
    color: "#7A886C",
    fontSize: 18,
    textAlign: "center",
    fontFamily: "serif",
    marginBottom: 32,
  },
  avatarBackground: {
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 4,
    marginBottom: 24,
  },
  matchAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    height: 300,
  },
  matchAvatarContainer: {
    marginHorizontal: -20,
  },
  matchHaloWrap: {
    height: 200,
    width: 200,
    padding: 20,
    alignItems: "stretch",
    justifyContent: "center",
    position: "relative",
  },
  matchSparkles: {
    position: "absolute",
    width: 500,
    height: 400,
    top: -50,
    left: -150,
    opacity: 0.9,
    zIndex: 5,
  },
  matchHalo: {
    position: "absolute",
    width: 200,
    height: 200,
    top: -10,
    opacity: 0.8,
    zIndex: 1,
  },
  matchAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.95)",
    zIndex: 2,
  },
  buttonsBackground: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 24,
    paddingVertical: 34,
    paddingHorizontal: 24,
  },
  matchActions: {
    width: 330,
    alignItems: "center",
  },
  matchPrimaryButton: {
    backgroundColor: "#8F9F86",
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
    width: "100%",
    marginBottom: 14,
  },
  matchPrimaryButtonText: {
    color: "#FFF6EE",
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "serif",
    letterSpacing: 0.4,
  },
  matchSecondaryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 14,
    borderRadius: 26,
    alignItems: "center",
    width: "100%",
  },
  matchSecondaryButtonText: {
    color: "#5F6F52",
    fontSize: 20,
    fontWeight: "500",
    fontFamily: "serif",
  },
});
