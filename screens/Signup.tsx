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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles from "../assets/styles";
import AnimatedIllustration from "../src/components/illustrations/AnimatedIllustration";
import { signupIllustrationConfig } from "../src/components/illustrations/presets/signupIllustrationConfig";
import VibesHeader from "../src/components/VibesHeader";
import VibesActionButton from "../components/VibesActionButton";

const Signup = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const signupMutation = useSignupMutation();
  const loading = signupMutation.isPending;

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      setError("Por favor completa todos los campos.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setError(null);

    try {
      await signupMutation.mutateAsync({ email, password });
      navigation.navigate("VibesMinimalOnboarding" as never);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "No se pudo crear la cuenta.";
      setError(msg || "No se pudo crear la cuenta.");
    }
  };

  return (
    <View style={styles.bg}>
      <View>
        <View style={styles.welcomeLogo}>
          <AnimatedIllustration
            {...signupIllustrationConfig}
            style={localStyles.signupIllustration}
          />
        </View>
      </View>
      <KeyboardAvoidingView
        style={styles.loginContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.loginCard}>
          <VibesHeader title="Signup" subtitle="" style={localStyles.header} />
          <Text style={styles.loginTitle}>Crear cuenta</Text>
          <Text style={styles.loginSubtitle}>Comienza tu viaje consciente</Text>

          <View style={styles.loginField}>
            <Text style={styles.loginLabel}>Email</Text>
            <TextInput
              style={styles.loginInput}
              placeholder="tu@email.com"
              placeholderTextColor="#6E6E6E"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.loginField}>
            <Text style={styles.loginLabel}>Contraseña</Text>
            <TextInput
              style={styles.loginInput}
              placeholder="••••••••"
              placeholderTextColor="#6E6E6E"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View style={styles.loginField}>
            <Text style={styles.loginLabel}>Confirmar contraseña</Text>
            <TextInput
              style={styles.loginInput}
              placeholder="••••••••"
              placeholderTextColor="#6E6E6E"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          {error ? <Text style={styles.loginError}>{error}</Text> : null}

          <View style={localStyles.actions}>
            <VibesActionButton
              label={loading ? "Signing up..." : "Sign up"}
              variant="start"
              onPress={handleSignup}
              disabled={!email || !password || !confirmPassword || loading}
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

export default Signup;

const localStyles = StyleSheet.create({
  actions: {
    marginTop: 28,
  },
  header: {
    marginBottom: 14,
  },
  signupIllustration: {
    width: "100%",
    height: "100%",
  },
});
