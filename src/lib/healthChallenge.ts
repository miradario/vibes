// Desafíos conectados a Salud (Apple Salud / Health Connect). Lógica pura:
// tipos de métrica, unidades, formato, ventana del día y selección de los
// días a marcar. La lectura de datos vive en src/health/healthMetrics.ts.
import { getChallengeDay } from "./challengeProgress";

/** Métricas de Salud. `daily_goal` es un entero en la unidad de cada una. */
export type HealthMetricType =
  | "steps" // pasos
  | "mindful_minutes" // minutos de mindfulness / meditación
  | "sleep_minutes" // minutos dormidos (se atribuyen al día en que te despertás)
  | "exercise_minutes" // minutos de ejercicio / movimiento
  | "distance_meters"; // metros caminados o corridos (en Android puede incluir bici)

export type ChallengeMetricType = "none" | HealthMetricType;

export type ChallengeMetric = {
  metricType: ChallengeMetricType;
  dailyGoal: number | null;
};

export const HEALTH_METRICS: readonly HealthMetricType[] = [
  "steps",
  "mindful_minutes",
  "sleep_minutes",
  "exercise_minutes",
  "distance_meters",
];

export const isHealthMetric = (value: unknown): value is HealthMetricType =>
  typeof value === "string" && (HEALTH_METRICS as readonly string[]).includes(value);

export const parseChallengeMetric = (row: {
  metric_type?: unknown;
  daily_goal?: unknown;
} | null | undefined): ChallengeMetric => {
  const type = row?.metric_type;
  const goal = Number(row?.daily_goal);
  if (isHealthMetric(type) && Number.isInteger(goal) && goal > 0) {
    return { metricType: type, dailyGoal: goal };
  }
  return { metricType: "none", dailyGoal: null };
};

type MetricCarrier = { metricType?: ChallengeMetricType | null; dailyGoal?: number | null };

export const isHealthChallenge = <T extends MetricCarrier>(
  item: T | null | undefined
): item is T & { metricType: HealthMetricType; dailyGoal: number } =>
  isHealthMetric(item?.metricType) && typeof item?.dailyGoal === "number" && item.dailyGoal > 0;

export const isStepChallenge = <T extends MetricCarrier>(
  item: T | null | undefined
): item is T & { metricType: "steps"; dailyGoal: number } =>
  isHealthChallenge(item) && item.metricType === "steps";

/* ---------- Formato ---------- */

const thousands = (value: number) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const formatStepCount = (value: number) => thousands(Math.max(0, Math.floor(value)));

/** 45 → "45 min", 60 → "1 h", 390 → "6 h 30 min". */
export const formatMinutes = (value: number) => {
  const total = Math.max(0, Math.floor(value));
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
};

/** 2000 → "2 km", 1450 → "1,4 km" (redondea hacia abajo para no anticipar la meta). */
export const formatKilometers = (meters: number) => {
  const tenths = Math.floor(Math.max(0, meters) / 100);
  const whole = Math.floor(tenths / 10);
  const decimal = tenths % 10;
  return decimal ? `${thousands(whole)},${decimal} km` : `${thousands(whole)} km`;
};

export const formatMetricValue = (metric: HealthMetricType, value: number) => {
  switch (metric) {
    case "steps":
      return `${formatStepCount(value)} pasos`;
    case "distance_meters":
      return formatKilometers(value);
    default:
      return formatMinutes(value);
  }
};

/** Texto de la meta diaria, p. ej. "10 min de meditación" o "moverte 2 km". */
export const formatMetricGoal = (metric: HealthMetricType, goal: number) => {
  switch (metric) {
    case "steps":
      return `${formatStepCount(goal)} pasos`;
    case "mindful_minutes":
      return `${formatMinutes(goal)} de meditación`;
    case "sleep_minutes":
      return `${formatMinutes(goal)} de sueño`;
    case "exercise_minutes":
      return `${formatMinutes(goal)} de movimiento`;
    case "distance_meters":
      return `moverte ${formatKilometers(goal)}`;
  }
};

export const getMetricProgress = (
  metric: HealthMetricType,
  value: number | null | undefined,
  goal: number
) => {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.floor(value as number)) : 0;
  const safeGoal = Math.max(1, Math.floor(goal));
  const label =
    metric === "steps"
      ? `${formatStepCount(safeValue)} / ${formatStepCount(safeGoal)} pasos`
      : `${formatMetricValue(metric, safeValue)} / ${formatMetricValue(metric, safeGoal)}`;
  return {
    value: safeValue,
    goal: safeGoal,
    ratio: Math.min(1, safeValue / safeGoal),
    reached: safeValue >= safeGoal,
    remaining: Math.max(0, safeGoal - safeValue),
    label,
  };
};

