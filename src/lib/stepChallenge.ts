// Desafíos conectados a Salud. Solo pasos por ahora; el tipo queda abierto
// para sumar sueño u otras métricas más adelante.
import { getChallengeDay } from "./challengeProgress";

export type ChallengeMetricType = "none" | "steps";

export type ChallengeMetric = {
  metricType: ChallengeMetricType;
  dailyGoal: number | null;
};

const SUPPORTED_METRICS: ChallengeMetricType[] = ["steps"];

export const parseChallengeMetric = (row: {
  metric_type?: unknown;
  daily_goal?: unknown;
} | null | undefined): ChallengeMetric => {
  const type = row?.metric_type;
  const goal = Number(row?.daily_goal);
  if (
    typeof type === "string" &&
    (SUPPORTED_METRICS as string[]).includes(type) &&
    Number.isInteger(goal) &&
    goal > 0
  ) {
    return { metricType: type as ChallengeMetricType, dailyGoal: goal };
  }
  return { metricType: "none", dailyGoal: null };
};

export const isStepChallenge = <
  T extends { metricType?: ChallengeMetricType | null; dailyGoal?: number | null },
>(
  item: T | null | undefined
): item is T & { metricType: "steps"; dailyGoal: number } =>
  item?.metricType === "steps" && typeof item.dailyGoal === "number" && item.dailyGoal > 0;

export const formatStepCount = (value: number) =>
  String(Math.max(0, Math.floor(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const getStepProgress = (steps: number | null | undefined, goal: number) => {
  const safeSteps = Number.isFinite(steps) ? Math.max(0, Math.floor(steps as number)) : 0;
  const safeGoal = Math.max(1, Math.floor(goal));
  return {
    steps: safeSteps,
    goal: safeGoal,
    ratio: Math.min(1, safeSteps / safeGoal),
    reached: safeSteps >= safeGoal,
    label: `${formatStepCount(safeSteps)} / ${formatStepCount(safeGoal)} pasos`,
  };
};

/** True while today is one of the challenge's days (not upcoming, not finished). */
export const isChallengeDayOpen = (
  startsAt: string | null | undefined,
  durationDays: number | null | undefined,
  now = new Date()
) => {
  if (!startsAt) return false;
  const day = getChallengeDay(startsAt, now);
  const total = Math.max(1, Math.floor(Number(durationDays) || 1));
  return day >= 1 && day <= total;
};

export type StepChallengeCandidate = {
  challengeId: string;
  title: string;
  dailyGoal: number;
  startsAt: string | null;
  durationDays: number | null;
  checkedInToday: boolean;
};

/**
 * Which challenges should be checked in automatically with today's steps.
 * Already-completed days (manual or automatic) and challenges outside their
 * dates are skipped, so nothing is ever marked twice.
 */
export const selectAutoCheckins = (
  candidates: StepChallengeCandidate[],
  stepsToday: number | null | undefined,
  now = new Date()
) => {
  if (!Number.isFinite(stepsToday)) return [];
  return candidates.filter(
    (candidate) =>
      !candidate.checkedInToday &&
      candidate.dailyGoal > 0 &&
      isChallengeDayOpen(candidate.startsAt, candidate.durationDays, now) &&
      getStepProgress(stepsToday, candidate.dailyGoal).reached
  );
};

export const stepGoalNotification = (candidate: Pick<StepChallengeCandidate, "title" | "dailyGoal">) => ({
  title: "¡Llegaste a tu meta de pasos!",
  body: `Hiciste ${formatStepCount(candidate.dailyGoal)} pasos y marcamos el día en “${candidate.title}”.`,
});
