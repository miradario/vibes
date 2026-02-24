/** @format */

import React, { useMemo, useState } from "react";
import {
  Image,
  LayoutChangeEvent,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";
import type { DataT } from "../types";
import styles from "../assets/styles";

type DriftNodeConfig = {
  size: number;
  velocityX: number;
  velocityY: number;
};

type DecorNodeConfig = {
  size: number;
  velocityX: number;
  velocityY: number;
  tone: "blue" | "orange";
};

type MovingNodeProps = {
  config: DriftNodeConfig;
  boundsWidth: number;
  boundsHeight: number;
  children: React.ReactNode;
  pointerEvents?: "auto" | "none";
};

type DiscoverOrbitCanvasProps = {
  users: DataT[];
  centerUser?: DataT | null;
  onCenterPress?: () => void;
  onUserPress: (user: DataT) => void;
};

const clamp = (value: number, min: number, max: number) => {
  "worklet";
  return Math.min(Math.max(value, min), max);
};

const MovingNode = ({ config, boundsWidth, boundsHeight, children, pointerEvents = "auto" }: MovingNodeProps) => {
  const x = useSharedValue(Math.random() * Math.max(boundsWidth - config.size, 1));
  const y = useSharedValue(Math.random() * Math.max(boundsHeight - config.size, 1));
  const vx = useSharedValue(config.velocityX);
  const vy = useSharedValue(config.velocityY);

  useFrameCallback((frame) => {
    const dt = Math.min((frame.timeSincePreviousFrame ?? 16) / 1000, 0.05);
    const maxX = Math.max(boundsWidth - config.size, 0);
    const maxY = Math.max(boundsHeight - config.size, 0);

    x.value += vx.value * dt;
    y.value += vy.value * dt;

    if (x.value <= 0) {
      x.value = 0;
      vx.value = Math.abs(vx.value);
    } else if (x.value >= maxX) {
      x.value = maxX;
      vx.value = -Math.abs(vx.value);
    }

    if (y.value <= 0) {
      y.value = 0;
      vy.value = Math.abs(vy.value);
    } else if (y.value >= maxY) {
      y.value = maxY;
      vy.value = -Math.abs(vy.value);
    }

    x.value = clamp(x.value, 0, maxX);
    y.value = clamp(y.value, 0, maxY);
  }, true);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
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

  const userConfigs = useMemo<DriftNodeConfig[]>(() => {
    return users.map((_, index) => {
      const size = 58 + (index % 3) * 8;
      const speed = 20 + (index % 4) * 7;
      const signX = index % 2 === 0 ? 1 : -1;
      const signY = index % 3 === 0 ? -1 : 1;
      return {
        size,
        velocityX: signX * speed,
        velocityY: signY * (speed * 0.85),
      };
    });
  }, [users]);

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
      { size: 18, velocityX: 24, velocityY: -20, tone: "orange" },
      { size: 14, velocityX: -18, velocityY: 22, tone: "blue" },
      { size: 16, velocityX: 20, velocityY: 18, tone: "orange" },
      { size: 13, velocityX: -22, velocityY: -16, tone: "blue" },
      { size: 20, velocityX: 17, velocityY: -14, tone: "orange" },
      { size: 12, velocityX: -16, velocityY: 20, tone: "blue" },
    ],
    [],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  };

  return (
    <View style={styles.discoverOrbitScreen} onLayout={handleLayout}>
      <View style={styles.discoverOrbitCanvas}>
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
              <Image source={centerUser.image} style={styles.discoverCenterProfileImage} />
            </View>
          </TouchableOpacity>
        ) : null}

        {decorativeConfigs.map((decor, index) => (
          <MovingNode
            key={`decor-${index}`}
            config={{
              size: decor.size,
              velocityX: decor.velocityX,
              velocityY: decor.velocityY,
            }}
            boundsWidth={boundsWidth}
            boundsHeight={boundsHeight}
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
          </MovingNode>
        ))}

        {users.map((user, index) => {
          const config = userConfigs[index];
          return (
            <MovingNode
              key={`drift-user-${user.id}`}
              config={config}
              boundsWidth={boundsWidth}
              boundsHeight={boundsHeight}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onUserPress(user)}
                style={[
                  styles.discoverOrbitUserTapTarget,
                  {
                    width: config.size,
                    height: config.size,
                    borderRadius: config.size / 2,
                  },
                ]}
                accessibilityLabel={`Abrir perfil de ${user.name}`}
              >
                <View style={styles.discoverOrbitUserRing}>
                  <Image source={user.image} style={styles.discoverOrbitUserImage} />
                </View>
              </TouchableOpacity>
            </MovingNode>
          );
        })}
      </View>
    </View>
  );
};

export default DiscoverOrbitCanvas;
