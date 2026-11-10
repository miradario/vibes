// Lectura de métricas de Salud del día desde Apple Salud (HealthKit) o Health
// Connect: pasos, mindfulness, sueño, ejercicio y distancia. Los datos se leen
// en el celular y nunca se suben al servidor.
import { Linking, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getMetricWindow,
  sumIntervalMinutes,
  type HealthMetricType,
} from "../lib/healthChallenge";

export type HealthAvailability =
  | "available"
  | "not_installed" // Android 13 o menor sin la app Health Connect
  | "update_required"
  | "unsupported"; // web, iPad sin Salud, o métrica no soportada (mindfulness en Android viejo)

const HEALTH_CONNECT_PACKAGE = "com.google.android.apps.healthdata";
export const HEALTH_CONNECT_PLAY_URL = `https://play.google.com/store/apps/details?id=${HEALTH_CONNECT_PACKAGE}`;
const HEALTH_CONNECT_MARKET_URL = `market://details?id=${HEALTH_CONNECT_PACKAGE}&url=healthconnect%3A%2F%2Fonboarding`;

export const healthSourceName = Platform.OS === "ios" ? "Apple Salud" : "Health Connect";

/* ---------- Tipos nativos por métrica ---------- */

const IOS_TYPES = {
  steps: "HKQuantityTypeIdentifierStepCount",
  mindful_minutes: "HKCategoryTypeIdentifierMindfulSession",
  sleep_minutes: "HKCategoryTypeIdentifierSleepAnalysis",
  exercise_minutes: "HKQuantityTypeIdentifierAppleExerciseTime",
  distance_meters: "HKQuantityTypeIdentifierDistanceWalkingRunning",
} as const satisfies Record<HealthMetricType, string>;

const ANDROID_RECORDS = {
  steps: "Steps",
  mindful_minutes: "MindfulnessSession",
  sleep_minutes: "SleepSession",
  exercise_minutes: "ExerciseSession",
  distance_meters: "Distance",
} as const satisfies Record<HealthMetricType, string>;

// HKCategoryValueSleepAnalysis: 1 asleepUnspecified, 3 core, 4 deep, 5 REM.
// 0 inBed y 2 awake no cuentan como sueño.
const IOS_ASLEEP_VALUES = new Set([1, 3, 4, 5]);

/** Pasos conserva su clave original para no pedir reconexión a quien ya conectó. */
const connectedKey = (metric: HealthMetricType) =>
  metric === "steps" ? "vibes.health.steps.connected" : `vibes.health.${metric}.connected`;

// Native modules are loaded lazily so each platform only touches its own SDK.
const healthKit = () =>
  require("@kingstinct/react-native-healthkit") as typeof import("@kingstinct/react-native-healthkit");
const healthConnect = () =>
  require("react-native-health-connect") as typeof import("react-native-health-connect");

let healthConnectReady: Promise<boolean> | null = null;
const ensureHealthConnect = () => {
  healthConnectReady ??= healthConnect().initialize().catch(() => {
    healthConnectReady = null;
    return false;
  });
  return healthConnectReady;
};

/* ---------- Mindfulness en Android ---------- */

// MindfulnessSession depende de la versión de Health Connect (Android 14+ con
// la actualización del sistema). react-native-health-connect 4.1.3 no expone
// getFeatureStatus, así que: Android < 14 → no soportado; en 14+ una lectura
// mínima que falla con SDK_VERSION_ERROR / INVALID_RECORD_TYPE → no soportado.
// PERMISSION_ERROR significa que existe pero todavía no hay permiso.
const ANDROID_MINDFULNESS_MIN_API = 34;
let androidMindfulnessSupport: Promise<boolean> | null = null;

const errorCode = (error: unknown) =>
  String((error as { code?: unknown } | null)?.code ?? (error as Error | null)?.message ?? "");

const probeAndroidMindfulness = async () => {
  if (Platform.OS !== "android" || Number(Platform.Version) < ANDROID_MINDFULNESS_MIN_API) return false;
  if (!(await ensureHealthConnect())) return false;
  const now = new Date();
  try {
    await healthConnect().readRecords("MindfulnessSession", {
      timeRangeFilter: {
        operator: "between",
        startTime: new Date(now.getTime() - 60_000).toISOString(),
        endTime: now.toISOString(),
      },
      pageSize: 1,
    });
    return true;
  } catch (error) {
    const code = errorCode(error);
    if (/PERMISSION|SecurityException/i.test(code)) return true;
    if (/SDK_VERSION|INVALID_RECORD_TYPE|Unsupported|not available/i.test(code)) return false;
    // Errores transitorios: no cachear, probar de nuevo la próxima vez.
    androidMindfulnessSupport = null;
    return false;
  }
};

export const isAndroidMindfulnessSupported = () => {
  androidMindfulnessSupport ??= probeAndroidMindfulness();
  return androidMindfulnessSupport;
};

/* ---------- Disponibilidad y permisos ---------- */

