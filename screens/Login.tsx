/** @format */

import React, { useState } from "react";
import { useLoginMutation } from "../src/auth/auth.queries";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import VibesActionButton from "../components/VibesActionButton";
import AnimatedIllustration from "../src/components/illustrations/AnimatedIllustration";
import { loginIllustrationConfig } from "../src/components/illustrations/presets/loginIllustrationConfig";
import VibesHeader from "../src/components/VibesHeader";
import { vibesTheme } from "../src/theme/vibesTheme";

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
    <SafeAreaView style={localStyles.screen} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={localStyles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={localStyles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={localStyles.hero}>
            <AnimatedIllustration
              {...loginIllustrationConfig}
              style={localStyles.loginIllustration}
            />
          </View>

          <View style={localStyles.card}>
            <VibesHeader title="Login" subtitle="" style={localStyles.header} />
            <Text style={localStyles.title}>Welcome back</Text>
            <Text style={localStyles.subtitle}>Sign in to continue</Text>

            <View style={localStyles.field}>
              <Text style={localStyles.label}>Email</Text>
              <TextInput
                style={localStyles.input}
                placeholder="your@email.com"
                placeholderTextColor={vibesTheme.colors.secondaryText}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={localStyles.field}>
              <Text style={localStyles.label}>Password</Text>
              <TextInput
                style={localStyles.input}
                placeholder="Enter your password"
                placeholderTextColor={vibesTheme.colors.secondaryText}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {error ? <Text style={localStyles.error}>{error}</Text> : null}

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
    </SafeAreaView>
  );
};

export default Login;

const localStyles = StyleSheet.create({
  actions: {
    marginTop: 28,
  },
  card: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 30,
    elevation: 3,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
  },
  error: {
    marginTop: 14,
    color: vibesTheme.colors.accentCoral,
    textAlign: "center",
    fontSize: 14,
  },
  field: {
    marginTop: 18,
  },
  flex: {
    flex: 1,
  },
  header: {
    marginBottom: 12,
  },
  hero: {
    width: "100%",
    height: 250,
    alignSelf: "center",
    marginBottom: 8,
  },
  input: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: vibesTheme.colors.borderSoft,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: vibesTheme.colors.primaryText,
    fontSize: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: vibesTheme.colors.accentMustard,
  },
  loginIllustration: {
    width: "100%",
    height: "100%",
  },
  screen: {
    flex: 1,
    backgroundColor: vibesTheme.colors.background,
  },
  subtitle: {
    textAlign: "center",
    color: vibesTheme.colors.secondaryText,
    fontSize: 16,
    marginTop: 6,
  },
  title: {
    textAlign: "center",
    color: vibesTheme.colors.accentMustard,
    fontFamily: "CormorantGaramond_700Bold",
    fontSize: 26,
  },
});
