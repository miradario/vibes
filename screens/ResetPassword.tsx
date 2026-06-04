/** @format */

import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";
import styles from "../assets/styles";
import Icon from "../components/Icon";
import VibesActionButton from "../components/VibesActionButton";
import VibesHeader from "../src/components/VibesHeader";
import CustomDialog from "../components/CustomDialog";
import {
  useExchangePasswordResetCodeMutation,
  useUpdatePasswordMutation,
} from "../src/auth/auth.queries";
import { useI18n } from "../src/i18n";

const getResetCode = (params: Record<string, unknown> | undefined) => {
  const code = params?.code;
  return typeof code === "string" && code.trim() ? code.trim() : null;
};

const ResetPassword = () => {
  const { t } = useI18n();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const code = getResetCode(route.params);
  const exchangeCodeMutation = useExchangePasswordResetCodeMutation();
  const updatePasswordMutation = useUpdatePasswordMutation();
  const confirmInputRef = useRef<TextInput | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loading =
    exchangeCodeMutation.isPending || updatePasswordMutation.isPending;

  useEffect(() => {
    if (!code) {
      setError(t("resetPassword.invalidLink"));
      return;
    }

    void exchangeCodeMutation.mutateAsync(code).catch((e) => {
      const msg = e instanceof Error ? e.message : t("resetPassword.invalidLink");
      setError(msg || t("resetPassword.invalidLink"));
    });
  }, [code]);

  const finishReset = () => {
    setShowSuccessDialog(false);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Tab" as never }],
      })
    );
  };

  const handleSubmit = async () => {
    if (password.length < 6) {
      setError(t("resetPassword.passwordLength"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("resetPassword.passwordMismatch"));
      return;
    }

    setError(null);

    try {
      await updatePasswordMutation.mutateAsync({ password });
      setShowSuccessDialog(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("resetPassword.failed");
      setError(msg || t("resetPassword.failed"));
    }
  };

  return (
    <View style={styles.bg}>
      <KeyboardAvoidingView
        style={[styles.loginContainer, localStyles.container]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={24}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={localStyles.content}
        >
          <View style={styles.loginCard}>
            <VibesHeader
              title={t("resetPassword.header")}
              subtitle=""
              style={localStyles.header}
            />
            <Text style={styles.loginTitle}>{t("resetPassword.title")}</Text>
            <Text style={styles.loginSubtitle}>
              {t("resetPassword.subtitle")}
            </Text>

            <View style={styles.loginField}>
              <Text style={styles.loginLabel}>
                {t("resetPassword.newPassword")}
              </Text>
              <View style={localStyles.passwordField}>
                <TextInput
                  style={[styles.loginInput, localStyles.passwordInput]}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={() => confirmInputRef.current?.focus()}
                />
                <TouchableOpacity
                  style={localStyles.passwordToggle}
                  onPress={() => setShowPassword((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#8C7B63"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.loginField}>
              <Text style={styles.loginLabel}>
                {t("resetPassword.confirmPassword")}
              </Text>
              <TextInput
                ref={confirmInputRef}
                style={styles.loginInput}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onSubmitEditing={() => void handleSubmit()}
              />
            </View>

            {error ? (
              <View style={styles.loginErrorBox}>
                <Text style={styles.loginError}>{error}</Text>
              </View>
            ) : null}

            <View style={localStyles.actions}>
              <VibesActionButton
                label={
                  loading
                    ? t("resetPassword.submitting")
                    : t("resetPassword.submit")
                }
                variant="start"
                onPress={handleSubmit}
                disabled={!password || !confirmPassword || loading || !code}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomDialog
        visible={showSuccessDialog}
        title={t("resetPassword.successTitle")}
        message={t("resetPassword.successMessage")}
        primaryLabel={t("resetPassword.successPrimary")}
        onPrimaryPress={finishReset}
        onClose={finishReset}
      />
    </View>
  );
};

export default ResetPassword;

const localStyles = StyleSheet.create({
  actions: {
    marginTop: 28,
  },
  container: {
    marginTop: 48,
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    marginBottom: 14,
  },
  passwordField: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 48,
  },
  passwordToggle: {
    position: "absolute",
    right: 14,
    height: "100%",
    justifyContent: "center",
  },
});
