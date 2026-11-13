import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import type { HealthMetricType } from "../lib/healthChallenge";
import {
  connectMetric,
  getHealthAvailability,
  openHealthConnectInstall,
  type HealthAvailability,
} from "./healthMetrics";
import { readTodayValue, runHealthAutoCheckins } from "./healthAutoCheckin";
import { invalidateHealthCheckinQueries } from "./HealthChallengeSync";
import { syncHealthBackgroundWork } from "./healthBackgroundTask";

type Options = {
  metric?: HealthMetricType | null;
  challengeId?: string;
  userId?: string;
  /** Only read Health for health challenges the user joined and that are running today. */
  enabled: boolean;
};

/** Estado de Salud para el detalle de un desafío de Salud (cualquier métrica). */
export const useHealthChallenge = ({ metric, challengeId, userId, enabled }: Options) => {
  const queryClient = useQueryClient();
  const [availability, setAvailability] = useState<HealthAvailability | null>(null);
  const [connected, setConnected] = useState(false);
  const [value, setValue] = useState<number | null>(null);
  const [vibesMinutes, setVibesMinutes] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const active = Boolean(enabled && metric && userId);

  const refresh = useCallback(async () => {
    if (!active || !metric || !userId) return;
    const nextAvailability = await getHealthAvailability(metric);
    const today = await readTodayValue(metric, userId);
    const nextConnected = nextAvailability === "available" && today.connected;
    if (!mounted.current) return;
    setAvailability(nextAvailability);
    setConnected(nextConnected);
    setValue(today.value);
    setVibesMinutes(today.vibes);
    if (!nextConnected && metric !== "mindful_minutes") return;
    // In the foreground the screen already celebrates, so no notification here.
    const result = await runHealthAutoCheckins({ notify: false });
    if (challengeId && result.checkedIn.includes(challengeId)) invalidateHealthCheckinQueries(queryClient);
  }, [active, challengeId, metric, queryClient, userId]);

  useEffect(() => {
    if (!active) return;
    void refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => subscription.remove();
  }, [active, refresh]);

  const connect = useCallback(async () => {
    if (!metric) return;
    if (availability === "not_installed" || availability === "update_required") {
      await openHealthConnectInstall();
      return;
    }
    setConnecting(true);
    try {
      await connectMetric(metric);
      await syncHealthBackgroundWork();
      await refresh();
    } catch (error) {
      console.warn("[health] connect failed", error);
    } finally {
      if (mounted.current) setConnecting(false);
    }
  }, [availability, metric, refresh]);

  return { availability, connected, value, vibesMinutes, connecting, connect, refresh };
};
