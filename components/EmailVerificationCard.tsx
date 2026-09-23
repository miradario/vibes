import Icon from "./Icon";
import React, { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { Text } from "./Typography";
import { useEmailOwnershipQuery } from "../src/queries/emailOwnership.queries";
import {
  isEmailOwnershipVerified,
  sendEmailVerification,
} from "../src/auth/emailVerification";

export default function EmailVerificationCard({ userId, email }: { userId?: string; email?: string }) {
  const query = useEmailOwnershipQuery(userId);
  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [lastSent, setLastSent] = useState(0);
  const verified = isEmailOwnershipVerified(query.data);
  const check = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const result = await query.refetch();
      setMessage(
        result.isError
          ? "No pudimos consultar la verificación. Intentá nuevamente."
          : isEmailOwnershipVerified(result.data)
          ? ""
          : "Todavía figura pendiente. Abrí el último correo de Vibes y tocá ‘Verificar mi email’ en el enlace recibido."
      );
    } finally {
      setChecking(false);
    }
  };
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
  const startVerification = () => {
    if (verified || sending || query.isLoading) return;
    setExpanded(true);
    void (query.isError ? query.refetch() : send());
  };
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1,
        borderColor: "#C3D2E1", borderRadius: 14, paddingHorizontal: 14, minHeight: 52 }}>
        <Text style={{ flex: 1, paddingVertical: 14, fontSize: 17, color: "#2B2B2B" }}>
          {query.data?.email ?? email ?? "—"}
        </Text>
        <TouchableOpacity
          accessibilityRole={verified ? "image" : "button"}
          accessibilityLabel={verified ? "Email verificado" : "Validar email"}
          disabled={verified || sending || query.isLoading}
          onPress={startVerification}
          style={{ marginLeft: 12, minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }}>
          <Icon name="checkmark-circle" size={26} color={verified ? "#43A047" : "#B8BEC4"} />
        </TouchableOpacity>
      </View>
      {!verified && (
        <TouchableOpacity accessibilityRole="button" disabled={sending || query.isLoading}
          onPress={startVerification}
          style={{ minHeight: 48, alignSelf: "flex-end", justifyContent: "center" }}>
          <Text style={{ fontSize: 13, color: "#8C6A2D", textDecorationLine: "underline" }}>
            {query.isLoading ? "Consultando…" : sending ? "Enviando…" : "Validar email"}
          </Text>
        </TouchableOpacity>
      )}
      {!verified && expanded && (
        <View>
          {!!message && <Text accessibilityLiveRegion="polite" style={{ fontSize: 13, color: "#6E6E6E" }}>{message}</Text>}
          <TouchableOpacity accessibilityRole="button" disabled={checking}
            onPress={() => void check()} style={{ minHeight: 48, justifyContent: "center" }}>
            <Text style={{ fontSize: 13, color: "#8C6A2D", textDecorationLine: "underline" }}>
              {checking ? "Comprobando…" : "Ya abrí el enlace · Comprobar"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
