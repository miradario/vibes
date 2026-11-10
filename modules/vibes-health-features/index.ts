// Módulo local solo Android (ver android/). En iOS, web o binarios viejos sin
// el módulo devuelve "unknown" y la app usa la heurística de respaldo.
import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";

export type MindfulnessFeatureStatus = "available" | "unavailable" | "sdk_unavailable" | "unknown";

type NativeModule = { getMindfulnessFeatureStatus(): Promise<string> };

const nativeModule =
  Platform.OS === "android" ? requireOptionalNativeModule<NativeModule>("VibesHealthFeatures") : null;

export const getMindfulnessFeatureStatus = async (): Promise<MindfulnessFeatureStatus> => {
  if (!nativeModule) return "unknown";
  try {
    const status = await nativeModule.getMindfulnessFeatureStatus();
    return status === "available" || status === "unavailable" || status === "sdk_unavailable"
      ? status
      : "unknown";
  } catch {
    return "unknown";
  }
};
