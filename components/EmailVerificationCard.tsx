import React, { useCallback, useEffect, useState } from "react";
import { AppState, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../src/lib/supabase";
import {
  isEmailOwnershipVerified,
  sendEmailVerification,
} from "../src/auth/emailVerification";

export default function EmailVerificationCard({ userId }: { userId?: string }) {
  const query = useQuery({
    queryKey: ["emailOwnership", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },
  });
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [lastSent, setLastSent] = useState(0);
  useFocusEffect(
    useCallback(() => {
      if (userId) void query.refetch();
    }, [userId, query.refetch])
  );
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && userId) void query.refetch();
    });
    return () => sub.remove();
  }, [userId, query.refetch]);
  const verified = isEmailOwnershipVerified(query.data);
  const send = async () => {
    if (sending || !query.data?.email) return;
    if (Date.now() - lastSent < 60000) {
      setMessage("Esperá un minuto antes de reenviar el correo.");
      return;
    }
    setSending(true);
    setMessage("");
    try {
      await sendEmailVerification(query.data.email);
      setLastSent(Date.now());
      setMessage(
        "Te enviamos un enlace. Revisá tu correo y la carpeta de spam."
      );
    } catch {
      setMessage(
        "No pudimos enviar el correo. Esperá un momento e intentá de nuevo."
      );
    } finally {
      setSending(false);
    }
  };
  return (
    <View
      style={{
        marginTop: 8,
      }}
    >
      {query.isError ? (
        <TouchableOpacity
          accessibilityRole="button"
          style={{ minHeight: 48, justifyContent: "center" }}
          onPress={() => void query.refetch()}
        >
          <Text>No pudimos consultar tu email. Reintentar</Text>
        </TouchableOpacity>
      ) : (
        <>
          <Text
            accessibilityLiveRegion="polite"
            style={{ marginVertical: 8, color: "#6E6E6E" }}
          >
            {query.isLoading
              ? "Consultando email…"
              : verified
              ? "Email verificado ✓"
              : "Email pendiente de verificar"}
          </Text>
          {!verified && query.data?.email ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ disabled: sending, busy: sending }}
              disabled={sending}
              onPress={() => void send()}
              style={{
                minHeight: 48,
                paddingVertical: 12,
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#8C6A2D" }}>
                {sending ? "Enviando…" : "Reenviar correo de verificación"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </>
      )}
      {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}
    </View>
  );
}
