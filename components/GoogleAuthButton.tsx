/** @format */

import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { vibesTheme } from "../src/theme/vibesTheme";
import VibesLoader from "./VibesLoader";

type GoogleAuthButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

const GoogleAuthButton = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  style,
}: GoogleAuthButtonProps) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[styles.button, style, isDisabled && styles.disabled]}
      onPress={onPress}
      activeOpacity={0.86}
      disabled={isDisabled}
    >
      <View style={styles.iconWrap}>
        {loading ? (
          <VibesLoader size={26} />
        ) : (
          <GoogleIcon />
        )}
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const GoogleIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 48 48">
    <Path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
    />
    <Path
      fill="#FF3D00"
      d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
    />
    <Path
      fill="#4CAF50"
      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
    />
    <Path
      fill="#1976D2"
      d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
    />
  </Svg>
);

const styles = StyleSheet.create({
  button: {
    width: "100%",
    minHeight: 54,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.28)",
    backgroundColor: "rgba(255, 253, 248, 0.92)",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8C7B63",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  iconWrap: {
    position: "absolute",
    left: 18,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(246, 246, 244, 0.82)",
  },
  label: {
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.medium,
    fontSize: 16,
  },
});

export default GoogleAuthButton;
