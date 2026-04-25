/** @format */

import React, { useState } from "react";
import { useSignupMutation } from "../src/auth/auth.queries";
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
import { ResizeMode, Video } from "expo-av";
import { CommonActions, useNavigation } from "@react-navigation/native";
import styles from "../assets/styles";
import VibesHeader from "../src/components/VibesHeader";
import VibesActionButton from "../components/VibesActionButton";
import Icon from "../components/Icon";
import { useI18n } from "../src/i18n";

const Signup = () => {
  const { t } = useI18n();
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signupMutation = useSignupMutation();
  const loading = signupMutation.isPending;

  const handleSignup = async () => {
    if (!email || !password) {
      setError(t("signup.missingFields"));
      return;
    }

    if (password.length < 6) {
      setError(t("signup.passwordLength"));
      return;
    }

    setError(null);

    try {
      await signupMutation.mutateAsync({ email, password });
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "OnboardingName" as never }],
        }),
      );
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : t("signup.failed");
      setError(msg || t("signup.failed"));
    }
  };

  return (
    <View style={styles.bg}>
      <View style={localStyles.heroWrap}>
        <Video
          source={require("../assets/videos/signup.mp4")}
          style={localStyles.signupIllustration}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          isMuted
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
            <VibesHeader title={t("signup.header")} subtitle="" style={localStyles.header} />
            <Text style={styles.loginTitle}>{t("signup.title")}</Text>
            <Text style={styles.loginSubtitle}>{t("signup.subtitle")}</Text>

            <View style={styles.loginField}>
              <Text style={styles.loginLabel}>{t("common.email")}</Text>
              <TextInput
                style={styles.loginInput}
                placeholder={t("signup.emailPlaceholder")}
                placeholderTextColor="rgba(110,110,110,0.45)"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.loginField}>
              <Text style={styles.loginLabel}>{t("common.password")}</Text>
              <View style={localStyles.passwordField}>
                <TextInput
                  style={[styles.loginInput, localStyles.passwordInput]}
                  placeholder=""
                  placeholderTextColor="#6E6E6E"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
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

            {error ? <Text style={styles.loginError}>{error}</Text> : null}

            <View style={localStyles.actions}>
              <VibesActionButton
                label={loading ? t("signup.submitting") : t("signup.submit")}
                variant="start"
                onPress={handleSignup}
                disabled={!email || !password || loading}
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
    </View>
  );
};

export default Signup;

const localStyles = StyleSheet.create({
  actions: {
    marginTop: 28,
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
  signupIllustration: {
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
