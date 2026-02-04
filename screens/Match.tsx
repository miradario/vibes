import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, ImageBackground, Animated, TouchableOpacity, Image } from "react-native";
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

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        speed: 14,
        bounciness: 8,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [fadeAnim, scaleAnim, floatAnim]);

  const floatUp = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  return (
    <ImageBackground source={require("../assets/images/match.png")} style={styles.bg}>
      <View style={styles.matchScreen}>
        <Animated.View style={[styles.matchCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.matchHeartsLayer}>
            <Animated.View style={[styles.matchHeart, styles.matchHeartLeft, { transform: [{ translateY: floatUp }] }]}>
              <Icon name="sparkles" size={22} color="#F26D6A" />
            </Animated.View>
            <Animated.View style={[styles.matchHeart, styles.matchHeartCenter, { transform: [{ translateY: floatUp }] }]}>
              <Icon name="infinite" size={30} color="#FF8A7A" />
            </Animated.View>
            <Animated.View style={[styles.matchHeart, styles.matchHeartRight, { transform: [{ translateY: floatUp }] }]}>
              <Icon name="sparkles" size={20} color="#F26D6A" />
            </Animated.View>
          </View>

          <Text style={styles.matchTitle}>It’s a Connection</Text>
          <Text style={styles.matchSubtitle}>You and {profile?.name || "this soul"} resonated.</Text>

          <View style={styles.matchAvatarRow}>
            <View style={styles.matchAvatarRing}>
              <Image source={require("../assets/images/01.jpg")} style={styles.matchAvatar} />
            </View>
            <View style={[styles.matchAvatarRing, styles.matchAvatarRingRight]}>
              <Image source={profile?.image} style={styles.matchAvatar} />
            </View>
          </View>

          <View style={styles.matchActions}>
            <TouchableOpacity
              style={styles.matchPrimaryButton}
              onPress={() => navigation.navigate("Chat" as never, { profile } as never)}
            >
              <Text style={styles.matchPrimaryButtonText}>Send a Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.matchSecondaryButton} onPress={() => navigation.goBack()}>
              <Text style={styles.matchSecondaryButtonText}>Keep Swiping</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </ImageBackground>
  );
};

export default Match;
