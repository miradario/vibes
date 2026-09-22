import { stepBubbles, type BubbleBody } from "../src/lib/bubblePhysics";
/** @format */

import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "./Typography";
import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused } from "@react-navigation/native";
import Animated, {
  useReducedMotion,
  type SharedValue,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";
import type { DataT } from "../types";
import styles from "../assets/styles";
import Avatar from "./Avatar";
import { vibesTheme } from "../src/theme/vibesTheme";

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
  roaming?: boolean;
};

type OrbitNodeProps = {
  config: OrbitNodeConfig;
  centerX: number;
  centerY: number;
  children: React.ReactNode;
  pointerEvents?: "auto" | "none";
  motionActive?: boolean;
};

type DiscoverOrbitCanvasProps = {
  users: DataT[];
  dismissedUsers?: DataT[];
  centerUser?: DataT | null;
  onCenterPress?: () => void;
  onUserPress: (user: DataT) => void;
  onDismissedUserPress?: (user: DataT) => void;
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

const OrbitNode = ({
  config,
  centerX,
  centerY,
  children,
  pointerEvents = "auto",
  motionActive = true,
}: OrbitNodeProps) => {
  const angle = useSharedValue(config.angle);
  const float = useSharedValue(0);

  const frameCallback = useFrameCallback((frame) => {
    const dt = Math.min((frame.timeSincePreviousFrame ?? 16) / 1000, 0.05);
    angle.value += dt * config.speed;
    float.value += dt;
  }, false);
  useEffect(() => {
    frameCallback.setActive(motionActive);
    return () => frameCallback.setActive(false);
  }, [frameCallback, motionActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          centerX + Math.cos(angle.value) * config.radiusX - config.size / 2,
      },
      {
        translateY:
          centerY +
          Math.sin(angle.value * (config.roaming ? 1.31 : 1)) * config.radiusY -
          config.size / 2 +
          (motionActive ? Math.sin(float.value * 0.7 + config.angle) * 3 : 0),
      },
      { scale: config.scale },
    ],
  }));

  return (
    <Animated.View
      pointerEvents={pointerEvents}
      style={[styles.discoverOrbitUserBubble, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
};

function CollidingBubble({
  bodies,
  index,
  size,
  children,
}: {
  bodies: SharedValue<BubbleBody[]>;
  index: number;
  size: number;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const body = bodies.value[index];
    return {
      opacity: body ? 1 : 0,
      transform: [
        { translateX: body ? body.x + (body.width - size) / 2 : 0 },
        { translateY: body?.y ?? 0 },
      ],
    };
  });
  return (
    <Animated.View style={[styles.discoverOrbitUserBubble, style]}>
      {children}
    </Animated.View>
  );
}

const DiscoverOrbitCanvas = ({
  users,
  dismissedUsers = [],
  centerUser,
  onCenterPress,
  onUserPress,
  onDismissedUserPress,
}: DiscoverOrbitCanvasProps) => {
  const window = useWindowDimensions();
  const focused = useIsFocused();
  const reducedMotion = useReducedMotion();
  const motionActive = focused && !reducedMotion;
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const centerSpin = useSharedValue(0);

  const boundsWidth = layout.width || window.width;
  const boundsHeight = layout.height || Math.max(window.height * 0.6, 360);
  const centerX = boundsWidth / 2;
  const centerY = boundsHeight * 0.46;
  const baseRadiusX = Math.min(boundsWidth * 0.38, 165);
  const baseRadiusY = Math.min(boundsHeight * 0.28, 185);

  // Use the whole visible canvas for slow paths; retain a static layout for reduced motion.
  const columns = boundsHeight < 380 && users.length > 6 ? 4 : 3;
  const rows = Math.max(1, Math.ceil(users.length / columns));
  const cellWidth = boundsWidth / columns;
  const cellHeight = boundsHeight / rows;
  const userConfigs = useMemo<OrbitNodeConfig[]>(
    () =>
      users.map((_, index) => {
        const size = Math.max(
          48,
          Math.min(82, cellWidth - 30, cellHeight - 48)
        );
        return {
          size,
          radiusX: reducedMotion
            ? 0
            : Math.max(
                0,
                (boundsWidth - Math.max(cellWidth - 12, size)) / 2 - 12
              ),
          radiusY: reducedMotion
            ? 0
            : Math.max(0, (boundsHeight - size - 40) / 2 - 12),
          angle: index * 2.4,
          speed: (index % 2 ? -1 : 1) * (0.055 + (index % 3) * 0.008),
          scale: 1,
          roaming: true,
        };
      }),
    [users, cellWidth, cellHeight, boundsWidth, boundsHeight, reducedMotion]
  );
  const bodies = useSharedValue<BubbleBody[]>([]);
  const userKey = users.map((user) => user.id).join("|");
  useEffect(() => {
    bodies.value = users.map((_, index) => {
      const size = Math.max(48, Math.min(82, cellWidth - 30, cellHeight - 48));
      const boxHeight = size + 34;
      return {
        x: (index % columns) * cellWidth + (cellWidth - size) / 2,
        y:
          Math.floor(index / columns) * cellHeight +
          (cellHeight - boxHeight) / 2,
        width: size,
        height: size,
        vx: (index % 2 ? -1 : 1) * (6 + (index % 4)),
        vy: (index % 3 ? 1 : -1) * (5 + (index % 3) * 1.5),
      };
    });
  }, [
    userKey,
    boundsWidth,
    boundsHeight,
    columns,
    cellWidth,
    cellHeight,
    bodies,
  ]);
  const physicsFrame = useFrameCallback((frame) => {
    bodies.value = stepBubbles(
      bodies.value,
      boundsWidth,
      Math.max(0, boundsHeight - 34),
      (frame.timeSincePreviousFrame ?? 16) / 1000
    );
  }, false);
  useEffect(() => {
    physicsFrame.setActive(motionActive);
    return () => physicsFrame.setActive(false);
  }, [physicsFrame, motionActive]);
  const dismissedConfigs = useMemo<OrbitNodeConfig[]>(() => {
    return dismissedUsers.map((_, index) => {
      const size = 24 + (index % 2) * 4;
      const layer = index % 3;
      return {
        size,
        radiusX: baseRadiusX * (0.48 + layer * 0.2),
        radiusY: baseRadiusY * (0.5 + layer * 0.14),
        angle: (index / Math.max(dismissedUsers.length, 1)) * Math.PI * 2 + 0.7,
        speed: (index % 2 === 0 ? -0.11 : 0.1) * (1 + layer * 0.06),
        scale: 1,
      };
    });
  }, [baseRadiusX, baseRadiusY, dismissedUsers]);

  useFrameCallback((frame) => {
    const dt = Math.min((frame.timeSincePreviousFrame ?? 16) / 1000, 0.05);
    if (motionActive && centerUser) centerSpin.value += dt * 40;
  }, true);

  const centerRingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${centerSpin.value}deg` }],
  }));

  const centerRingReverseStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-centerSpin.value * 0.72}deg` }],
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  };

  return (
    <View style={styles.discoverOrbitScreen} onLayout={handleLayout}>
      <LinearGradient
        pointerEvents="none"
        colors={["#FFFDF8", "#F7F3EF", "#FEFEFD"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ flex: 1, overflow: "hidden" }}>
        <View pointerEvents="none" style={localStyles.ambientGlowMustard} />
        <View pointerEvents="none" style={localStyles.ambientGlowBlue} />
        <View pointerEvents="none" style={localStyles.sparkleOne} />
        <View pointerEvents="none" style={localStyles.sparkleTwo} />

        {centerUser ? (
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.discoverCenterProfileWrap, { top: 0 }]}
            onPress={onCenterPress}
            accessibilityLabel="Ir a Aura"
          >
            <Animated.View
              style={[styles.discoverCenterProfileRing, centerRingStyle]}
            />
            <Animated.View
              style={[
                styles.discoverCenterProfileRingInner,
                centerRingReverseStyle,
              ]}
            />
            <View style={styles.discoverCenterProfileImageWrap}>
              <LinearGradient
                pointerEvents="none"
                colors={[
                  "rgba(255,255,255,0.92)",
                  "rgba(228,183,110,0.18)",
                  "rgba(174,191,209,0.2)",
                ]}
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

        {dismissedUsers.map((user, index) => {
          const config = dismissedConfigs[index];
          return (
            <OrbitNode
              key={`dismissed-user-${user.id}`}
              motionActive={motionActive}
              config={config}
              centerX={centerX}
              centerY={centerY}
            >
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => (onDismissedUserPress ?? onUserPress)(user)}
                style={[
                  localStyles.dismissedDot,
                  {
                    width: config.size,
                    height: config.size,
                    borderRadius: config.size / 2,
                  },
                ]}
                accessibilityLabel={`Abrir perfil descartado de ${user.name}`}
              >
                <Avatar
                  uri={getAvatarUri(user)}
                  size={Math.max(config.size - 4, 16)}
                  style={localStyles.dismissedAvatar}
                />
              </TouchableOpacity>
            </OrbitNode>
          );
        })}

        {users.map((user, index) => {
          const config = userConfigs[index];
          const userPresenceLabel = buildOrbitUserLabel(user);
          return (
            <CollidingBubble
              key={`drift-user-${user.id}`}
              bodies={bodies}
              index={index}
              size={config.size}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onUserPress(user)}
                style={[localStyles.userBubbleTouch, { width: config.size }]}
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
                  <View style={styles.discoverOrbitUserRing}>
                    <LinearGradient
                      pointerEvents="none"
                      colors={[
                        "rgba(255,255,255,0.96)",
                        "rgba(228,183,110,0.2)",
                        "rgba(174,191,209,0.24)",
                      ]}
                      style={StyleSheet.absoluteFill}
                    />
                    <Avatar
                      uri={getAvatarUri(user)}
                      size={Math.max(config.size - 10, 18)}
                      style={styles.discoverOrbitUserImage}
                    />
                    <View style={localStyles.userBubbleHighlight} />
                  </View>
                </View>
                {userPresenceLabel ? (
                  <View
                    style={[
                      localStyles.distancePill,
                      { width: cellWidth - 12 },
                    ]}
                  >
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
            </CollidingBubble>
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
  dismissedDot: {
    overflow: "hidden" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(255, 253, 248, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.55)",
    shadowColor: "#D88C7A",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  dismissedAvatar: {
    opacity: 0.82,
  },
  userBubbleGlow: {
    position: "absolute" as const,
    width: "118%" as const,
    height: "118%" as const,
    borderRadius: 999,
    backgroundColor: "rgba(228, 183, 110, 0.12)",
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
    fontFamily: vibesTheme.fonts.bold,
    letterSpacing: 0,
    textAlign: "center" as const,
  },
};
