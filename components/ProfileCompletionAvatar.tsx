import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Avatar from "./Avatar";
import { vibesTheme } from "../src/theme/vibesTheme";

const SIZE = 84;
const RADIUS = 39;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ProfileCompletionAvatar({
  uri,
  percent,
  onPress,
}: {
  uri: string | null;
  percent: number | null;
  onPress: () => void;
}) {
  const progress =
    percent === null ? null : Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        progress === null
          ? "Completar perfil"
          : `Perfil completado ${progress} por ciento. Completar perfil`
      }
      activeOpacity={0.75}
      style={s.container}
    >
      <View style={s.avatar}>
        {progress !== null ? (
          <Svg
            width={SIZE}
            height={SIZE}
            style={StyleSheet.absoluteFill}
            accessible={false}
          >
            <Circle
              cx={42}
              cy={42}
              r={RADIUS}
              stroke="#E8DFCC"
              strokeWidth={4}
              fill="none"
            />
            {progress > 0 ? (
              <Circle
                cx={42}
                cy={42}
                r={RADIUS}
                stroke={vibesTheme.colors.accentMustard}
                strokeWidth={4}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                strokeDashoffset={CIRCUMFERENCE * (1 - progress / 100)}
                rotation={-90}
                origin="42, 42"
              />
            ) : null}
          </Svg>
        ) : null}
        <Avatar uri={uri} size={70} />
      </View>
      {progress !== null ? <Text style={s.percent}>{progress}%</Text> : null}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: "center",
    marginRight: 12,
    minWidth: SIZE,
    minHeight: SIZE,
  },
  avatar: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  percent: {
    color: "#796036",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    marginTop: 4,
  },
});
