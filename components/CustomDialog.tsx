import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "./Typography";
import AnimatedSheetModal from "./AnimatedSheetModal";
import { vibesTheme } from "../src/theme/vibesTheme";
import { buttonContentColor, buttonLabel, buttonStyle } from "./ui/buttonStyles";
import * as ds from "../src/theme/tokens";

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
    paddingHorizontal: ds.spacing[4],
    paddingBottom: ds.spacing[4],
  },
  content: {
    borderRadius: ds.radii.xl,
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.scrim),
    paddingHorizontal: ds.spacing[6],
    paddingTop: ds.spacing[3],
    paddingBottom: ds.spacing[6],
    ...ds.shadows.md,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.colors.border.default,
    marginBottom: ds.spacing[4],
  },
  title: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.title,
    textAlign: "center",
  },
  message: {
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.subtitleMedium,
    textAlign: "center",
    marginTop: ds.spacing[3],
  },
  primaryButton: {
    ...buttonStyle("accent", "lg"),
    marginTop: ds.spacing[6],
  },
  primaryButtonText: {
    ...buttonLabel("lg", "accent"),
  },
  secondaryButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: ds.spacing[2],
  },
  secondaryButtonText: {
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.subtitleMedium,
  },
});

export default CustomDialog;
