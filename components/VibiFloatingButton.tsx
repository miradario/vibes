import React, { useEffect, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./Typography";
import { useAuthSession } from "../src/auth/auth.queries";
import { useVibiEnabled } from "../src/featureFlags/useVibiEnabled";
import { getBottomTabBarHeight } from "../src/lib/tabBarLayout";
import { vibesTheme } from "../src/theme/vibesTheme";

// A new app launch shows the greeting again, but navigation and flag changes do not.
let greetingShown = false;
const colors = vibesTheme.colors;

function FloatingButton() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const [showGreeting, setShowGreeting] = useState(() => !greetingShown);
  const [keyboardVisible, setKeyboardVisible] = useState(Keyboard.isVisible());

  useEffect(() => {
    greetingShown = true;
    const timer = setTimeout(() => setShowGreeting(false), 8000);
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true)
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false)
    );
    return () => {
      clearTimeout(timer);
      show.remove();
      hide.remove();
    };
  }, []);

  const openVibi = () => {
    setShowGreeting(false);
    navigation.navigate("Vibi" as never);
  };

  if (keyboardVisible) return null;
  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          right: Math.max(insets.right, 0) + 20,
          bottom:
            getBottomTabBarHeight(fontScale) +
            Math.max(insets.bottom + 8, 18) +
            12,
        },
      ]}
    >
      {showGreeting ? (
        <View style={styles.greeting}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Necesitas ayuda? Abrir Vibi"
            onPress={openVibi}
            style={styles.greetingAction}
          >
            <Text style={styles.greetingText}>Necesitas ayuda?</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar ayuda de Vibi"
            onPress={() => setShowGreeting(false)}
            style={styles.dismiss}
          >
            <Ionicons name="close" size={18} color={colors.secondaryText} />
          </Pressable>
          <View style={styles.tail} />
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hablar con Vibi"
        accessibilityHint="Abre tu asistente en Vibes"
        onPress={openVibi}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Ionicons
          name="sparkles-outline"
          size={26}
          color={colors.primaryText}
        />
        <Text style={styles.label}>Vibi</Text>
      </Pressable>
    </View>
  );
}

export default function VibiFloatingButton() {
  const enabled = useVibiEnabled();
  const { data: session } = useAuthSession();
  return enabled && session?.user?.id ? <FloatingButton /> : null;
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignItems: "flex-end",
    gap: 12,
    maxWidth: "90%",
  },
  button: {
    minWidth: 64,
    minHeight: 64,
    padding: 10,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    backgroundColor: colors.accentMustard,
    shadowColor: colors.primaryText,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
  pressed: { opacity: 0.8 },
  label: { color: colors.primaryText, fontSize: 12 },
  greeting: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accentMustard,
    shadowColor: colors.primaryText,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  greetingAction: { flexShrink: 1, paddingLeft: 16, paddingVertical: 14 },
  greetingText: { color: colors.primaryText, fontSize: 16 },
  dismiss: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  tail: {
    position: "absolute",
    right: 25,
    bottom: -6,
    width: 10,
    height: 10,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.accentMustard,
    transform: [{ rotate: "45deg" }],
  },
});
