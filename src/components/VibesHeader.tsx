/** @format */

import React from "react";
import {
  StyleSheet,
  View,
  type TextProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Text } from "../../components/Typography";
import VibesWordmark from "../../components/VibesWordmark";
import { vibesTheme } from "../theme/vibesTheme";
import * as ds from "../theme/tokens";

export type VibesHeaderProps = {
  title?: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  titleNumberOfLines?: TextProps["numberOfLines"];
  titleAdjustsFontSizeToFit?: TextProps["adjustsFontSizeToFit"];
  align?: "center" | "left";
};

const VibesHeader = ({
  title = "Vibes",
  subtitle = "A calm space to begin",
  style,
  titleStyle,
  subtitleStyle,
  titleNumberOfLines,
  titleAdjustsFontSizeToFit = false,
  align = "center",
}: VibesHeaderProps) => {
  const isCenter = align === "center";

  return (
    <View
      style={[styles.container, isCenter ? styles.center : styles.left, style]}
    >
      {title === "Vibes" ? (
        <VibesWordmark fontSize={StyleSheet.flatten(titleStyle)?.fontSize ?? 54} style={{ marginTop: ds.spacing[6] }} />
      ) : (
      <Text
        style={[styles.title, !isCenter && styles.leftText, titleStyle]}
        numberOfLines={titleNumberOfLines}
        adjustsFontSizeToFit={titleAdjustsFontSizeToFit}
        maxFontSizeMultiplier={1}
      >
        {title}
      </Text>
      )}
      {subtitle ? (
        <Text
          style={[styles.subtitle, !isCenter && styles.leftText, subtitleStyle]}
        >
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
    marginTop: ds.spacing[6],
    fontSize: /* ds-lint-allow DS-TODO: fontSize 54 (peso 400) sin mapeo claro en §3.5.1 */ 54,
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.regular,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  subtitle: {
    marginTop: ds.spacing[2],
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.heading,
    textAlign: "center",
  },
});

export default VibesHeader;
