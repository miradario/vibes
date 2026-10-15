import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedSheetModal from "../AnimatedSheetModal";
import VibesActionButton from "../VibesActionButton";
import { Text } from "../Typography";
import { useI18n } from "../../src/i18n";
import { restartStyles as s } from "./styles";

/** Confirms a restart: the copy is only for the user and the friends they invite. */
export default function RestartChallengeConfirmSheet({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <AnimatedSheetModal
      visible={visible}
      onClose={onClose}
      sheetStyle={[s.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
    >
      <View style={s.handle} />
      <Text accessibilityRole="header" style={s.sheetTitle}>
        {t("challengeRestart.confirmTitle")}
      </Text>
      <Text style={s.body}>{t("challengeRestart.confirmBody")}</Text>
      <VibesActionButton label={t("challengeRestart.confirmCta")} onPress={onConfirm} />
      <VibesActionButton variant="skip" label={t("challengeRestart.cancel")} onPress={onClose} />
    </AnimatedSheetModal>
  );
}
