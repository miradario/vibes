import { vibesTheme } from "../src/theme/vibesTheme";
import React from "react";
import { View } from "react-native";
import Icon from "./Icon";
import type { ReceiptStatus } from "../src/queries/communityReceipts.queries";
export default function MessageReceipt({
  status = "sent",
}: {
  status?: ReceiptStatus;
}) {
  return (
    <View
      accessible
      accessibilityLabel={
        {
          sending: "Enviando",
          sent: "Enviado",
          delivered: "Recibido",
          read: "Leído",
        }[status]
      }
      style={{ alignItems: "center", justifyContent: "center" }}
    >
      <Icon
        name={status === "sending" ? "time-outline" : status === "sent" ? "checkmark" : "checkmark-done"}
        size={16}
        color={status === "read" ? vibesTheme.colors.primaryText : vibesTheme.colors.secondaryText}
      />
    </View>
  );
}
