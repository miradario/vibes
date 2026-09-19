import React from "react";
import { Text } from "react-native";
import type { ReceiptStatus } from "../src/queries/communityReceipts.queries";
export default function MessageReceipt({
  status = "sent",
}: {
  status?: ReceiptStatus;
}) {
  return (
    <Text
      accessibilityLabel={
        {
          sending: "Enviando",
          sent: "Enviado",
          delivered: "Recibido",
          read: "Leído",
        }[status]
      }
      style={{ fontSize: 13, color: status === "read" ? "#426F9C" : "#6E6E6E" }}
    >
      {status === "sending" ? "◷" : status === "sent" ? "✓" : "✓✓"}
    </Text>
  );
}
