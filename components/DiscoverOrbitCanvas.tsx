/** @format */

import React, { useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";
import type { DataT } from "../types";
import styles from "../assets/styles";
import Avatar from "./Avatar";

const getImageUri = (value: unknown): string | null => {
  if (!value || typeof value !== "object" || !("uri" in value)) {
    return null;
  }

  const uri = (value as { uri?: unknown }).uri;
  return typeof uri === "string" && uri.trim() ? uri.trim() : null;
};

const getAvatarUri = (user?: DataT | null): string | null => {
  if (!user) return null;
  if (typeof user.avatarUri === "string" && user.avatarUri.trim()) {
    return user.avatarUri.trim();
  }
  return getImageUri(user.image);
};

type OrbitNodeConfig = {
  size: number;
  radiusX: number;
  radiusY: number;
  angle: number;
  speed: number;
  scale: number;
};

type DecorNodeConfig = {
  size: number;
  radiusX: number;
  radiusY: number;
  angle: number;
  speed: number;
  tone: "blue" | "orange";
};

type OrbitNodeProps = {
  config: OrbitNodeConfig;
  centerX: number;
  centerY: number;
  children: React.ReactNode;
  pointerEvents?: "auto" | "none";
};

type DiscoverOrbitCanvasProps = {
  users: DataT[];
  centerUser?: DataT | null;
  onCenterPress?: () => void;
  onUserPress: (user: DataT) => void;
};

const buildOrbitUserLabel = (user: DataT) => {
  const name = typeof user.name === "string" ? user.name.trim() : "";
  const age = typeof user.age === "string" ? user.age.trim() : "";
  const distanceFromLabel =
    typeof user.distanceLabel === "string" ? user.distanceLabel.trim() : "";
  const distanceFromLocation =
    typeof user.location === "string"
      ? user.location.match(/(\d+\s?km)/i)?.[1] ?? ""
      : "";
  const distance = distanceFromLabel || distanceFromLocation;

  const nameAndAge = [name, age ? `${age} años` : ""]
    .filter(Boolean)
    .join(", ");

  return [nameAndAge, distance].filter(Boolean).join(" · ");
};

const getMatchScore = (user: DataT, index: number) => {
  const parsed = String(user.match ?? "").match(/\d+/)?.[0];
  if (parsed) return `${Math.min(Number(parsed), 99)}%`;
  return `${88 + (index % 7)}%`;
};

const OrbitNode = ({ config, centerX, centerY, children, pointerEvents = "auto" }: OrbitNodeProps) => {
  const angle = useSharedValue(config.angle);
  const float = useSharedValue(0);

  useFrameCallback((frame) => {
    const dt = Math.min((frame.timeSincePreviousFrame ?? 16) / 1000, 0.05);
    angle.value += dt * config.speed;
    float.value += dt;
  }, true);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          centerX +
          Math.cos(angle.value) * config.radiusX -
          config.size / 2,
      },
      {
        translateY:
          centerY +
          Math.sin(angle.value) * config.radiusY -
          config.size / 2 +
          Math.sin(float.value * 1.4 + config.angle) * 5,
      },
      { scale: config.scale },
    ],
  }));

  return (
    <Animated.View pointerEvents={pointerEvents} style={[styles.discoverOrbitUserBubble, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

const DiscoverOrbitCanvas = ({
  users,
  centerUser,
  onCenterPress,
  onUserPress,
}: DiscoverOrbitCanvasProps) => {
  const window = useWindowDimensions();
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const centerSpin = useSharedValue(0);

  const boundsWidth = layout.width || window.width;
  const boundsHeight = layout.height || Math.max(window.height * 0.6, 360);
  const centerX = boundsWidth / 2;
  const centerY = boundsHeight * 0.46;
  const baseRadiusX = Math.min(boundsWidth * 0.38, 165);
  const baseRadiusY = Math.min(boundsHeight * 0.28, 185);

  const userConfigs = useMemo<OrbitNodeConfig[]>(() => {
    return users.map((_, index) => {
      const size = 70 + (index % 3) * 11;
      const layer = index % 3;
      return {
        size,
        radiusX: baseRadiusX * (0.72 + layer * 0.18),
        radiusY: baseRadiusY * (0.68 + layer * 0.13),
        angle: (index / Math.max(users.length, 1)) * Math.PI * 2 + layer * 0.4,
        speed: (index % 2 === 0 ? 0.16 : -0.13) * (1 + layer * 0.08),
        scale: 0.88 + layer * 0.07,
      };
    });
  }, [baseRadiusX, baseRadiusY, users]);

  useFrameCallback((frame) => {
    const dt = Math.min((frame.timeSincePreviousFrame ?? 16) / 1000, 0.05);
    centerSpin.value += dt * 40;
  }, true);

  const centerRingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${centerSpin.value}deg` }],
  }));

  const centerRingReverseStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-centerSpin.value * 0.72}deg` }],
  }));

  const decorativeConfigs = useMemo<DecorNodeConfig[]>(
    () => [
      { size: 18, radiusX: baseRadiusX * 0.68, radiusY: baseRadiusY * 0.58, angle: 0.8, speed: 0.24, tone: "orange" },
      { size: 14, radiusX: baseRadiusX * 0.8, radiusY: baseRadiusY * 0.68, angle: 1.8, speed: -0.22, tone: "blue" },
      { size: 16, radiusX: baseRadiusX * 1.03, radiusY: baseRadiusY * 0.92, angle: 2.7, speed: 0.18, tone: "orange" },
      { size: 13, radiusX: baseRadiusX * 0.55, radiusY: baseRadiusY * 0.48, angle: 3.8, speed: -0.2, tone: "blue" },
      { size: 20, radiusX: baseRadiusX * 1.12, radiusY: baseRadiusY * 1.04, angle: 5.1, speed: 0.14, tone: "orange" },
      { size: 12, radiusX: baseRadiusX * 0.94, radiusY: baseRadiusY * 0.82, angle: 6.0, speed: -0.18, tone: "blue" },
    ],
    [baseRadiusX, baseRadiusY],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  };

  return (
    <View style={styles.discoverOrbitScreen} onLayout={handleLayout}>
      <LinearGradient
        pointerEvents="none"
        colors={["#FFFDF8", "#F7F3EF", "#F6F6F4"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.discoverOrbitCanvas}>
        <View pointerEvents="none" style={localStyles.ambientGlowMustard} />
        <View pointerEvents="none" style={localStyles.ambientGlowBlue} />
        <View pointerEvents="none" style={localStyles.sparkleOne} />
        <View pointerEvents="none" style={localStyles.sparkleTwo} />
        <View style={styles.discoverOrbitCenter} />
        {centerUser ? (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.discoverCenterProfileWrap}
            onPress={onCenterPress}
            accessibilityLabel="Ir a Aura"
          >
            <Animated.View style={[styles.discoverCenterProfileRing, centerRingStyle]} />
            <Animated.View
              style={[styles.discoverCenterProfileRingInner, centerRingReverseStyle]}
            />
            <View style={styles.discoverCenterProfileImageWrap}>
              <LinearGradient
                pointerEvents="none"
                colors={["rgba(255,255,255,0.92)", "rgba(228,183,110,0.18)", "rgba(174,191,209,0.2)"]}
                style={StyleSheet.absoluteFill}
              />
              <Avatar
                uri={getAvatarUri(centerUser)}
                size={114}
                style={styles.discoverCenterProfileImage}
              />
            </View>
          </TouchableOpacity>
        ) : null}

        {decorativeConfigs.map((decor, index) => (
          <OrbitNode
            key={`decor-${index}`}
            config={{
              size: decor.size,
              radiusX: decor.radiusX,
              radiusY: decor.radiusY,
              angle: decor.angle,
              speed: decor.speed,
              scale: 1,
            }}
            centerX={centerX}
            centerY={centerY}
            pointerEvents="none"
          >
            <View
              style={[
                decor.tone === "blue"
                  ? styles.discoverOrbitDecorativeDotBlue
                  : styles.discoverOrbitDecorativeDotOrange,
                {
                  width: decor.size,
                  height: decor.size,
                  borderRadius: decor.size / 2,
                },
              ]}
            />
          </OrbitNode>
        ))}

        {users.map((user, index) => {
          const config = userConfigs[index];
          const userPresenceLabel = buildOrbitUserLabel(user);
          return (
            <OrbitNode
              key={`drift-user-${user.id}`}
              config={config}
              centerX={centerX}
              centerY={centerY}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onUserPress(user)}
                style={localStyles.userBubbleTouch}
                accessibilityLabel={`Abrir perfil de ${user.name}`}
              >
                <View
                  style={[
                    styles.discoverOrbitUserTapTarget,
                    {
                      width: config.size,
                      height: config.size,
                      borderRadius: config.size / 2,
                    },
                  ]}
                >
                  <View style={localStyles.userBubbleGlow} />
                  <View style={localStyles.userBubbleShadow} />
                  <View style={styles.discoverOrbitUserRing}>
                    <LinearGradient
                      pointerEvents="none"
                      colors={["rgba(255,255,255,0.96)", "rgba(228,183,110,0.2)", "rgba(174,191,209,0.24)"]}
                      style={StyleSheet.absoluteFill}
                    />
                    <Avatar
                      uri={getAvatarUri(user)}
                      size={Math.max(config.size - 10, 18)}
                      style={styles.discoverOrbitUserImage}
                    />
                    <View style={localStyles.userBubbleHighlight} />
                  </View>
                  <View style={localStyles.matchBadge}>
                    <Text style={localStyles.matchBadgeText}>{getMatchScore(user, index)}</Text>
                  </View>
                </View>
                {userPresenceLabel ? (
                  <View style={localStyles.distancePill}>
                    <Text
                      style={localStyles.distancePillText}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {userPresenceLabel}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </OrbitNode>
          );
        })}
      </View>
    </View>
  );
};

