import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "../auth/auth.queries";
import { challengesKeys } from "../queries/events.queries";
import { runHealthAutoCheckins } from "./healthAutoCheckin";
import { syncHealthBackgroundWork } from "./healthBackgroundTask";

/**
 * Camino en primer plano de los desafíos de Salud: al abrir la app y cada vez
 * que vuelve a primer plano lee las métricas de hoy y marca los días cumplidos.
 * No hace nada si el usuario no está en un desafío de Salud.
 */
export const HealthChallengeSync = () => {
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || (Platform.OS !== "ios" && Platform.OS !== "android")) return;
    const run = async () => {
      await syncHealthBackgroundWork();
      const result = await runHealthAutoCheckins({ notify: true });
      if (!result.checkedIn.length) return;
      invalidateHealthCheckinQueries(queryClient);
    };
    void run();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void run();
    });
    return () => subscription.remove();
  }, [queryClient, userId]);

  return null;
};

export const invalidateHealthCheckinQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ["challenge_participant"] });
  queryClient.invalidateQueries({ queryKey: ["challenge_checkins"] });
  queryClient.invalidateQueries({ queryKey: ["challenge_checkins_today_count"] });
  queryClient.invalidateQueries({ queryKey: ["challenge_participants_list"] });
  queryClient.invalidateQueries({ queryKey: challengesKeys.all });
};
