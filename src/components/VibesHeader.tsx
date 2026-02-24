/** @format */

import React from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { vibesTheme } from "../theme/vibesTheme";

export type VibesHeaderProps = {
  title?: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  align?: "center" | "left";
};

const VibesHeader = ({
  title = "Vibes",
  subtitle = "A calm space to begin",
  style,
  titleStyle,
  subtitleStyle,
  align = "center",
}: VibesHeaderProps) => {
  const isCenter = align === "center";

  return (
    <View style={[styles.container, isCenter ? styles.center : styles.left, style]}>
      <Text style={[styles.title, !isCenter && styles.leftText, titleStyle]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, !isCenter && styles.leftText, subtitleStyle]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  center: {
    alignItems: "center",
  },
  left: {
    alignItems: "flex-start",
  },
  leftText: {
    textAlign: "left",
  },
  title: {
    marginTop: 18,
    fontSize: 42,
    color: vibesTheme.colors.primaryText,
    fontFamily: "CormorantGaramond_500Medium",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    color: vibesTheme.colors.secondaryText,
    fontSize: 15,
    fontFamily: "CormorantGaramond_500Medium",
    textAlign: "center",
  },
});

export default VibesHeader;
