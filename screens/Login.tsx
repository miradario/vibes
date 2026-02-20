/** @format */

import React, { useState } from "react";
import { useLoginMutation } from "../src/auth/auth.queries";
import {
  View,
  Text,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles from "../assets/styles";
import VibesActionButton from "../components/VibesActionButton";

const Login = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      <Image
        source={require("../assets/images/logo.png")}
        style={styles.welcomeLogo}
      />
      <View />
      <KeyboardAvoidingView
        style={styles.loginContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.loginCard}>
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
            <TextInput
              style={styles.loginInput}
              placeholder=""
              placeholderTextColor="#6E6E6E"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
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
      </KeyboardAvoidingView>
    </View>
  );
};

export default Login;

const localStyles = StyleSheet.create({
  actions: {
    marginTop: 28,
  },
});
