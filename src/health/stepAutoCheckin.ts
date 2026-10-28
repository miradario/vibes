// Marca solo el día de los desafíos de pasos cuando se llega a la meta.
// Corre en primer plano (al abrir la app, al volver a ella y en el detalle del
// desafío) y en segundo plano (tarea periódica / HealthKit). Al servidor solo
// llega "cumplió el día" vía la RPC record_health_checkin; los pasos no salen
// del celular.
import * as Notifications from "expo-notifications";
import { supabase } from "../lib/supabase";
import { localDayKey } from "../lib/challengeProgress";
import { mapChallengeRow } from "../queries/events.queries";
import {
  isStepChallenge,
  selectAutoCheckins,
  stepGoalNotification,
  type StepChallengeCandidate,
} from "../lib/stepChallenge";
import { isStepsConnected, readTodaySteps } from "./healthSteps";

export const HEALTH_CHECKIN_NOTIFICATION_TYPE = "challenge_health_checkin";

export type StepAutoCheckinResult = {
  steps: number | null;
  checkedIn: string[];
  candidates: number;
};

const EMPTY: StepAutoCheckinResult = { steps: null, checkedIn: [], candidates: 0 };

export const fetchStepChallengeCandidates = async (
  userId: string,
  today = localDayKey()
): Promise<StepChallengeCandidate[]> => {
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
    .filter(isStepChallenge)
    .map((item) => ({
      challengeId: item.id,
      title: item.title,
      dailyGoal: item.dailyGoal,
      startsAt: item.startsAt ?? null,
      durationDays: item.durationDays ?? null,
      checkedInToday: doneToday.has(item.id),
    }));
};

const notifyGoalReached = async (candidate: StepChallengeCandidate) => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    await Notifications.scheduleNotificationAsync({
      content: {
        ...stepGoalNotification(candidate),
        data: { type: HEALTH_CHECKIN_NOTIFICATION_TYPE, eventId: candidate.challengeId },
      },
      trigger: null,
    });
  } catch (error) {
    console.warn("[health] could not show goal notification", error);
  }
};

let running: Promise<StepAutoCheckinResult> | null = null;

/** Lee los pasos de hoy y marca los desafíos que llegaron a la meta. Nunca tira error. */
export const runStepAutoCheckins = (options: { notify?: boolean } = {}) => {
  running ??= (async (): Promise<StepAutoCheckinResult> => {
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) return EMPTY;
      if (!(await isStepsConnected())) return EMPTY;

      const today = localDayKey();
      const candidates = await fetchStepChallengeCandidates(userId, today);
      if (!candidates.length) return EMPTY;

      const steps = await readTodaySteps();
      const due = selectAutoCheckins(candidates, steps);
      const checkedIn: string[] = [];
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
      return { steps, checkedIn, candidates: candidates.length };
    } catch (error) {
      console.warn("[health] auto check-in run failed", error);
      return EMPTY;
    } finally {
      running = null;
    }
  })();
  return running;
};

/** True if the user is in at least one step challenge (used to schedule background work). */
export const hasActiveStepChallenge = async () => {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return false;
    return (await fetchStepChallengeCandidates(userId)).length > 0;
  } catch {
    return false;
  }
};
