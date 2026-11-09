import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "../auth/auth.queries";
import { challengesKeys } from "../queries/events.queries";
import { runStepAutoCheckins } from "./stepAutoCheckin";
import { syncStepsBackgroundWork } from "./stepsBackgroundTask";

/**
 * Camino en primer plano de los desafíos de pasos: al abrir la app y cada vez
 * que vuelve a primer plano lee los pasos de hoy y marca los días cumplidos.
 * No hace nada si el usuario no conectó Salud o no está en un desafío de pasos.
 */
export const StepChallengeSync = () => {
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || (Platform.OS !== "ios" && Platform.OS !== "android")) return;
    const run = async () => {
      await syncStepsBackgroundWork();
      const result = await runStepAutoCheckins({ notify: true });
      if (!result.checkedIn.length) return;
      queryClient.invalidateQueries({ queryKey: ["challenge_participant"] });
      queryClient.invalidateQueries({ queryKey: ["challenge_checkins"] });
      queryClient.invalidateQueries({ queryKey: ["challenge_checkins_today_count"] });
      queryClient.invalidateQueries({ queryKey: challengesKeys.all });
    };
    void run();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void run();
    });
    return () => subscription.remove();
  }, [queryClient, userId]);

  return null;
};
