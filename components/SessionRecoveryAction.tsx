import React, { useRef, useState } from "react";
import { Alert, DevSettings, Platform } from "react-native";
import * as Updates from "expo-updates";
import { useQueryClient } from "@tanstack/react-query";
import { clearLocalAuthStorage, supabase } from "../src/lib/supabase";
import { withBootTimeout } from "../src/lib/startupBoot";
import VibesActionButton from "./VibesActionButton";
import { vibesTheme } from "../src/theme/vibesTheme";

export default function SessionRecoveryAction() {
  const queryClient = useQueryClient();
  const busy = useRef(false);
  const [recovering, setRecovering] = useState(false);
  const recover = async () => {
    if (busy.current) return;
    busy.current = true;
    setRecovering(true);
    try {
      // Local scope never signs out the user's other devices.
      try { await withBootTimeout(supabase.auth.signOut({ scope: "local" }), 3000, "Cerrar sesión local"); } catch {}
      await withBootTimeout(clearLocalAuthStorage(), 5000, "Restablecer sesión local");
      queryClient.clear();
      // A new SDK instance releases any session lock left by a stalled request.
      if (Platform.OS === "web") { globalThis.location.reload(); return; }
      if (__DEV__) { DevSettings.reload(); return; }
      await Updates.reloadAsync();
    } catch {
      Alert.alert("Recuperar acceso", "Cerrá Vibes y volvé a abrirla para iniciar sesión nuevamente. Si el problema continúa, volvé a intentarlo desde esta pantalla.");
    } finally {
      busy.current = false;
      setRecovering(false);
    }
  };
  return <VibesActionButton label={recovering ? "Restableciendo sesión…" : "Volver a iniciar sesión"} disabled={recovering} onPress={() => void recover()} textStyle={{ color: vibesTheme.colors.primaryText }} />;
}
