/** @format */

import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "./Icon";
import { DARK_GRAY, TEXT_SECONDARY } from "../assets/styles";
import { vibesTheme } from "../src/theme/vibesTheme";

type AppHeaderProps = {
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  left?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  backButtonStyle?: StyleProp<ViewStyle>;
  titleNumberOfLines?: number;
};

const AppHeader = ({
  children,
  title,
  subtitle,
  showBack = false,
  onBack,
  right,
  left,
  style,
  contentStyle,
  titleStyle,
  subtitleStyle,
  backButtonStyle,
  titleNumberOfLines = 1,
}: AppHeaderProps) => {
  const navigation = useNavigation();
  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (navigation.canGoBack()) navigation.goBack();
  };

  const leftSlot = left ?? (
    showBack ? (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Volver"
        activeOpacity={0.84}
        onPress={handleBack}
        style={[styles.iconButton, backButtonStyle]}
      >
        <Icon name="chevron-back" size={23} color={DARK_GRAY} />
      </TouchableOpacity>
    ) : (
      <View style={styles.iconPlaceholder} />
    )
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.side}>{leftSlot}</View>
      <View style={[styles.content, contentStyle]}>
        {children ?? (
          <>
            {title ? (
              <Text
                style={[styles.title, titleStyle]}
                numberOfLines={titleNumberOfLines}
                adjustsFontSizeToFit
                maxFontSizeMultiplier={1}
              >
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text style={[styles.subtitle, subtitleStyle]} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </>
        )}
      </View>
      <View style={styles.side}>{right ?? <View style={styles.iconPlaceholder} />}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  side: {
    minWidth: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 253, 248, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  iconPlaceholder: {
    width: 42,
    height: 42,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  title: {
    color: DARK_GRAY,
    fontSize: 28,
    lineHeight: 32,
    fontFamily: vibesTheme.fonts.medium,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 2,
    color: TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: vibesTheme.fonts.medium,
    textAlign: "center",
  },
});

export default AppHeader;
