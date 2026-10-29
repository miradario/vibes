/** @format */

import React, { useRef, useState } from "react";
import {
  useAppleLoginMutation,
  useGoogleLoginMutation,
  useLoginMutation,
  useResetPasswordMutation,
} from "../src/auth/auth.queries";
import {
  View,
  Image,
  Platform,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Text, TextInput } from "../components/Typography";
import * as AppleAuthentication from "expo-apple-authentication";
import { CommonActions, useIsFocused, useNavigation, useRoute } from "@react-navigation/native";
import styles from "../assets/styles";
import VibesActionButton from "../components/VibesActionButton";
import GoogleAuthButton from "../components/GoogleAuthButton";
import AppleAuthButton from "../components/AppleAuthButton";
import KeyboardViewport from "../components/KeyboardViewport";
import BackButton from "../components/BackButton";
import ScreenContainer from "../components/ScreenContainer";
import Icon from "../components/Icon";
import CustomDialog from "../components/CustomDialog";
import { useI18n } from "../src/i18n";
import { vibesTheme } from "../src/theme/vibesTheme";
import { getPostAuthRoute } from "../src/lib/onboardingFlow";
import Animated from "react-native-reanimated";
import useWanderingSphere from "../src/hooks/useWanderingSphere";
import { useVibiRuntime } from "../src/vibi/useMotionPreference";
import * as ds from "../src/theme/tokens";

const isBannedUserError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const authError = error as { code?: unknown; message?: unknown };
  return (
    authError.code === "user_banned" ||
    (typeof authError.message === "string" &&
      authError.message.toLowerCase().includes("user is banned"))
  );
};

const isInvalidCredentialsError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();

  return (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid email or password") ||
    normalized.includes("user not found") ||
    normalized.includes("user does not exist")
  );
};

