import React, { useRef } from "react";
import { Alert, Keyboard, StyleSheet, TouchableOpacity } from "react-native";
import { CommonActions, useNavigation } from "@react-navigation/native";
import Icon from "./Icon";
import { useLogoutMutation } from "../src/auth/auth.queries";
import { useOnboardingDraft } from "../src/queries/onboarding.queries";
import { vibesTheme } from "../src/theme/vibesTheme";

export default function CancelOnboardingButton({ disabled = false, onCancel }: { disabled?: boolean; onCancel?: () => void }) {
  const navigation = useNavigation();
  const logout = useLogoutMutation();
  const { resetDraft } = useOnboardingDraft();
  const busy = useRef(false);
  const cancel = async () => {
    if (busy.current || disabled) return;
    busy.current = true;
    Keyboard.dismiss();
    try {
      if (onCancel) { onCancel(); return; }
      await logout.mutateAsync();
      resetDraft();
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Welcome" }] }));
    } catch {
      Alert.alert("No pudimos salir", "Intentá nuevamente. Tus datos no se borraron.");
    } finally {
      busy.current = false;
    }
  };
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cancelar onboarding" disabled={disabled || logout.isPending} onPress={() => void cancel()} style={styles.button}>
    <Icon name="close" size={24} color={vibesTheme.colors.accentMustard} />
  </TouchableOpacity>;
}
const styles = StyleSheet.create({ button: { width: 56, height: 56, padding: 16, alignItems: "center", justifyContent: "center" } });
