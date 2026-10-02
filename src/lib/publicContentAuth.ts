import { Alert } from "react-native";

type PublicContentNavigation = {
  navigate: (name: string, params?: Record<string, unknown>) => void;
};

export const promptForPublicContentAuth = (
  navigation: PublicContentNavigation,
  contentLabel: "evento" | "desafío",
) => {
  Alert.alert(
    `Creá tu cuenta para sumarte`,
    `Podés explorar este ${contentLabel} sin registrarte. Para sumarte necesitás una cuenta de Vibes.`,
    [
      { text: "Ahora no", style: "cancel" },
      {
        text: "Iniciar sesión",
        onPress: () => navigation.navigate("Login"),
      },
      {
        text: "Registrarme",
        onPress: () => navigation.navigate("AgeAssurance"),
      },
    ],
  );
};
