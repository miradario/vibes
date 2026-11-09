// Segundo plano para los desafíos de pasos. Importado al inicio de App.tsx
// porque TaskManager.defineTask tiene que correr en el scope global.
//  - Android: tarea periódica (WorkManager, mínimo ~15 min) con el permiso de
//    lectura en segundo plano de Health Connect.
//  - iOS: HealthKit background delivery despierta la app cuando hay pasos
//    nuevos (best effort, iOS decide cuándo) + BGTask como respaldo.
import { Platform } from "react-native";
import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";
import { runStepAutoCheckins, hasActiveStepChallenge } from "./stepAutoCheckin";
import {
  enableIosStepsBackgroundDelivery,
  hasBackgroundStepsAccess,
  subscribeToIosStepChanges,
} from "./healthSteps";

export const STEPS_BACKGROUND_TASK = "vibes-step-challenge-checkin";

const isNative = Platform.OS === "ios" || Platform.OS === "android";

if (isNative && !TaskManager.isTaskDefined(STEPS_BACKGROUND_TASK)) {
  TaskManager.defineTask(STEPS_BACKGROUND_TASK, async () => {
    try {
      await runStepAutoCheckins({ notify: true });
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

let iosObserverRemove: (() => void) | null = null;
const startIosObserver = () => {
  if (Platform.OS !== "ios" || iosObserverRemove) return;
  iosObserverRemove = subscribeToIosStepChanges(() => {
    void runStepAutoCheckins({ notify: true });
  });
};

/**
 * Registra (o da de baja) el trabajo en segundo plano según si el usuario
 * participa de algún desafío de pasos y conectó Salud. Seguro de llamar seguido.
 */
export const syncStepsBackgroundWork = async () => {
  if (!isNative) return;
  try {
    const [active, access] = await Promise.all([hasActiveStepChallenge(), hasBackgroundStepsAccess()]);
    const registered = await TaskManager.isTaskRegisteredAsync(STEPS_BACKGROUND_TASK);
    if (!active || !access) {
      if (registered) await BackgroundTask.unregisterTaskAsync(STEPS_BACKGROUND_TASK);
      return;
    }
    if (Platform.OS === "ios") {
      await enableIosStepsBackgroundDelivery();
      startIosObserver();
    }
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Available && !registered) {
      await BackgroundTask.registerTaskAsync(STEPS_BACKGROUND_TASK, { minimumInterval: 15 });
    }
  } catch (error) {
    console.warn("[health] could not sync background work", error);
  }
};

// When iOS relaunches the app in the background for a HealthKit update, JS
// boots through App.tsx; re-attach the observer so the update is processed.
if (Platform.OS === "ios") {
  void hasBackgroundStepsAccess().then((access) => {
    if (access) startIosObserver();
  });
}
