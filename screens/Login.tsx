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
import { ResizeMode, Video } from "expo-av";
import { useNavigation } from "@react-navigation/native";
import styles from "../assets/styles";
import VibesActionButton from "../components/VibesActionButton";
import VibesHeader from "../src/components/VibesHeader";
import Icon from "../components/Icon";

const Login = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loginMutation = useLoginMutation();
  const loading = loginMutation.isPending;

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please complete your email and password.");
      return;
    }

    setError(null);

    try {
      await loginMutation.mutateAsync({ email, password });
      navigation.navigate("Tab" as never);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not log in.";
      setError(msg || "Could not log in.");
    }
  };

  const isDisabled = !email || !password || loading;

  return (
    <View style={styles.bg}>
      <View style={localStyles.heroWrap}>
        <Video
          source={require("../assets/videos/login.mp4")}
          style={localStyles.loginIllustration}
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
            <VibesHeader title="Login" subtitle="" style={localStyles.header} />
            <Text style={styles.loginTitle}>Welcome back</Text>
            <Text style={styles.loginSubtitle}>Sign in to continue</Text>

            <View style={styles.loginField}>
              <Text style={styles.loginLabel}>Email</Text>
              <TextInput
                style={styles.loginInput}
                placeholder="your@email.com"
                placeholderTextColor="#6E6E6E"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.loginField}>
              <Text style={styles.loginLabel}>Password</Text>
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
                label={loading ? "Signing in..." : "Sign in"}
                variant="start"
                onPress={handleLogin}
                disabled={isDisabled}
              />

              <VibesActionButton
                label="Back"
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