/* ---------- Ventana del día ---------- */

/** Hora local en la que arranca la "noche" que se atribuye al día siguiente. */
export const SLEEP_WINDOW_START_HOUR = 18;

/**
 * Rango que cuenta para el día local de `now`.
 *  - Sueño: de las 18 h del día anterior a las 18 h de hoy (o ahora, si es antes),
 *    así la noche se atribuye al día en que te despertás.
 *  - El resto: desde las 0 h de hoy hasta ahora.
 */
export const getMetricWindow = (metric: HealthMetricType, now = new Date()) => {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  if (metric === "sleep_minutes") {
    const start = new Date(y, m, d - 1, SLEEP_WINDOW_START_HOUR);
    const cutoff = new Date(y, m, d, SLEEP_WINDOW_START_HOUR);
    return { start, end: now < cutoff ? now : cutoff };
  }
  return { start: new Date(y, m, d), end: now };
};

export type TimeInterval = { start: Date | string | number; end: Date | string | number };

/**
 * Minutos cubiertos por la unión de intervalos dentro de [windowStart, windowEnd].
 * Une solapamientos (p. ej. reloj y celular registrando la misma sesión) para no
 * contar dos veces el mismo tiempo.
 */
export const sumIntervalMinutes = (
  intervals: readonly TimeInterval[],
  windowStart: Date,
  windowEnd: Date
) => {
  const from = windowStart.getTime();
  const to = windowEnd.getTime();
  const clipped = intervals
    .map((item) => [new Date(item.start).getTime(), new Date(item.end).getTime()] as const)
    .filter(([s, e]) => Number.isFinite(s) && Number.isFinite(e) && e > s)
    .map(([s, e]) => [Math.max(s, from), Math.min(e, to)] as const)
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);
  let totalMs = 0;
  let curStart = -1;
  let curEnd = -1;
  for (const [s, e] of clipped) {
    if (s > curEnd) {
      if (curEnd > curStart) totalMs += curEnd - curStart;
      curStart = s;
      curEnd = e;
    } else if (e > curEnd) {
      curEnd = e;
    }
  }
  if (curEnd > curStart) totalMs += curEnd - curStart;
  return Math.floor(totalMs / 60_000);
};

/* ---------- Selección de check-ins ---------- */

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

export type HealthChallengeCandidate = {
  challengeId: string;
  title: string;
  metricType: HealthMetricType;
  dailyGoal: number;
  startsAt: string | null;
  durationDays: number | null;
  checkedInToday: boolean;
};

/**
 * Qué desafíos marcar solos con el valor de hoy de una métrica. Los días ya
 * marcados (a mano o solos) y los desafíos fuera de fecha se saltean, así nada
 * se marca dos veces. Con `metric`, solo se miran los desafíos de esa métrica.
 */
export const selectAutoCheckins = (
  candidates: HealthChallengeCandidate[],
  valueToday: number | null | undefined,
  now = new Date(),
  metric?: HealthMetricType
) => {
  if (!Number.isFinite(valueToday)) return [];
  return candidates.filter(
    (candidate) =>
      (!metric || candidate.metricType === metric) &&
      !candidate.checkedInToday &&
      candidate.dailyGoal > 0 &&
      isChallengeDayOpen(candidate.startsAt, candidate.durationDays, now) &&
      getMetricProgress(candidate.metricType, valueToday, candidate.dailyGoal).reached
  );
};

const NOTIFICATION_COPY: Record<HealthMetricType, { title: string; verb: string }> = {
  steps: { title: "¡Llegaste a tu meta de pasos!", verb: "Hiciste" },
  mindful_minutes: { title: "¡Llegaste a tu meta de meditación!", verb: "Meditaste" },
  sleep_minutes: { title: "¡Llegaste a tu meta de sueño!", verb: "Dormiste" },
  exercise_minutes: { title: "¡Llegaste a tu meta de movimiento!", verb: "Te moviste" },
  distance_meters: { title: "¡Llegaste a tu meta de distancia!", verb: "Te moviste" },
};

export const healthGoalNotification = (
  candidate: Pick<HealthChallengeCandidate, "title" | "dailyGoal"> & { metricType?: HealthMetricType }
) => {
  const metric = candidate.metricType ?? "steps";
  const copy = NOTIFICATION_COPY[metric];
  return {
    title: copy.title,
    body: `${copy.verb} ${formatMetricValue(metric, candidate.dailyGoal)} y marcamos el día en “${candidate.title}”.`,
  };
};
