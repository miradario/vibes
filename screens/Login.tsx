/** @format */

import React, { useRef, useState } from "react";
import {
  useGoogleLoginMutation,
  useLoginMutation,
} from "../src/auth/auth.queries";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { ResizeMode } from "expo-av";
import { useNavigation } from "@react-navigation/native";
import styles from "../assets/styles";
import VibesActionButton from "../components/VibesActionButton";
import GoogleAuthButton from "../components/GoogleAuthButton";
import VibesHeader from "../src/components/VibesHeader";
import Icon from "../components/Icon";
import LoopingVideo from "../components/LoopingVideo";
import CustomDialog from "../components/CustomDialog";
import { useI18n } from "../src/i18n";

const isUnknownUserError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();

  return (
    normalized.includes("invalid login credentials") ||
    normalized.includes("user not found") ||
    normalized.includes("user does not exist")
  );
};

const Login = () => {
  const { t } = useI18n();
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateAccountDialog, setShowCreateAccountDialog] = useState(false);
  const loginMutation = useLoginMutation();
  const googleLoginMutation = useGoogleLoginMutation();
  const loading = loginMutation.isPending;
  const googleLoading = googleLoginMutation.isPending;
  const passwordInputRef = useRef<TextInput | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t("login.missingFields"));
      return;
    }

    setError(null);

    try {
      await loginMutation.mutateAsync({ email, password });
      navigation.navigate("Tab" as never);
    } catch (e) {
      if (isUnknownUserError(e)) {
        setShowCreateAccountDialog(true);
        return;
      }

      const msg = e instanceof Error ? e.message : t("login.failed");
      setError(msg || t("login.failed"));
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);

    try {
      const session = await googleLoginMutation.mutateAsync();
      if (session?.user?.id) {
        navigation.navigate("Tab" as never);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("login.googleFailed");
      setError(msg || t("login.googleFailed"));
    }
  };

  const isDisabled = !email || !password || loading || googleLoading;
  const goToSignup = () => {
    setShowCreateAccountDialog(false);
    (navigation as any).navigate("Signup", { email: email.trim() });
  };

  return (
    <View style={styles.bg}>
      <View style={localStyles.heroWrap}>
        <LoopingVideo
          source={require("../assets/videos/challenges/login/login.mp4")}
          posterSource={require("../assets/images/challenges/login.png")}
          style={localStyles.loginIllustration}
          resizeMode={ResizeMode.CONTAIN}
        />
      </View>
      <KeyboardAvoidingView
        style={[styles.loginContainer, localStyles.loginContainer]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={24}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={localStyles.formScrollContent}
        >
          <View style={styles.loginCard}>
            <VibesHeader title={t("login.header")} subtitle="" style={localStyles.header} />
            <Text style={styles.loginTitle}>{t("login.title")}</Text>
            <Text style={styles.loginSubtitle}>{t("login.subtitle")}</Text>

            <GoogleAuthButton
              label={
                googleLoading ? t("login.googleSubmitting") : t("login.google")
              }
              onPress={handleGoogleLogin}
              disabled={loading}
              loading={googleLoading}
              style={localStyles.googleButton}
            />

            <View style={localStyles.divider}>
              <View style={localStyles.dividerLine} />
              <Text style={localStyles.dividerText}>{t("common.or")}</Text>
              <View style={localStyles.dividerLine} />
            </View>

            <View style={styles.loginField}>
              <Text style={styles.loginLabel}>{t("common.email")}</Text>
              <TextInput
                style={styles.loginInput}
                placeholder={t("login.emailPlaceholder")}
                placeholderTextColor="rgba(110,110,110,0.45)"
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                blurOnSubmit={false}
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
            </View>

            <View style={styles.loginField}>
              <Text style={styles.loginLabel}>{t("common.password")}</Text>
              <View style={localStyles.passwordField}>
                <TextInput
                  ref={passwordInputRef}
                  style={[styles.loginInput, localStyles.passwordInput]}
                  placeholder=""
                  placeholderTextColor="#6E6E6E"
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={() => void handleLogin()}
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

            {error ? (
              <View style={styles.loginErrorBox}>
                <Text style={styles.loginError}>{error}</Text>
              </View>
            ) : null}

            <View style={localStyles.actions}>
              <VibesActionButton
                label={loading ? t("login.submitting") : t("login.submit")}
                variant="start"
                onPress={handleLogin}
                disabled={isDisabled}
              />

              <VibesActionButton
                label={t("common.back")}
                variant="skip"
                onPress={() => navigation.navigate("Welcome" as never)}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <CustomDialog
        visible={showCreateAccountDialog}
        title={t("login.createAccountDialogTitle")}
        message={t("login.createAccountDialogMessage")}
        primaryLabel={t("login.createAccountDialogPrimary")}
        secondaryLabel={t("common.back")}
        onPrimaryPress={goToSignup}
        onSecondaryPress={() => setShowCreateAccountDialog(false)}
        onClose={() => setShowCreateAccountDialog(false)}
      />
    </View>
  );
};

export default Login;

const localStyles = StyleSheet.create({
  actions: {
    marginTop: 28,
  },
  divider: {
    marginTop: 18,
    marginBottom: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(43, 43, 43, 0.1)",
  },
  dividerText: {
    color: "#8C7B63",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  googleButton: {
    marginTop: 22,
  },
  header: {
    marginBottom: 14,
  },
  heroWrap: {
    width: "100%",
    height: 250,
    marginTop: 28,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  loginContainer: {
    marginTop: 12,
  },
  loginIllustration: {
    width: "100%",
    height: "100%",
  },
  formScrollContent: {
    paddingBottom: 32,
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
