import React, { useState } from "react";
import { useLoginMutation } from "../src/auth/auth.queries";
import { View, Text, ImageBackground, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { WHITE } from "../assets/styles";

const Login = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const loginMutation = useLoginMutation();
  const loading = loginMutation.isPending;

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Completa tu email y contraseña.");
      return;
    }

    setError(null);

    try {
      await loginMutation.mutateAsync({ email, password });
      navigation.navigate("Tab" as never);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo iniciar sesión.";
      setError(msg || "No se pudo iniciar sesión.");
    }
  };

  return (
    <ImageBackground source={require("../assets/images/background.png")} style={styles.bg}>
      <View style={styles.welcomeOverlay} />
      <KeyboardAvoidingView style={styles.loginContainer} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.loginCard}>
          <Text style={styles.loginTitle}>Bienvenido de nuevo</Text>
          <Text style={styles.loginSubtitle}>Inicia sesión para continuar</Text>

          <View style={styles.loginField}>
            <Text style={styles.loginLabel}>Email</Text>
            <TextInput style={styles.loginInput} placeholder="tu@email.com" placeholderTextColor="#9B91A6" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          </View>

          <View style={styles.loginField}>
            <Text style={styles.loginLabel}>Contraseña</Text>
            <TextInput style={styles.loginInput} placeholder="••••••••" placeholderTextColor="#9B91A6" secureTextEntry value={password} onChangeText={setPassword} />
          </View>

          {error ? <Text style={styles.loginError}>{error}</Text> : null}

          <TouchableOpacity style={[styles.loginButton, (!email || !password || loading) && styles.loginButtonDisabled]} onPress={handleLogin} disabled={!email || !password || loading}>
            {loading ? <ActivityIndicator color={WHITE} /> : <Text style={styles.loginButtonText}>Entrar</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginSecondary} onPress={() => navigation.navigate("Welcome" as never)}>
            <Text style={styles.loginSecondaryText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

export default Login;
