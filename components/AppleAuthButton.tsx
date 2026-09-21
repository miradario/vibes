/** @format */

import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Text } from "./Typography";
import * as AppleAuthentication from "expo-apple-authentication";
import VibesLoader from "./VibesLoader";

type AppleAuthButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: AppleAuthentication.AppleAuthenticationButtonType;
};

const AppleAuthButton = ({
  onPress,
  disabled = false,
  loading = false,
  type = AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN,
}: AppleAuthButtonProps) => {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;

    void AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (mounted) setIsAvailable(available);
      })
      .catch(() => {
        if (mounted) setIsAvailable(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (Platform.OS !== "ios") return null;
  if (!isAvailable) return null;

  if (loading) {
    return (
      <View style={[styles.fallbackButton, styles.disabled]}>
        <VibesLoader size={26} />
        <Text style={styles.fallbackText}>Conectando...</Text>
      </View>
    );
  }

  return (
    <View
      style={disabled && styles.disabled}
      pointerEvents={disabled ? "none" : "auto"}
    >
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={type}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={22}
        style={styles.button}
        onPress={onPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    width: "100%",
    height: 54,
  },
  disabled: {
    opacity: 0.5,
  },
  fallbackButton: {
    width: "100%",
    minHeight: 54,
    borderRadius: 22,
    backgroundColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  fallbackText: {
    color: "#fff",
    fontSize: 16,
  },
});

export default AppleAuthButton;
