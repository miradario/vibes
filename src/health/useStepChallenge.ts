import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { challengeCheckinsKeys, challengeParticipantKeys, challengesKeys } from "../queries/events.queries";
import {
  connectSteps,
  getHealthAvailability,
  isStepsConnected,
  openHealthConnectInstall,
  readTodaySteps,
  type HealthAvailability,
} from "./healthSteps";
import { runStepAutoCheckins } from "./stepAutoCheckin";
import { syncStepsBackgroundWork } from "./stepsBackgroundTask";

type Options = {
  challengeId?: string;
  userId?: string;
  /** Only read Health for step challenges the user joined and that are running today. */
  enabled: boolean;
};

/** Estado de Salud para el detalle de un desafío de pasos. */
export const useStepChallenge = ({ challengeId, userId, enabled }: Options) => {
  const queryClient = useQueryClient();
  const [availability, setAvailability] = useState<HealthAvailability | null>(null);
  const [connected, setConnected] = useState(false);
  const [steps, setSteps] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const nextAvailability = await getHealthAvailability();
    const nextConnected = nextAvailability === "available" && (await isStepsConnected());
    const nextSteps = nextConnected ? await readTodaySteps() : null;
    if (!mounted.current) return;
    setAvailability(nextAvailability);
    setConnected(nextConnected);
    setSteps(nextSteps);
    if (!nextConnected) return;
    // In the foreground the screen already celebrates, so no notification here.
    const result = await runStepAutoCheckins({ notify: false });
    if (challengeId && userId && result.checkedIn.includes(challengeId)) {
      queryClient.invalidateQueries({ queryKey: challengeParticipantKeys.participant(challengeId, userId) });
      queryClient.invalidateQueries({ queryKey: challengeCheckinsKeys.list(challengeId, userId) });
      queryClient.invalidateQueries({ queryKey: ["challenge_checkins_today_count", challengeId] });
      queryClient.invalidateQueries({ queryKey: ["challenge_participants_list", challengeId] });
      queryClient.invalidateQueries({ queryKey: challengesKeys.all });
    }
  }, [challengeId, enabled, queryClient, userId]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => subscription.remove();
  }, [enabled, refresh]);

  const connect = useCallback(async () => {
    if (availability === "not_installed" || availability === "update_required") {
      await openHealthConnectInstall();
      return;
    }
    setConnecting(true);
    try {
      await connectSteps();
      await syncStepsBackgroundWork();
      await refresh();
    } catch (error) {
      console.warn("[health] connect failed", error);
    } finally {
      if (mounted.current) setConnecting(false);
    }
  }, [availability, refresh]);

  return { availability, connected, steps, connecting, connect, refresh };
};
