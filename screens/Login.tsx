/** @format */

import React, { useState } from "react";
import { useLoginMutation } from "../src/auth/auth.queries";
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
import VibesHeader from "../src/components/VibesHeader";
import Icon from "../components/Icon";
import LoopingVideo from "../components/LoopingVideo";
import { useI18n } from "../src/i18n";

const Login = () => {
  const { t } = useI18n();
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loginMutation = useLoginMutation();
  const loading = loginMutation.isPending;

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
      const msg = e instanceof Error ? e.message : t("login.failed");
      setError(msg || t("login.failed"));
    }
  };

  const isDisabled = !email || !password || loading;

  return (
    <View style={styles.bg}>
      <View pointerEvents="none" style={localStyles.authBackdrop}>
        <View style={localStyles.blobTopLeft} />
        <View style={localStyles.blobTopRight} />
        <View style={localStyles.blobBottom} />
      </View>
      <View style={localStyles.heroWrap}>
        <LoopingVideo
          source={require("../assets/videos/login.mp4")}
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

            <View style={styles.loginField}>
              <Text style={styles.loginLabel}>{t("common.email")}</Text>
              <TextInput
                style={styles.loginInput}
                placeholder={t("login.emailPlaceholder")}
                placeholderTextColor="rgba(118, 128, 190, 0.72)"
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
                  placeholderTextColor="rgba(118, 128, 190, 0.72)"
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
                    color="#8B97CF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {error ? <Text style={styles.loginError}>{error}</Text> : null}

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
    </View>
  );
};

export default Login;

const localStyles = StyleSheet.create({
  authBackdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  blobTopLeft: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255, 226, 200, 0.62)",
    top: -70,
    right: -60,
  },
  blobTopRight: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(247, 210, 201, 0.56)",
    top: 220,
    left: -80,
  },
  blobBottom: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(193, 213, 255, 0.4)",
    bottom: -90,
    right: -70,
  },
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