export const getHealthAvailability = async (
  metric: HealthMetricType = "steps"
): Promise<HealthAvailability> => {
  try {
    if (Platform.OS === "ios") {
      return (await healthKit().isHealthDataAvailableAsync()) ? "available" : "unsupported";
    }
    if (Platform.OS === "android") {
      const { getSdkStatus, SdkAvailabilityStatus } = healthConnect();
      const status = await getSdkStatus();
      if (status === SdkAvailabilityStatus.SDK_AVAILABLE) {
        if (metric === "mindful_minutes" && !(await isAndroidMindfulnessSupported())) return "unsupported";
        return "available";
      }
      // Sin Health Connect instalado no se puede saber si va a soportar
      // mindfulness: en Android < 14 nunca lo soporta, así que no ofrecemos instalarlo.
      if (metric === "mindful_minutes" && Number(Platform.Version) < ANDROID_MINDFULNESS_MIN_API) {
        return "unsupported";
      }
      if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return "update_required";
      return "not_installed";
    }
  } catch (error) {
    console.warn("[health] availability check failed", error);
  }
  return "unsupported";
};

/** Abre Play Store para instalar o actualizar Health Connect (Android 13 o menor). */
export const openHealthConnectInstall = async () => {
  try {
    await Linking.openURL(HEALTH_CONNECT_MARKET_URL);
  } catch {
    await Linking.openURL(HEALTH_CONNECT_PLAY_URL);
  }
};

const androidGranted = async () => {
  if (!(await ensureHealthConnect())) return [] as { recordType: string; accessType: string }[];
  return (await healthConnect().getGrantedPermissions()) as unknown as {
    recordType: string;
    accessType: string;
  }[];
};

const androidHasPermissions = async (metric: HealthMetricType) => {
  const granted = await androidGranted();
  return {
    metric: granted.some((p) => p.recordType === ANDROID_RECORDS[metric] && p.accessType === "read"),
    background: granted.some((p) => p.recordType === "BackgroundAccessPermission"),
  };
};

/** Whether the user already connected Health for this metric on this device. */
export const isMetricConnected = async (metric: HealthMetricType) => {
  try {
    if (Platform.OS === "android") {
      if ((await getHealthAvailability(metric)) !== "available") return false;
      return (await androidHasPermissions(metric)).metric;
    }
    if (Platform.OS === "ios") {
      // HealthKit never reveals whether read access was granted; we remember
      // that the user went through the prompt and treat missing data as 0.
      if ((await AsyncStorage.getItem(connectedKey(metric))) !== "1") return false;
      const status = await healthKit().getRequestStatusForAuthorization({ toRead: [IOS_TYPES[metric]] });
      return status === healthKit().AuthorizationRequestStatus.unnecessary;
    }
  } catch (error) {
    console.warn("[health] permission check failed", error);
  }
  return false;
};

/** Pide solo lectura de la métrica (y lectura en segundo plano en Android). */
export const connectMetric = async (metric: HealthMetricType) => {
  if (Platform.OS === "ios") {
    await healthKit().requestAuthorization({ toRead: [IOS_TYPES[metric]] });
    await AsyncStorage.setItem(connectedKey(metric), "1");
    return isMetricConnected(metric);
  }
  if (Platform.OS === "android") {
    if (!(await ensureHealthConnect())) return false;
    if (metric === "mindful_minutes" && !(await isAndroidMindfulnessSupported())) return false;
    await healthConnect().requestPermission([
      { accessType: "read", recordType: ANDROID_RECORDS[metric] },
      { accessType: "read", recordType: "BackgroundAccessPermission" },
    ] as Parameters<ReturnType<typeof healthConnect>["requestPermission"]>[0]);
    return (await androidHasPermissions(metric)).metric;
  }
  return false;
};

/** Background access: Android pide un permiso aparte; en iOS alcanza con haber conectado. */
export const hasBackgroundHealthAccess = async (metrics: readonly HealthMetricType[]) => {
  if (!metrics.length) return false;
  if (Platform.OS === "ios") {
    for (const metric of metrics) if (await isMetricConnected(metric)) return true;
    return false;
  }
  if (Platform.OS === "android") {
    try {
      const granted = await androidGranted();
      const background = granted.some((p) => p.recordType === "BackgroundAccessPermission");
      return (
        background &&
        metrics.some((metric) =>
          granted.some((p) => p.recordType === ANDROID_RECORDS[metric] && p.accessType === "read")
        )
      );
    } catch {
      return false;
    }
  }
  return false;
};

/* ---------- Lectura ---------- */

const iosQuantitySum = async (metric: "steps" | "exercise_minutes" | "distance_meters", start: Date, end: Date) => {
  const unit = metric === "steps" ? "count" : metric === "exercise_minutes" ? "min" : "m";
  const result = await healthKit().queryStatisticsForQuantity(IOS_TYPES[metric], ["cumulativeSum"], {
    filter: { date: { startDate: start, endDate: end } },
    unit,
  });
  return Math.round(result.sumQuantity?.quantity ?? 0);
};

