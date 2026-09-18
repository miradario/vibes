import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import {
  CommonActions,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import ScreenContainer from "../components/ScreenContainer";
import PrimaryButton from "../components/onboarding/PrimaryButton";
import { verifyEmailOwnership } from "../src/auth/emailVerification";
import { supabase } from "../src/lib/supabase";
import { getPostAuthRoute } from "../src/lib/onboardingFlow";

export default function VerifyEmail() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const client = useQueryClient();
  const token =
    typeof route.params?.token_hash === "string" ? route.params.token_hash : "";
  const [state, setState] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    setState("loading");
    if (!token) {
      setMessage("El enlace no es válido. Pedí uno nuevo desde tu perfil.");
      setState("error");
      return;
    }
    void verifyEmailOwnership(token)
      .then(() => {
        void client.invalidateQueries({ queryKey: ["emailOwnership"] });
        if (active) setState("success");
      })
      .catch((error) => {
        if (active) {
          setMessage(error.message);
          setState("error");
        }
      });
    return () => {
      active = false;
    };
  }, [token, client]);
  const finish = async () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    try {
      const { data } = await supabase.auth.getSession();
      const name = data.session
        ? await getPostAuthRoute(data.session.user.id)
        : "Welcome";
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name }] })
      );
    } catch {
      setMessage("No pudimos continuar. Intentá nuevamente.");
    }
  };
  return (
    <ScreenContainer
      scroll
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        padding: 28,
        gap: 24,
      }}
    >
      <Text style={{ fontSize: 30 }}>
        {state === "success"
          ? "Email verificado"
          : state === "error"
          ? "No pudimos verificar tu email"
          : "Verificando tu email…"}
      </Text>
      {state === "loading" ? (
        <ActivityIndicator />
      ) : (
        <>
          <Text style={{ fontSize: 17, lineHeight: 25 }}>
            {state === "success"
              ? "Tu correo ya está verificado. Podés seguir disfrutando de Vibes."
              : message}
          </Text>
          <PrimaryButton label="Continuar" onPress={() => void finish()} />
        </>
      )}
    </ScreenContainer>
  );
}
