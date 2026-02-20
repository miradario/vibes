/** @format */

import React, { useState } from "react";
import { useSignupMutation } from "../src/auth/auth.queries";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { WHITE } from "../assets/styles";

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
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.welcomeLogo}
        />
      </View>
      <KeyboardAvoidingView
        style={styles.loginContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.loginCard}>
          <Text style={styles.loginTitle}>Crear cuenta</Text>
          <Text style={styles.loginSubtitle}>Comienza tu viaje consciente</Text>

          <View style={styles.loginField}>
            <Text style={styles.loginLabel}>Email</Text>
            <TextInput
              style={styles.loginInput}
              placeholder="tu@email.com"
              placeholderTextColor="#9B91A6"
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
              placeholderTextColor="#9B91A6"
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
              placeholderTextColor="#9B91A6"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          {error ? <Text style={styles.loginError}>{error}</Text> : null}

          <TouchableOpacity
            style={[
              styles.loginButton,
              (!email || !password || !confirmPassword || loading) &&
                styles.loginButtonDisabled,
            ]}
            onPress={handleSignup}
            disabled={!email || !password || !confirmPassword || loading}
          >
            {loading ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <Text style={styles.loginButtonText}>Crear cuenta</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginSecondary}
            onPress={() => navigation.navigate("Login" as never)}
          >
            <Text style={styles.loginSecondaryText}>
              ¿Ya tienes cuenta? Inicia sesión
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginSecondary}
            onPress={() => navigation.navigate("Welcome" as never)}
          >
            <Text style={styles.loginSecondaryText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default Signup;
