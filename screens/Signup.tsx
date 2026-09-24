import { vibesTheme } from "../src/theme/vibesTheme";
/** @format */

import React, { useRef, useState } from "react";
import {
  useAppleLoginMutation,
  useGoogleLoginMutation,
  useSignupMutation,
} from "../src/auth/auth.queries";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Text, TextInput } from "../components/Typography";
import { isValidEmail, isValidPassword } from "../src/auth/passwordPolicy";
import {
  CommonActions,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "../assets/styles";
import VibesHeader from "../src/components/VibesHeader";
import VibesActionButton from "../components/VibesActionButton";
import GoogleAuthButton from "../components/GoogleAuthButton";
import AppleAuthButton from "../components/AppleAuthButton";
import Icon from "../components/Icon";
import { useI18n } from "../src/i18n";
import * as AppleAuthentication from "expo-apple-authentication";
import { useOnboardingDraft } from "../src/queries/onboarding.queries";
import {
  calculateAge,
  formatBirthDate,
  parseBirthDate,
} from "../src/lib/birthDate";

const Signup = () => {
  const { t } = useI18n();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { draft, updateDraft } = useOnboardingDraft();
  const confirmedBirthDateParam =
    typeof (route.params as { birthDate?: unknown } | undefined)?.birthDate ===
    "string"
      ? (route.params as { birthDate?: string }).birthDate ?? ""
      : "";
  const initialEmail =
    typeof (route.params as { email?: unknown } | undefined)?.email === "string"
      ? (route.params as { email?: string }).email ?? ""
      : "";
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signupMutation = useSignupMutation();
  const googleLoginMutation = useGoogleLoginMutation();
  const appleLoginMutation = useAppleLoginMutation();
  const loading = signupMutation.isPending;
  const googleLoading = googleLoginMutation.isPending;
  const appleLoading = appleLoginMutation.isPending;
  const passwordInputRef = useRef<TextInput | null>(null);
  const confirmedBirthDate =
    parseBirthDate(confirmedBirthDateParam) ?? parseBirthDate(draft.birthDate);
  const hasConfirmedAdultAge = confirmedBirthDate
    ? calculateAge(confirmedBirthDate) >= 18
    : false;

  React.useEffect(() => {
    if (Platform.OS !== "ios") return;
    let mounted = true;

    void AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (mounted) setIsAppleAuthAvailable(available);
      })
      .catch(() => {
        if (mounted) setIsAppleAuthAvailable(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!hasConfirmedAdultAge) {
      navigation.navigate("AgeAssurance" as never);
    }
  }, [hasConfirmedAdultAge, navigation]);

  React.useEffect(() => {
    if (
      confirmedBirthDateParam &&
      confirmedBirthDateParam !== draft.birthDate
    ) {
      updateDraft({ birthDate: confirmedBirthDateParam });
    }
  }, [confirmedBirthDateParam, draft.birthDate, updateDraft]);

  const handleSignup = async () => {
    if (!acceptedTerms) {
      setError(t("authTerms.required"));
      return;
    }

    if (!email || !password.trim()) {
      setError(t("signup.missingFields"));
      return;
    }

    if (!isValidEmail(email)) {
      setError(t("signup.invalidEmail"));
      return;
    }

    if (!isValidPassword(password)) {
      setError(t("signup.passwordLength"));
      return;
    }

    setError(null);

    try {
      const authResult = await signupMutation.mutateAsync({
        email: email.trim().toLowerCase(),
        password,
      });
      if (confirmedBirthDate) {
        updateDraft({ birthDate: formatBirthDate(confirmedBirthDate) });
      }
      if (!authResult.session?.user?.id) {
        setError(
          "La cuenta se creó, pero falta iniciar sesión. Revisá tu email o intentá ingresar."
        );
        return;
      }
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "VibesOnboardingFlow" as never }],
        })
      );
    } catch (e) {
      const rawMessage = e instanceof Error ? e.message : "";
      const normalizedMessage = rawMessage.toLowerCase();
      const msg =
        normalizedMessage.includes("already registered") ||
        normalizedMessage.includes("already exists") ||
        normalizedMessage.includes("user already")
          ? t("signup.accountExists")
          : rawMessage || t("signup.failed");
      setError(msg || t("signup.failed"));
    }
  };

  const handleGoogleSignup = async () => {
    if (!acceptedTerms) {
      setError(t("authTerms.required"));
      return;
    }

    setError(null);

    try {
      const session = await googleLoginMutation.mutateAsync();
      if (session?.user?.id) {
        if (confirmedBirthDate) {
          updateDraft({ birthDate: formatBirthDate(confirmedBirthDate) });
        }
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "VibesOnboardingFlow" as never }],
          })
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("signup.googleFailed");
      setError(msg || t("signup.googleFailed"));
    }
  };

  const handleAppleSignup = async () => {
    if (!acceptedTerms) {
      setError(t("authTerms.required"));
      return;
    }

    setError(null);

    try {
      const session = await appleLoginMutation.mutateAsync();
      if (session?.user?.id) {
        if (confirmedBirthDate) {
          updateDraft({ birthDate: formatBirthDate(confirmedBirthDate) });
        }
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "VibesOnboardingFlow" as never }],
          })
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("signup.appleFailed");
      setError(msg || t("signup.appleFailed"));
    }
  };

  return (
    <View style={[styles.bg, { paddingTop: insets.top }]}>
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
          <View style={[styles.loginCard, localStyles.loginCard]}>
            <VibesHeader
              title={t("signup.header")}
              subtitle=""
              style={localStyles.header}
            />

            <GoogleAuthButton
              label={
                googleLoading
                  ? t("signup.googleSubmitting")
                  : t("signup.google")
              }
              onPress={handleGoogleSignup}
              disabled={loading || appleLoading || !acceptedTerms}
              loading={googleLoading}
              style={localStyles.googleButton}
            />

            {isAppleAuthAvailable ? (
              <View style={localStyles.appleButton}>
                <AppleAuthButton
                  type={
                    AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                  }
                  onPress={handleAppleSignup}
                  disabled={loading || googleLoading || !acceptedTerms}
                  loading={appleLoading}
                />
              </View>
            ) : null}

            <View style={localStyles.divider}>
              <View style={localStyles.dividerLine} />
              <Text style={localStyles.dividerText}>{t("common.or")}</Text>
              <View style={localStyles.dividerLine} />
            </View>

            <View style={styles.loginField}>
              <Text style={styles.loginLabel}>{t("common.email")}</Text>
              <TextInput
                style={styles.loginInput}
                placeholder={t("signup.emailPlaceholder")}
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
                  onSubmitEditing={() => void handleSignup()}
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

            <Text style={[localStyles.termsText, { flex: 0, marginTop: 8 }]}>
              {t("signup.passwordLength")}
            </Text>

            <TouchableOpacity
              activeOpacity={0.78}
              style={localStyles.termsRow}
              onPress={() => setAcceptedTerms((value) => !value)}
            >
              <View
                style={[
                  localStyles.checkbox,
                  acceptedTerms && localStyles.checkboxChecked,
                ]}
              >
                {acceptedTerms ? (
                  <Icon name="checkmark" size={14} color="#fff" />
                ) : null}
              </View>
              <Text style={localStyles.termsText}>
                {t("authTerms.prefix")}{" "}
                <Text
                  style={localStyles.termsLink}
                  onPress={() =>
                    navigation.navigate("TermsConditions" as never)
                  }
                >
                  {t("authTerms.link")}
                </Text>
              </Text>
            </TouchableOpacity>

            {error ? <Text style={styles.loginError}>{error}</Text> : null}

            <View
              style={[
                localStyles.actions,
                { paddingBottom: Math.max(insets.bottom + 2, 14) },
              ]}
            >
              <VibesActionButton
                label={loading ? t("signup.submitting") : t("signup.submit")}
                variant="start"
                onPress={handleSignup}
                disabled={
                  !acceptedTerms ||
                  !email ||
                  !password.trim() ||
                  loading ||
                  googleLoading ||
                  appleLoading
                }
              />

              <View style={localStyles.accountDivider} />
              <TouchableOpacity
                accessibilityRole="link"
                accessibilityLabel={`${t("signup.switchPrompt")} ${t(
                  "signup.switchAction"
                )}`}
                activeOpacity={0.72}
                onPress={() => navigation.navigate("Login" as never)}
                style={localStyles.accountSwitch}
              >
                <Text style={localStyles.accountSwitchText}>
                  {t("signup.switchPrompt")} {" "}
                  <Text style={localStyles.accountSwitchLink}>
                    {t("signup.switchAction")}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default Signup;

const localStyles = StyleSheet.create({
  actions: {
    marginTop: "auto",
    paddingTop: 22,
  },
  accountDivider: {
    width: "100%",
    height: 1,
    marginTop: 12,
    backgroundColor: "rgba(43, 43, 43, 0.12)",
  },
  accountSwitch: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  accountSwitchText: {
    color: vibesTheme.colors.secondaryText,
    fontFamily: vibesTheme.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  accountSwitchLink: {
    color: "#8B6327",
    fontFamily: vibesTheme.fonts.medium,
    textDecorationLine: "underline",
  },
  backButton: {
    marginTop: 18,
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
    marginTop: 14,
  },
  appleButton: {
    marginTop: 12,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(140, 123, 99, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: "#8C7B63",
    borderColor: "#8C7B63",
  },
  termsText: {
    flex: 1,
    color: "#6E6E6E",
    fontSize: 13,
    lineHeight: 18,
  },
  termsLink: {
    color: "#8C7B63",
    textDecorationLine: "underline",
  },
  header: {
    marginBottom: 8,
  },
  heroWrap: {
    width: "100%",
    height: 170,
    paddingHorizontal: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  loginContainer: {
    marginTop: 0,
  },
  loginCard: {
    flexGrow: 1,
  },
  signupIllustration: {
    width: "100%",
    height: "100%",
  },
  formScrollContent: {
    flexGrow: 1,
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