const Login = () => {
  const { t } = useI18n();
  const [viewportHeight, setViewportHeight] = useState(0);
  const [formHeight, setFormHeight] = useState(0);
  const [actionsHeight, setActionsHeight] = useState(0);
  const heroHeight = viewportHeight && formHeight
    ? Math.max(0, Math.min(170, viewportHeight - formHeight - actionsHeight - 88))
    : 80;
  const navigation = useNavigation();
  const focused = useIsFocused();
  const { active, reducedMotion, motionReady } = useVibiRuntime();
  const [illustrationReady, setIllustrationReady] = useState(false);
  const circleMotion = useWanderingSphere(
    focused && active && motionReady && !reducedMotion && illustrationReady && heroHeight > 0,
    reducedMotion,
    45,
    Math.min(45, heroHeight * 0.3),
  );
  const route = useRoute();
  const loginParams = route.params as { email?: string; accountExists?: boolean } | undefined;
  const [email, setEmail] = useState(loginParams?.email ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);
  const [error, setError] = useState<string | null>(loginParams?.accountExists ? t("signup.accountExists") : null);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showGoogleLoginDialog, setShowGoogleLoginDialog] = useState(false);
  const loginMutation = useLoginMutation();
  const googleLoginMutation = useGoogleLoginMutation();
  const appleLoginMutation = useAppleLoginMutation();
  const resetPasswordMutation = useResetPasswordMutation();
  const loading = loginMutation.isPending;
  const googleLoading = googleLoginMutation.isPending;
  const appleLoading = appleLoginMutation.isPending;
  const resetPasswordLoading = resetPasswordMutation.isPending;
  const passwordInputRef = useRef<TextInput | null>(null);
  React.useEffect(() => {
    if (!loginParams?.accountExists) return;
    setEmail(loginParams.email ?? "");
    setPassword("");
    setError(t("signup.accountExists"));
  }, [loginParams?.accountExists, loginParams?.email, t]);


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

  const handleLogin = async () => {
    if (!email || !password.trim()) {
      setError(t("login.missingFields"));
      return;
    }

    setError(null);

    try {
      await loginMutation.mutateAsync({
        email: email.trim().toLowerCase(),
        password,
      });
      navigation.navigate("Tab" as never);
    } catch (e) {
      if (isBannedUserError(e)) {
        setError(t("login.accountSuspended"));
        return;
      }
      if (isInvalidCredentialsError(e)) {
        setError(t("login.invalidCredentials"));
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
        const routeName = await getPostAuthRoute(session.user.id);
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: routeName as never }],
          })
        );
      }
    } catch (e) {
      if (isBannedUserError(e)) {
        setError(t("login.accountSuspended"));
        return;
      }
      const msg = e instanceof Error ? e.message : t("login.googleFailed");
      setError(msg || t("login.googleFailed"));
    }
  };

  const handleAppleLogin = async () => {
    setError(null);

    try {
      const session = await appleLoginMutation.mutateAsync();
      if (session?.user?.id) {
        const routeName = await getPostAuthRoute(session.user.id);
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: routeName as never }],
          })
        );
      }
    } catch (e) {
      if (isBannedUserError(e)) {
        setError(t("login.accountSuspended"));
        return;
      }
      const msg = e instanceof Error ? e.message : t("login.appleFailed");
      setError(msg || t("login.appleFailed"));
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t("login.resetPasswordMissingEmail"));
      return;
    }

    setError(null);

    try {
      const route = await resetPasswordMutation.mutateAsync({ email: trimmedEmail });
      if (route === "google") setShowGoogleLoginDialog(true);
      else setShowResetPasswordDialog(true);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : t("login.resetPasswordFailed");
      setError(msg || t("login.resetPasswordFailed"));
    }
  };

  const isDisabled =
    !email ||
    !password.trim() ||
    loading ||
    googleLoading ||
    appleLoading ||
    resetPasswordLoading;
  return (
    <ScreenContainer style={styles.bg} edges={["top", "bottom", "left", "right"]}>
      <KeyboardViewport style={localStyles.loginContainer}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onLayout={event => setViewportHeight(event.nativeEvent.layout.height)}
          contentContainerStyle={localStyles.formScrollContent}
        >
          <View style={localStyles.loginCard}>
            <View style={localStyles.brandHeader}>
              <BackButton onPress={() => navigation.goBack()} style={localStyles.backButton} />
              <Image source={require("../assets/branding/vibes-logo-palette.png")} style={localStyles.logo} resizeMode="contain" accessible accessibilityLabel="Vibes" />
            </View>
            <View style={[localStyles.hero, { height: heroHeight, marginVertical: heroHeight > 0 ? ds.spacing[2] : 0 }]}>
              <Animated.View style={[localStyles.sun, circleMotion]} />
              <Image source={require("../assets/images/login-community.png")} onLoadEnd={() => setIllustrationReady(true)} style={localStyles.heroImage} resizeMode="contain" accessible={false} />
            </View>
            <View onLayout={event => setFormHeight(event.nativeEvent.layout.height)}>
            <Text style={localStyles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{t("login.title")}</Text>

            <GoogleAuthButton
              label={
                googleLoading ? t("login.googleSubmitting") : t("login.google")
              }
              onPress={handleGoogleLogin}
              disabled={loading || appleLoading}
              loading={googleLoading}
              style={localStyles.googleButton}
            />

            {isAppleAuthAvailable ? (
              <View style={localStyles.appleButton}>
                <AppleAuthButton
                  onPress={handleAppleLogin}
                  disabled={loading || googleLoading}
                  loading={appleLoading}
                />
              </View>
            ) : null}

            <View style={localStyles.divider}>
              <View style={localStyles.dividerLine} />
              <Text style={localStyles.dividerText}>{t("login.emailDivider")}</Text>
              <View style={localStyles.dividerLine} />
            </View>

            <View style={localStyles.field}>
              <Text style={localStyles.label}>{t("common.email")}</Text>
              <TextInput
                style={localStyles.input}
                placeholder={t("login.emailPlaceholder")}
                placeholderTextColor={vibesTheme.colors.secondaryText}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                blurOnSubmit={false}
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
            </View>

            <View style={localStyles.field}>
              <Text style={localStyles.label}>{t("common.password")}</Text>
              <View style={localStyles.passwordField}>
                <TextInput
                  ref={passwordInputRef}
                  style={[localStyles.input, localStyles.passwordInput]}
                  placeholder={t("login.passwordPlaceholder")}
                  placeholderTextColor={vibesTheme.colors.secondaryText}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={() => void handleLogin()}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                  style={localStyles.passwordToggle}
                  onPress={() => setShowPassword((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={ds.iconSize.md}
                    color={vibesTheme.colors.secondaryText}
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                activeOpacity={0.74}
                disabled={resetPasswordLoading}
                onPress={handleForgotPassword}
                style={localStyles.forgotPasswordButton}
              >
                <Text style={localStyles.forgotPasswordText}>
                  {resetPasswordLoading
                    ? t("login.resetPasswordSubmitting")
                    : t("login.forgotPassword")}
                </Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.loginErrorBox}>
                <Text style={styles.loginError}>{error}</Text>
              </View>
            ) : null}

            </View>
            <View style={localStyles.actions} onLayout={event => setActionsHeight(event.nativeEvent.layout.height)}>
              <VibesActionButton
                label={loading ? t("login.submitting") : t("login.submit")}
                variant="start"
                style={localStyles.loginButton}
                textStyle={localStyles.loginButtonText}
                onPress={handleLogin}
                disabled={isDisabled}
              />

              <View
                style={{
                  width: "100%",
                  height: 1,
                  backgroundColor: ds.colors.border.default,
                  marginTop: ds.spacing[3],
                }}
              />
              <Text
                style={{
                  textAlign: "center",
                  color: vibesTheme.colors.secondaryText,
                  ...ds.textStyles.bodySmall,
                  marginTop: ds.spacing[2],
                  marginBottom: ds.spacing[4],
                }}
              >
                {t("login.switchPrompt")}{" "}
                <Text
                  accessibilityRole="link"
                  onPress={() => navigation.navigate("AgeAssurance" as never)}
                  style={{
                    color: vibesTheme.colors.accentBlue,
                    textDecorationLine: "underline",
                    fontFamily: vibesTheme.fonts.medium,
                  }}
                >
                  {t("login.switchAction")}
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardViewport>
      <CustomDialog
        visible={showGoogleLoginDialog}
        title={t("login.googleRecoveryTitle")}
        message={t("login.googleRecoveryMessage")}
        primaryLabel={t("login.resetPasswordSentPrimary")}
        onPrimaryPress={() => setShowGoogleLoginDialog(false)}
        onClose={() => setShowGoogleLoginDialog(false)}
      />
      <CustomDialog
        visible={showResetPasswordDialog}
        title={t("login.resetPasswordSentTitle")}
        message={t("login.resetPasswordSentMessage")}
        primaryLabel={t("login.resetPasswordSentPrimary")}
        onPrimaryPress={() => setShowResetPasswordDialog(false)}
        onClose={() => setShowResetPasswordDialog(false)}
      />
    </ScreenContainer>
  );
};