const iosCategoryMinutes = async (metric: "mindful_minutes" | "sleep_minutes", start: Date, end: Date) => {
  const samples = await healthKit().queryCategorySamples(IOS_TYPES[metric], {
    filter: { date: { startDate: start, endDate: end } },
    limit: 0,
  });
  const intervals = samples
    .filter((sample) => metric !== "sleep_minutes" || IOS_ASLEEP_VALUES.has(Number(sample.value)))
    .map((sample) => ({ start: sample.startDate, end: sample.endDate }));
  return sumIntervalMinutes(intervals, start, end);
};

const androidRange = (start: Date, end: Date) => ({
  operator: "between" as const,
  startTime: start.toISOString(),
  endTime: end.toISOString(),
});

const androidRead = async (metric: HealthMetricType, start: Date, end: Date) => {
  const hc = healthConnect();
  const timeRangeFilter = androidRange(start, end);
  switch (metric) {
    case "steps": {
      const result = await hc.aggregateRecord({ recordType: "Steps", timeRangeFilter });
      return Math.round(result.COUNT_TOTAL ?? 0);
    }
    case "distance_meters": {
      const result = await hc.aggregateRecord({ recordType: "Distance", timeRangeFilter });
      return Math.round(result.DISTANCE?.inMeters ?? 0);
    }
    case "exercise_minutes": {
      const result = await hc.aggregateRecord({ recordType: "ExerciseSession", timeRangeFilter });
      return Math.floor((result.EXERCISE_DURATION_TOTAL?.inSeconds ?? 0) / 60);
    }
    case "sleep_minutes": {
      // SLEEP_DURATION_TOTAL existe en el módulo nativo pero falta en los tipos de la librería.
      const result = (await hc.aggregateRecord({
        recordType: "SleepSession",
        timeRangeFilter,
      } as Parameters<typeof hc.aggregateRecord>[0])) as unknown as { SLEEP_DURATION_TOTAL?: number };
      return Math.floor((result.SLEEP_DURATION_TOTAL ?? 0) / 60);
    }
    case "mindful_minutes": {
      // La librería no agrega MindfulnessSession: leemos las sesiones y unimos solapamientos.
      const intervals: { start: string; end: string }[] = [];
      let pageToken: string | undefined;
      do {
        const page = await hc.readRecords("MindfulnessSession", { timeRangeFilter, pageToken });
        for (const record of page.records) intervals.push({ start: record.startTime, end: record.endTime });
        pageToken = page.pageToken || undefined;
      } while (pageToken);
      return sumIntervalMinutes(intervals, start, end);
    }
  }
};

/**
 * Valor de hoy (día local del celular) para la métrica, en su unidad:
 * pasos, minutos o metros. null si no se pudo leer.
 */
export const readTodayMetric = async (
  metric: HealthMetricType,
  now = new Date()
): Promise<number | null> => {
  const { start, end } = getMetricWindow(metric, now);
  try {
    if (Platform.OS === "ios") {
      if (metric === "mindful_minutes" || metric === "sleep_minutes") return await iosCategoryMinutes(metric, start, end);
      return await iosQuantitySum(metric, start, end);
    }
    if (Platform.OS === "android") {
      if (!(await ensureHealthConnect())) return null;
      if (metric === "mindful_minutes" && !(await isAndroidMindfulnessSupported())) return null;
      return await androidRead(metric, start, end);
    }
  } catch (error) {
    console.warn(`[health] could not read ${metric}`, error);
  }
  return null;
};

/* ---------- iOS en segundo plano ---------- */

/** iOS: HealthKit despierta la app cuando hay datos nuevos (best effort). */
export const enableIosBackgroundDelivery = async (metrics: readonly HealthMetricType[]) => {
  if (Platform.OS !== "ios" || !metrics.length) return false;
  try {
    const hk = healthKit();
    return await hk.configureBackgroundTypes(
      metrics.map((metric) => IOS_TYPES[metric]),
      hk.UpdateFrequency.hourly
    );
  } catch (error) {
    console.warn("[health] background delivery unavailable", error);
    return false;
  }
};

export const subscribeToIosMetricChanges = (metric: HealthMetricType, onChange: () => void) => {
  if (Platform.OS !== "ios") return () => {};
  try {
    const subscription = healthKit().subscribeToChanges(IOS_TYPES[metric], () => onChange());
    return () => subscription.remove();
  } catch (error) {
    console.warn(`[health] could not observe ${metric}`, error);
    return () => {};
  }
};

/** Métricas que el usuario conectó en este dispositivo. */
export const getConnectedMetrics = async (metrics: readonly HealthMetricType[]) => {
  const connected: HealthMetricType[] = [];
  for (const metric of metrics) if (await isMetricConnected(metric)) connected.push(metric);
  return connected;
};
