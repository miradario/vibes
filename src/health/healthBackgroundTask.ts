// Segundo plano para los desafíos de Salud. Importado al inicio de App.tsx
// porque TaskManager.defineTask tiene que correr en el scope global.
//  - Android: tarea periódica (WorkManager, mínimo ~15 min) con el permiso de
//    lectura en segundo plano de Health Connect.
//  - iOS: HealthKit background delivery despierta la app cuando hay datos
//    nuevos de las métricas conectadas (best effort, iOS decide cuándo) +
//    BGTask como respaldo.
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";
import { isHealthMetric, type HealthMetricType } from "../lib/healthChallenge";
import { runHealthAutoCheckins, getActiveHealthMetrics } from "./healthAutoCheckin";
import {
  enableIosBackgroundDelivery,
  getConnectedMetrics,
  hasBackgroundHealthAccess,
  subscribeToIosMetricChanges,
} from "./healthMetrics";

// El nombre se mantiene desde la versión de solo pasos para no dejar tareas
// registradas huérfanas en quienes ya la tenían.
export const HEALTH_BACKGROUND_TASK = "vibes-step-challenge-checkin";
const IOS_OBSERVED_KEY = "vibes.health.observedMetrics";

const isNative = Platform.OS === "ios" || Platform.OS === "android";

if (isNative && !TaskManager.isTaskDefined(HEALTH_BACKGROUND_TASK)) {
  TaskManager.defineTask(HEALTH_BACKGROUND_TASK, async () => {
    try {
      await runHealthAutoCheckins({ notify: true });
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

const iosObservers = new Map<HealthMetricType, () => void>();
const syncIosObservers = (metrics: readonly HealthMetricType[]) => {
  if (Platform.OS !== "ios") return;
  for (const [metric, remove] of iosObservers) {
    if (!metrics.includes(metric)) {
      remove();
      iosObservers.delete(metric);
    }
  }
  for (const metric of metrics) {
    if (iosObservers.has(metric)) continue;
    iosObservers.set(
      metric,
      subscribeToIosMetricChanges(metric, () => {
        void runHealthAutoCheckins({ notify: true });
      })
    );
  }
};

/**
 * Registra (o da de baja) el trabajo en segundo plano según los desafíos de
 * Salud del usuario y las métricas que conectó. Seguro de llamar seguido.
 */
export const syncHealthBackgroundWork = async () => {
  if (!isNative) return;
  try {
    const active = await getActiveHealthMetrics();
    const [access, connected] = await Promise.all([
      hasBackgroundHealthAccess(active),
      getConnectedMetrics(active),
    ]);
    const registered = await TaskManager.isTaskRegisteredAsync(HEALTH_BACKGROUND_TASK);
    if (!active.length || !access) {
      if (registered) await BackgroundTask.unregisterTaskAsync(HEALTH_BACKGROUND_TASK);
      if (Platform.OS === "ios") {
        syncIosObservers([]);
        await AsyncStorage.removeItem(IOS_OBSERVED_KEY);
      }
      return;
    }
    if (Platform.OS === "ios") {
      await enableIosBackgroundDelivery(connected);
      syncIosObservers(connected);
      await AsyncStorage.setItem(IOS_OBSERVED_KEY, JSON.stringify(connected));
    }
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Available && !registered) {
      await BackgroundTask.registerTaskAsync(HEALTH_BACKGROUND_TASK, { minimumInterval: 15 });
    }
  } catch (error) {
    console.warn("[health] could not sync background work", error);
  }
};

// When iOS relaunches the app in the background for a HealthKit update, JS
// boots through App.tsx; re-attach the observers so the update is processed.
// Steps stays as the fallback for installs that connected before this list existed.
if (Platform.OS === "ios") {
  void (async () => {
    try {
      const raw = await AsyncStorage.getItem(IOS_OBSERVED_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : ["steps"];
      const saved = Array.isArray(parsed) ? parsed.filter(isHealthMetric) : [];
      const connected = await getConnectedMetrics(saved);
      if (connected.length) syncIosObservers(connected);
    } catch {
      // best effort
    }
  })();
}
