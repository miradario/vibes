import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AnimatedSheetModal from "./AnimatedSheetModal";
import { vibesTheme } from "../src/theme/vibesTheme";

type CustomDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  primaryLabel: string;
  onPrimaryPress: () => void;
  onClose: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
};

const CustomDialog = ({
  visible,
  title,
  message,
  primaryLabel,
  onPrimaryPress,
  onClose,
  secondaryLabel,
  onSecondaryPress,
}: CustomDialogProps) => (
  <AnimatedSheetModal
    visible={visible}
    onClose={onClose}
    closeOnBackdropPress
    sheetStyle={styles.sheet}
  >
    <View style={styles.content}>
      <View style={styles.handle} />
      <Text style={styles.title} maxFontSizeMultiplier={1}>
        {title}
      </Text>
      <Text style={styles.message}>{message}</Text>

      <TouchableOpacity
        style={styles.primaryButton}
        activeOpacity={0.82}
        onPress={onPrimaryPress}
      >
        <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
      </TouchableOpacity>

      {secondaryLabel ? (
        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.72}
          onPress={onSecondaryPress ?? onClose}
        >
          <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  </AnimatedSheetModal>
);

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  content: {
    borderRadius: 24,
    backgroundColor: "#FFFCF7",
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.32)",
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 22,
    shadowColor: vibesTheme.colors.primaryText,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(43, 43, 43, 0.14)",
    marginBottom: 18,
  },
  title: {
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.thin,
    fontSize: 22,
    lineHeight: 28,
    textAlign: "center",
  },
  message: {
    color: vibesTheme.colors.secondaryText,
    fontFamily: vibesTheme.fonts.medium,
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 10,
  },
  primaryButton: {
    marginTop: 22,
    minHeight: 56,
    borderRadius: vibesTheme.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.accentMustard,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontFamily: vibesTheme.fonts.semibold,
    fontSize: 18,
  },
  secondaryButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  secondaryButtonText: {
    color: vibesTheme.colors.secondaryText,
    fontFamily: vibesTheme.fonts.medium,
    fontSize: 16,
  },
});

export default CustomDialog;
