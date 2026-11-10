// Marca solo el día de los desafíos de Salud cuando se llega a la meta
// (pasos, mindfulness, sueño, ejercicio o distancia). Corre en primer plano (al
// abrir la app, al volver a ella, en el detalle del desafío y al registrar una
// meditación en Vibes) y en segundo plano (tarea periódica / HealthKit). Al
// servidor solo llega "cumplió el día" vía la RPC record_health_checkin; los
// datos de salud no salen del celular.
import * as Notifications from "expo-notifications";
import { supabase } from "../lib/supabase";
import { localDayKey } from "../lib/challengeProgress";
import { mapChallengeRow } from "../queries/events.queries";
import {
  healthGoalNotification,
  isHealthChallenge,
  selectAutoCheckins,
  type HealthChallengeCandidate,
  type HealthMetricType,
} from "../lib/healthChallenge";
import { isMetricConnected, readTodayMetric } from "./healthMetrics";

export const HEALTH_CHECKIN_NOTIFICATION_TYPE = "challenge_health_checkin";

export type HealthAutoCheckinResult = {
  /** Valor de hoy por métrica (null si no se pudo leer o no está conectada). */
  values: Partial<Record<HealthMetricType, number | null>>;
  checkedIn: string[];
  candidates: number;
};

const EMPTY: HealthAutoCheckinResult = { values: {}, checkedIn: [], candidates: 0 };

export const fetchHealthChallengeCandidates = async (
  userId: string,
  today = localDayKey()
): Promise<HealthChallengeCandidate[]> => {
  const { data: participations, error } = await supabase
    .from("challenge_participants")
    .select("challenge_id")
    .eq("user_id", userId);
  if (error) throw error;
  const ids = (participations ?? []).map((row: any) => String(row.challenge_id));
  if (!ids.length) return [];

  const [{ data: rows, error: challengesError }, { data: checkins, error: checkinsError }] =
    await Promise.all([
      supabase.from("challenges").select("*").in("id", ids),
      supabase
        .from("challenge_checkins")
        .select("challenge_id")
        .eq("user_id", userId)
        .eq("checkin_date", today)
        .in("challenge_id", ids),
    ]);
  if (challengesError) throw challengesError;
  if (checkinsError) throw checkinsError;
  const doneToday = new Set((checkins ?? []).map((row: any) => String(row.challenge_id)));

  return (rows ?? [])
    .map(mapChallengeRow)
    .filter(isHealthChallenge)
    .map((item) => ({
      challengeId: item.id,
      title: item.title,
      metricType: item.metricType,
      dailyGoal: item.dailyGoal,
      startsAt: item.startsAt ?? null,
      durationDays: item.durationDays ?? null,
      checkedInToday: doneToday.has(item.id),
    }));
};

/**
 * Minutos de meditación registrados hoy en Vibes (meditation_presence). Se usa
 * el created_at porque presence_date es el día UTC del servidor.
 */
export const fetchVibesMeditationMinutes = async (userId: string, now = new Date()) => {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const { data, error } = await supabase
    .from("meditation_presence")
    .select("duration_minutes")
    .eq("user_id", userId)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());
  if (error) throw error;
  return (data ?? []).reduce((sum: number, row: any) => sum + (Number(row.duration_minutes) || 0), 0);
};

/**
 * Valor de hoy para una métrica. Mindfulness suma Salud (si está conectada) y
 * las meditaciones registradas en Vibes, así funciona aun sin Salud.
 */
export const readTodayValue = async (metric: HealthMetricType, userId: string) => {
  const connected = await isMetricConnected(metric);
  const health = connected ? await readTodayMetric(metric) : null;
  if (metric !== "mindful_minutes") return { connected, health, vibes: 0, value: health };
  let vibes = 0;
  try {
    vibes = await fetchVibesMeditationMinutes(userId);
  } catch (error) {
    console.warn("[health] could not read Vibes meditations", error);
  }
  return { connected, health, vibes, value: (health ?? 0) + vibes };
};

const notifyGoalReached = async (candidate: HealthChallengeCandidate) => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    await Notifications.scheduleNotificationAsync({
      content: {
        ...healthGoalNotification(candidate),
        data: { type: HEALTH_CHECKIN_NOTIFICATION_TYPE, eventId: candidate.challengeId },
      },
      trigger: null,
    });
  } catch (error) {
    console.warn("[health] could not show goal notification", error);
  }
};

let running: Promise<HealthAutoCheckinResult> | null = null;

/** Lee el valor de hoy de cada métrica y marca los desafíos que llegaron a la meta. Nunca tira error. */
export const runHealthAutoCheckins = (options: { notify?: boolean } = {}) => {
  running ??= (async (): Promise<HealthAutoCheckinResult> => {
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) return EMPTY;

      const today = localDayKey();
      const candidates = await fetchHealthChallengeCandidates(userId, today);
      const pending = candidates.filter((candidate) => !candidate.checkedInToday);
      if (!pending.length) return { ...EMPTY, candidates: candidates.length };

      const metrics = [...new Set(pending.map((candidate) => candidate.metricType))];
      const values: HealthAutoCheckinResult["values"] = {};
      const checkedIn: string[] = [];
      for (const metric of metrics) {
        const { value } = await readTodayValue(metric, userId);
        values[metric] = value;
        const due = selectAutoCheckins(pending, value, new Date(), metric);
        for (const candidate of due) {
          const { data: created, error } = await supabase.rpc("record_health_checkin", {
            target_challenge: candidate.challengeId,
            target_date: today,
          });
          if (error) {
            console.warn("[health] auto check-in failed", error.message);
            continue;
          }
          // false = the day was already marked (manually or by another run).
          if (created === true) {
            checkedIn.push(candidate.challengeId);
            if (options.notify !== false) await notifyGoalReached(candidate);
          }
        }
      }
      return { values, checkedIn, candidates: candidates.length };
    } catch (error) {
      console.warn("[health] auto check-in run failed", error);
      return EMPTY;
    } finally {
      running = null;
    }
  })();
  return running;
};

/** Métricas de los desafíos de Salud en los que participa el usuario (para el trabajo en segundo plano). */
export const getActiveHealthMetrics = async (): Promise<HealthMetricType[]> => {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return [];
    const candidates = await fetchHealthChallengeCandidates(userId);
    return [...new Set(candidates.map((candidate) => candidate.metricType))];
  } catch {
    return [];
  }
};
