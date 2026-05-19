import { Alert, Linking, Platform } from "react-native";
import * as Application from "expo-application";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

const UPDATE_DISMISS_PREFIX = "suggested_update_dismissed:";

type AppVersionRuleRow = {
  minimum_supported_version: string | null;
  recommended_version: string | null;
  ios_store_url: string | null;
  android_store_url: string | null;
};

export type AppUpdateGateState =
  | {
      mode: "force";
      currentVersion: string;
      targetVersion: string;
      storeUrl: string | null;
    }
  | {
      mode: "suggested";
      currentVersion: string;
      targetVersion: string;
      storeUrl: string | null;
    };

const normalizeVersion = (version?: string | null) =>
  (version ?? "")
    .trim()
    .replace(/^v/i, "")
    .replace(/[^\d.].*$/, "");

const compareVersions = (left?: string | null, right?: string | null) => {
  const a = normalizeVersion(left).split(".").map((part) => Number(part || 0));
  const b = normalizeVersion(right).split(".").map((part) => Number(part || 0));
  const maxLength = Math.max(a.length, b.length, 3);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = a[index] ?? 0;
    const rightPart = b[index] ?? 0;
    if (leftPart > rightPart) return 1;
    if (leftPart < rightPart) return -1;
  }

  return 0;
};

export const getInstalledAppVersion = () =>
  normalizeVersion(
    Application.nativeApplicationVersion ??
      Constants.expoConfig?.version ??
      "1.0.0",
  ) || "1.0.0";

const getDismissKey = (targetVersion: string) =>
  `${UPDATE_DISMISS_PREFIX}${normalizeVersion(targetVersion)}`;

export const dismissSuggestedUpdate = async (targetVersion: string) => {
  await AsyncStorage.setItem(getDismissKey(targetVersion), "1");
};

const hasDismissedSuggestedUpdate = async (targetVersion: string) => {
  const stored = await AsyncStorage.getItem(getDismissKey(targetVersion));
  return stored === "1";
};

const getStoreUrl = (row: AppVersionRuleRow) => {
  if (Platform.OS === "ios") return row.ios_store_url;
  return row.android_store_url;
};

export const getAppUpdateGateState = async (): Promise<AppUpdateGateState | null> => {
  const currentVersion = getInstalledAppVersion();

  const { data, error } = await supabase
    .from("app_version_rules")
    .select(
      "minimum_supported_version,recommended_version,ios_store_url,android_store_url",
    )
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return null;

  const versionRule = data as AppVersionRuleRow;

  const storeUrl = getStoreUrl(versionRule) ?? null;
  const minimumVersion = normalizeVersion(versionRule.minimum_supported_version);
  const recommendedVersion = normalizeVersion(versionRule.recommended_version);

  if (
    minimumVersion &&
    compareVersions(currentVersion, minimumVersion) < 0
  ) {
    return {
      mode: "force",
      currentVersion,
      targetVersion: minimumVersion,
      storeUrl,
    };
  }

  if (
    recommendedVersion &&
    compareVersions(currentVersion, recommendedVersion) < 0 &&
    !(await hasDismissedSuggestedUpdate(recommendedVersion))
  ) {
    return {
      mode: "suggested",
      currentVersion,
      targetVersion: recommendedVersion,
      storeUrl,
    };
  }

  return null;
};

export const openAppUpdateStore = async (storeUrl?: string | null) => {
  if (!storeUrl) {
    Alert.alert(
      "Actualización no disponible",
      "Todavía no configuramos el link de la tienda para esta plataforma.",
    );
    return;
  }

  const canOpen = await Linking.canOpenURL(storeUrl);
  if (!canOpen) {
    Alert.alert(
      "No se pudo abrir la tienda",
      "Intentá nuevamente en unos segundos.",
    );
    return;
  }

  await Linking.openURL(storeUrl);
};
