/** @format */

import React, { useMemo } from "react";
import { Image, TouchableOpacity, View, useWindowDimensions } from "react-native";
import Animated, {
  type SharedValue,
  useFrameCallback,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import type { DataT } from "../types";
import styles from "../assets/styles";

type OrbitNodeConfig = {
  radius: number;
  phase: number;
  speed: number;
  size: number;
  bob: number;
};

type OrbitDecorConfig = {
  radius: number;
  phase: number;
  speed: number;
  size: number;
  bob: number;
  tone: "blue" | "orange";
};

type OrbitNodeProps = {
  user: DataT;
  orbit: OrbitNodeConfig;
  centerX: number;
  centerY: number;
  progress: SharedValue<number>;
  onPress: (user: DataT) => void;
};

type OrbitDecorProps = {
  decor: OrbitDecorConfig;
  centerX: number;
  centerY: number;
  progress: SharedValue<number>;
};

type DiscoverOrbitCanvasProps = {
  users: DataT[];
  onUserPress: (user: DataT) => void;
};

const TWO_PI = Math.PI * 2;

const OrbitUserNode = ({ user, orbit, centerX, centerY, progress, onPress }: OrbitNodeProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    const angle = orbit.phase + progress.value * orbit.speed;
    const x = centerX + Math.cos(angle) * orbit.radius;
    const y = centerY + Math.sin(angle) * orbit.radius + Math.sin(angle * 2.2) * orbit.bob;
    const depth = 0.92 + ((Math.sin(angle) + 1) / 2) * 0.2;

    return {
      transform: [
        { translateX: x - orbit.size / 2 },
        { translateY: y - orbit.size / 2 },
        { scale: depth },
      ],
      opacity: 0.68 + ((Math.sin(angle + 0.8) + 1) / 2) * 0.32,
      zIndex: Math.round(depth * 100),
    };
  }, [centerX, centerY, orbit.bob, orbit.phase, orbit.radius, orbit.size, orbit.speed]);

  return (
    <Animated.View style={[styles.discoverOrbitUserBubble, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onPress(user)}
        style={[styles.discoverOrbitUserTapTarget, { width: orbit.size, height: orbit.size, borderRadius: orbit.size / 2 }]}
        accessibilityLabel={`Abrir perfil de ${user.name}`}
      >
        <View style={styles.discoverOrbitUserRing}>
          <Image source={user.image} style={styles.discoverOrbitUserImage} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const OrbitDecorNode = ({ decor, centerX, centerY, progress }: OrbitDecorProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    const angle = decor.phase + progress.value * decor.speed;
    const x = centerX + Math.cos(angle) * decor.radius;
    const y = centerY + Math.sin(angle) * decor.radius + Math.sin(angle * 1.8) * decor.bob;

    return {
      transform: [
        { translateX: x - decor.size / 2 },
        { translateY: y - decor.size / 2 },
        { scale: 0.94 + ((Math.sin(angle * 1.3) + 1) / 2) * 0.18 },
      ],
      opacity: 0.22 + ((Math.sin(angle) + 1) / 2) * 0.3,
    };
  }, [centerX, centerY, decor.bob, decor.phase, decor.radius, decor.size, decor.speed]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        decor.tone === "blue"
          ? styles.discoverOrbitDecorativeDotBlue
          : styles.discoverOrbitDecorativeDotOrange,
        { width: decor.size, height: decor.size, borderRadius: decor.size / 2 },
        animatedStyle,
      ]}
    />
  );
};

const DiscoverOrbitCanvas = ({ users, onUserPress }: DiscoverOrbitCanvasProps) => {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);

  useFrameCallback((frame) => {
    const deltaMs = frame.timeSincePreviousFrame ?? 16;
    progress.value += (deltaMs / 1000) * 0.6;
  }, true);

  const centerX = width / 2;
  const centerY = height * 0.42;

  const userOrbits = useMemo(() => {
    const count = users.length || 1;
    const minRadius = Math.min(width * 0.3, 138);
    const maxRadius = Math.min(width * 0.42, 188);

    return users.map((_, index) => {
      const ratio = count > 1 ? index / (count - 1) : 0.5;
      const baseRadius = minRadius + (maxRadius - minRadius) * ratio;
      const radiusJitter = (index % 3 - 1) * 10;
      const phase = (index / count) * TWO_PI;

      return {
        radius: baseRadius + radiusJitter,
        phase,
        speed: 0.66 + (index % 4) * 0.07,
        size: 58 + (index % 3) * 8,
        bob: 6 + (index % 3) * 2,
      };
    });
  }, [users, width]);

  const decorativeOrbits = useMemo<OrbitDecorConfig[]>(
    () => [
      { radius: Math.min(width * 0.2, 88), phase: 0.9, speed: 1.2, size: 18, bob: 4, tone: "orange" },
      { radius: Math.min(width * 0.34, 152), phase: 2.4, speed: 0.92, size: 14, bob: 6, tone: "blue" },
      { radius: Math.min(width * 0.26, 118), phase: 3.8, speed: 1.08, size: 16, bob: 5, tone: "orange" },
      { radius: Math.min(width * 0.39, 174), phase: 5.1, speed: 0.86, size: 13, bob: 6, tone: "blue" },
      { radius: Math.min(width * 0.45, 198), phase: 1.7, speed: 0.79, size: 20, bob: 7, tone: "orange" },
      { radius: Math.min(width * 0.31, 140), phase: 4.6, speed: 1.04, size: 12, bob: 5, tone: "blue" },
    ],
    [width],
  );

  return (
    <View style={styles.discoverOrbitScreen}>
      <View style={styles.discoverOrbitCanvas}>
        <View style={styles.discoverOrbitCenter} />

        {decorativeOrbits.map((decor, index) => (
          <OrbitDecorNode
            key={`decor-${index}`}
            decor={decor}
            centerX={centerX}
            centerY={centerY}
            progress={progress}
          />
        ))}

        {users.map((user, index) => (
          <OrbitUserNode
            key={`orbit-user-${user.id}`}
            user={user}
            orbit={userOrbits[index]}
            centerX={centerX}
            centerY={centerY}
            progress={progress}
            onPress={onUserPress}
          />
        ))}
      </View>
    </View>
  );
};

export default DiscoverOrbitCanvas;
