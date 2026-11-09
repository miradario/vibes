// Lectura de pasos del día desde Apple Salud (HealthKit) o Health Connect.
// Los pasos se leen en el celular y nunca se suben al servidor.
import { Linking, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type HealthAvailability =
  | "available"
  | "not_installed" // Android 13 o menor sin la app Health Connect
  | "update_required"
  | "unsupported"; // web, iPad sin Salud, etc.

const CONNECTED_KEY = "vibes.health.steps.connected";
const IOS_STEPS = "HKQuantityTypeIdentifierStepCount" as const;
const HEALTH_CONNECT_PACKAGE = "com.google.android.apps.healthdata";
export const HEALTH_CONNECT_PLAY_URL = `https://play.google.com/store/apps/details?id=${HEALTH_CONNECT_PACKAGE}`;
const HEALTH_CONNECT_MARKET_URL = `market://details?id=${HEALTH_CONNECT_PACKAGE}&url=healthconnect%3A%2F%2Fonboarding`;

export const healthSourceName = Platform.OS === "ios" ? "Apple Salud" : "Health Connect";

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

export const getHealthAvailability = async (): Promise<HealthAvailability> => {
  try {
    if (Platform.OS === "ios") {
      return (await healthKit().isHealthDataAvailableAsync()) ? "available" : "unsupported";
    }
    if (Platform.OS === "android") {
      const { getSdkStatus, SdkAvailabilityStatus } = healthConnect();
      const status = await getSdkStatus();
      if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return "available";
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

const androidHasPermissions = async () => {
  if (!(await ensureHealthConnect())) return { steps: false, background: false };
  const granted = await healthConnect().getGrantedPermissions();
  return {
    steps: granted.some((p: any) => p.recordType === "Steps" && p.accessType === "read"),
    background: granted.some((p: any) => p.recordType === "BackgroundAccessPermission"),
  };
};

/** Whether the user already connected Health for steps on this device. */
export const isStepsConnected = async () => {
  try {
    if (Platform.OS === "android") {
      if ((await getHealthAvailability()) !== "available") return false;
      return (await androidHasPermissions()).steps;
    }
    if (Platform.OS === "ios") {
      // HealthKit never reveals whether read access was granted; we remember
      // that the user went through the prompt and treat missing data as 0.
      if ((await AsyncStorage.getItem(CONNECTED_KEY)) !== "1") return false;
      const status = await healthKit().getRequestStatusForAuthorization({ toRead: [IOS_STEPS] });
      return status === healthKit().AuthorizationRequestStatus.unnecessary;
    }
  } catch (error) {
    console.warn("[health] permission check failed", error);
  }
  return false;
};

/** Pide solo lectura de pasos (y lectura en segundo plano en Android). */
export const connectSteps = async () => {
  if (Platform.OS === "ios") {
    await healthKit().requestAuthorization({ toRead: [IOS_STEPS] });
    await AsyncStorage.setItem(CONNECTED_KEY, "1");
    return isStepsConnected();
  }
  if (Platform.OS === "android") {
    if (!(await ensureHealthConnect())) return false;
    await healthConnect().requestPermission([
      { accessType: "read", recordType: "Steps" },
      { accessType: "read", recordType: "BackgroundAccessPermission" },
    ]);
    return (await androidHasPermissions()).steps;
  }
  return false;
};

export const hasBackgroundStepsAccess = async () => {
  if (Platform.OS === "ios") return isStepsConnected();
  if (Platform.OS === "android") {
    try {
      return (await androidHasPermissions()).background;
    } catch {
      return false;
    }
  }
  return false;
};

const startOfLocalDay = (now: Date) => new Date(now.getFullYear(), now.getMonth(), now.getDate());

/** Total de pasos de hoy (día local del celular). null si no se pudo leer. */
export const readTodaySteps = async (now = new Date()): Promise<number | null> => {
  const startDate = startOfLocalDay(now);
  try {
    if (Platform.OS === "ios") {
      const result = await healthKit().queryStatisticsForQuantity(IOS_STEPS, ["cumulativeSum"], {
        filter: { date: { startDate, endDate: now } },
        unit: "count",
      });
      return Math.round(result.sumQuantity?.quantity ?? 0);
    }
    if (Platform.OS === "android") {
      if (!(await ensureHealthConnect())) return null;
      const result = await healthConnect().aggregateRecord({
        recordType: "Steps",
        timeRangeFilter: {
          operator: "between",
          startTime: startDate.toISOString(),
          endTime: now.toISOString(),
        },
      });
      return Math.round(result.COUNT_TOTAL ?? 0);
    }
  } catch (error) {
    console.warn("[health] could not read steps", error);
  }
  return null;
};

/** iOS: HealthKit despierta la app cuando hay pasos nuevos (best effort). */
export const enableIosStepsBackgroundDelivery = async () => {
  if (Platform.OS !== "ios") return false;
  try {
    const hk = healthKit();
    return await hk.configureBackgroundTypes([IOS_STEPS], hk.UpdateFrequency.hourly);
  } catch (error) {
    console.warn("[health] background delivery unavailable", error);
    return false;
  }
};

export const subscribeToIosStepChanges = (onChange: () => void) => {
  if (Platform.OS !== "ios") return () => {};
  try {
    const subscription = healthKit().subscribeToChanges(IOS_STEPS, () => onChange());
    return () => subscription.remove();
  } catch (error) {
    console.warn("[health] could not observe steps", error);
    return () => {};
  }
};
