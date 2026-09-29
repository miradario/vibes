import React from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { Text } from "./Typography";
import ProfileMediaImage from "./ProfileMediaImage";
import Icon from "./Icon";
import { vibesTheme } from "../src/theme/vibesTheme";

export default function HomeDiscoveryHero() {
  const navigation = useNavigation<any>();
  return (
    <View style={s.card}>
      <ProfileMediaImage
        source={require("../assets/images/events/evento_meditation.png")}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["rgba(43,43,43,0.35)", "rgba(43,43,43,0.88)"]}
        style={StyleSheet.absoluteFillObject}
      />
      <Text style={s.eyebrow}>Para vos hoy</Text>
      <Text style={s.title}>Conectá{"\n"}con lo que te hace bien</Text>
      <View style={s.footer}>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.85}
          style={s.button}
          onPress={() => navigation.navigate("Tab", { screen: "Discover" })}
        >
          <Text style={s.buttonText}>Explorar ahora</Text>
          <Icon
            name="arrow-forward"
            size={20}
            color={vibesTheme.colors.primaryText}
          />
        </TouchableOpacity>
        <Text style={s.categories}>
          Mente · Cuerpo{"\n"}Conexión · Comunidad
        </Text>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  card: {
    minHeight: 218,
    borderRadius: 18,
    overflow: "hidden",
    padding: 18,
    marginBottom: 24,
    backgroundColor: vibesTheme.colors.primaryText,
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: { color: vibesTheme.colors.background, fontSize: 15 },
  title: {
    color: vibesTheme.colors.background,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 30,
    lineHeight: 36,
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  button: {
    backgroundColor: vibesTheme.colors.accentMustard,
    borderRadius: 28,
    minHeight: 46,
    paddingHorizontal: 18,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  buttonText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 15,
    fontFamily: vibesTheme.fonts.bold,
  },
  categories: {
    color: vibesTheme.colors.background,
    fontSize: 11,
    lineHeight: 16,
  },
});