export default DiscoverOrbitCanvas;

const localStyles = {
  userBubbleTouch: {
    alignItems: "center" as const,
  },
  ambientGlowMustard: {
    position: "absolute" as const,
    right: -52,
    top: 34,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "rgba(228, 183, 110, 0.18)",
  },
  ambientGlowBlue: {
    position: "absolute" as const,
    left: -64,
    bottom: 72,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "rgba(174, 191, 209, 0.2)",
  },
  sparkleOne: {
    position: "absolute" as const,
    left: "22%" as const,
    top: "24%" as const,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    shadowColor: "#E4B76E",
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  sparkleTwo: {
    position: "absolute" as const,
    right: "20%" as const,
    bottom: "27%" as const,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
    shadowColor: "#AEBFD1",
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  userBubbleGlow: {
    position: "absolute" as const,
    width: "118%" as const,
    height: "118%" as const,
    borderRadius: 999,
    backgroundColor: "rgba(228, 183, 110, 0.12)",
  },
  userBubbleShadow: {
    position: "absolute" as const,
    bottom: -8,
    width: "72%" as const,
    height: 14,
    borderRadius: 999,
    backgroundColor: "rgba(43, 43, 43, 0.13)",
    transform: [{ scaleX: 1.18 }],
  },
  userBubbleHighlight: {
    position: "absolute" as const,
    left: 6,
    top: 5,
    width: "52%" as const,
    height: "22%" as const,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    transform: [{ rotate: "-18deg" }],
  },
  matchBadge: {
    position: "absolute" as const,
    right: -5,
    bottom: 6,
    minWidth: 42,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#D88C7A",
    borderWidth: 2,
    borderColor: "rgba(255, 253, 248, 0.96)",
    shadowColor: "#D88C7A",
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  matchBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "CormorantGaramond_700Bold",
  },
  distancePill: {
    marginTop: 6,
    maxWidth: 158,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255, 253, 248, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.24)",
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  distancePillText: {
    color: "#2B2B2B",
    fontSize: 11,
    fontFamily: "CormorantGaramond_700Bold",
    letterSpacing: 0,
    textAlign: "center" as const,
  },
};