export default Login;

const localStyles = StyleSheet.create({
  loginButton: { backgroundColor: vibesTheme.colors.primaryText, ...ds.shadows.none },
  loginButtonText: { color: vibesTheme.colors.surface },
  brandHeader: { height: 56, alignItems: "center", justifyContent: "center", zIndex: 1 },
  logo: { width: 54, height: 54 },
  hero: { alignItems: "center", justifyContent: "center", overflow: "visible" },
  sun: { position: "absolute", height: "95%", aspectRatio: 1, borderRadius: ds.radii.pill, backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.medium) },
  heroImage: { width: "100%", height: "100%" },
  title: { ...ds.textStyles.title, textAlign: "center", color: vibesTheme.colors.primaryText },
  subtitle: { ...ds.textStyles.body, textAlign: "center", color: vibesTheme.colors.secondaryText, marginTop: ds.spacing[2] },
  field: { marginTop: ds.spacing[3] },
  label: { ...ds.textStyles.subtitle, color: vibesTheme.colors.primaryText, marginBottom: ds.spacing[2] },
  input: { minHeight: 52, borderWidth: 1, borderColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.scrim), borderRadius: ds.radii.lg, backgroundColor: vibesTheme.colors.surface, paddingHorizontal: ds.spacing[4], paddingVertical: ds.spacing[3], color: vibesTheme.colors.primaryText, ...ds.textStyles.body },
  actions: {
    marginTop: "auto",
    paddingTop: ds.spacing[4],
  },
  backButton: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  divider: {
    marginTop: ds.spacing[3],
    marginBottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: ds.colors.border.default,
  },
  dividerText: {
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.bodySmall,
  },
  googleButton: {
    marginTop: ds.spacing[3],
    borderColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.scrim),
    borderRadius: ds.radii.lg,
  },
  appleButton: {
    marginTop: ds.spacing[3],
  },
  forgotPasswordButton: {
    marginTop: ds.spacing[1],
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-end",
  },
  forgotPasswordText: {
    color: vibesTheme.colors.accentBlue,
    ...ds.textStyles.label,
  },
  header: {
    marginBottom: ds.spacing[3],
  },
  loginContainer: {
    flex: 1,
    paddingHorizontal: ds.spacing[6],
  },
  loginCard: {
    ...ds.shadows.none,
    backgroundColor: vibesTheme.colors.background,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    flexGrow: 1,
    paddingTop: ds.spacing[2],
  },
  formScrollContent: {
    flexGrow: 1,
    paddingBottom: ds.spacing[2],
  },
  passwordField: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: ds.spacing[12],
  },
  passwordToggle: {
    position: "absolute",
    right: 4,
    width: 44,
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
  },
});
