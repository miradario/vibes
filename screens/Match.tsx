/** @format */

import React, { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  Image,
  StyleSheet,
  Easing,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import styles from "../assets/styles";
import { useAuthSession } from "../src/auth/auth.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { mapOwnProfileToConnectionProfile } from "../src/lib/connectionProfiles";
import { useFindMatchQuery } from "../src/queries/matches.queries";
import ConexionReveal from "../components/ConexionReveal";
import { useWindowDimensions } from "react-native";

const Match = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { data: session } = useAuthSession();
  const { data: ownProfileData } = useProfileQuery(session?.user?.id);
  const ownProfile = useMemo(
    () =>
      mapOwnProfileToConnectionProfile(
        ownProfileData,
        session?.user?.email?.split("@")[0],
      ),
    [ownProfileData, session?.user?.email],
  );
  const profile = route?.params?.profile ?? null;
  const dimensions = useWindowDimensions();
  const { data: matchData } = useFindMatchQuery(profile?.id);

  // Avatar slide-in
  const leftAvatarX = useRef(new Animated.Value(-120)).current;
  const rightAvatarX = useRef(new Animated.Value(120)).current;

  // Background animations
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const bgScale = useRef(new Animated.Value(0.85)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Fade-in + scale the background image
    Animated.parallel([
      Animated.timing(bgOpacity, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(bgScale, {
        toValue: 1,
        speed: 4,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Glow pulse loop (soft breathing)
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.35,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // 3. Avatar slide-in (delayed slightly)
    setTimeout(() => {
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
    }, 400);
  }, [bgOpacity, bgScale, glowOpacity, leftAvatarX, rightAvatarX]);

  return (
    <View style={[styles.matchScreen, matchVideoStyles.container]}>
      {/* Full-screen hand-drawn conexion animation */}
      <Animated.View
        style={[
          matchVideoStyles.fullBg,
          { opacity: bgOpacity, transform: [{ scale: bgScale }] },
        ]}
        pointerEvents="none"
      >
        <ConexionReveal
          width={dimensions.width}
          height={dimensions.height}
          durationMs={3200}
        />
      </Animated.View>

      {/* Radial glow pulse */}
      <Animated.View
        style={[matchVideoStyles.glowCircle, { opacity: glowOpacity }]}
        pointerEvents="none"
      />
      <View style={matchVideoStyles.overlay} />

      <View style={styles.matchScreen}>
        <View style={matchVideoStyles.matchCard}>
          <Text style={matchVideoStyles.matchTitle}>
            Two energies aligned—something meaningful begins here. ✨
          </Text>

          <View style={matchVideoStyles.avatarBackground}>
            <View style={matchVideoStyles.matchAvatarRow}>
              {/* Left Avatar */}
              <Animated.View
                style={[
                  matchVideoStyles.matchAvatarContainer,
                  { transform: [{ translateX: leftAvatarX }] },
                ]}
              >
                <View style={matchVideoStyles.matchHaloWrap}>
                  <Image
                    source={require("../assets/images/halo.png")}
                    style={matchVideoStyles.matchHalo}
                    resizeMode="contain"
                  />
                  <Image
                    source={ownProfile.image}
                    style={matchVideoStyles.matchAvatar}
                  />
                  <Image
                    source={require("../assets/images/sparklings.png")}
                    style={matchVideoStyles.matchSparkles}
                    resizeMode="contain"
                    pointerEvents="none"
                  />
                </View>
              </Animated.View>

              {/* Center heart */}
              <View style={matchVideoStyles.centerHeart}>
                <Text style={matchVideoStyles.heartText}>♡</Text>
              </View>

              {/* Right Avatar */}
              <Animated.View
                style={[
                  matchVideoStyles.matchAvatarContainer,
                  { transform: [{ translateX: rightAvatarX }] },
                ]}
              >
                <View style={matchVideoStyles.matchHaloWrap}>
                  <Image
                    source={require("../assets/images/halo.png")}
                    style={matchVideoStyles.matchHalo}
                    resizeMode="contain"
                  />
                  <Image
                    source={
                      profile?.image ?? require("../assets/images/logo.png")
                    }
                    style={matchVideoStyles.matchAvatar}
                  />
                  <Image
                    source={require("../assets/images/sparklings.png")}
                    style={matchVideoStyles.matchSparkles}
                    resizeMode="contain"
                    pointerEvents="none"
                  />
                </View>
              </Animated.View>
            </View>
          </View>

          <View style={matchVideoStyles.buttonsBackground}>
            <View style={matchVideoStyles.matchActions}>
              <TouchableOpacity
                style={matchVideoStyles.matchPrimaryButton}
                disabled={!profile || !matchData}
                onPress={() => {
                  if (profile && matchData) {
                    const primaryPhoto =
                      Array.isArray(profile.images) && profile.images[0]
                        ? typeof profile.images[0] === "object" &&
                          "uri" in profile.images[0]
                          ? (profile.images[0] as { uri: string }).uri
                          : null
                        : null;
                    navigation.navigate(
                      "Chat" as never,
                      {
                        matchId: matchData.id,
                        otherUserId: String(profile.id),
                        otherUserName: profile.name,
                        otherUserPhoto: primaryPhoto,
                      } as never,
                    );
                  } else {
                    navigation.goBack();
                  }
                }}
              >
                <Text style={matchVideoStyles.matchPrimaryButtonText}>
                  {profile
                    ? `Chat with ${
                        profile?.name?.split(" ")[0] || "your soulmate"
                      }`
                    : "Back to discover"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={matchVideoStyles.matchSecondaryButton}
                onPress={() =>
                  navigation.navigate(
                    "Tab" as never,
                    { screen: "Discover" } as never,
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
    backgroundColor: "#F6F6F4",
  },
  fullBg: {
    ...StyleSheet.absoluteFillObject,
  },
  fullBgImage: {
    width: "100%",
    height: "100%",
  },
  glowCircle: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#E4B76E",
    opacity: 0.18,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(246, 246, 244, 0.15)",
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
    color: "#6E6E6E",
    fontWeight: "600",
    fontFamily: "CormorantGaramond_500Medium",
    textAlign: "center",
    marginBottom: 18,
  },
  matchSubtitle: {
    marginTop: 6,
    color: "#6E6E6E",
    fontSize: 18,
    textAlign: "center",
    fontFamily: "CormorantGaramond_500Medium",
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
    height: 220,
  },
  matchAvatarContainer: {
    marginHorizontal: 8,
  },
  matchHaloWrap: {
    height: 160,
    width: 160,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  matchSparkles: {
    position: "absolute",
    width: 220,
    height: 220,
    top: -30,
    left: -30,
    opacity: 0.7,
    zIndex: 5,
  },
  matchHalo: {
    position: "absolute",
    width: 170,
    height: 170,
    top: -5,
    left: -5,
    opacity: 0.75,
    zIndex: 1,
  },
  matchAvatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: "rgba(246, 246, 244, 0.95)",
    zIndex: 2,
  },
  centerHeart: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
    zIndex: 10,
  },
  heartText: {
    fontSize: 28,
    color: "#AEBFD1",
  },
  buttonsBackground: {
    backgroundColor: "rgba(246, 246, 244, 0.6)",
    borderRadius: 24,
    paddingVertical: 34,
    paddingHorizontal: 24,
  },
  matchActions: {
    width: 330,
    alignItems: "center",
  },
  matchPrimaryButton: {
    backgroundColor: "#AEBFD1",
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
    width: "100%",
    marginBottom: 14,
  },
  matchPrimaryButtonText: {
    color: "#F6F6F4",
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "CormorantGaramond_500Medium",
    letterSpacing: 0.4,
  },
  matchSecondaryButton: {
    backgroundColor: "rgba(246, 246, 244, 0.95)",
    paddingVertical: 14,
    borderRadius: 26,
    alignItems: "center",
    width: "100%",
  },
  matchSecondaryButtonText: {
    color: "#6E6E6E",
    fontSize: 20,
    fontWeight: "500",
    fontFamily: "CormorantGaramond_500Medium",
  },
});
