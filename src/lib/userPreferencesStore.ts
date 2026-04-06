import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { mapUserPreferencesRow } from "../api/mappers/userPreferences.mapper";

const STORAGE_KEY_PREFIX = "user_preferences:";

const isMissingUserPreferencesTableError = (error: any) => {
  const message =
    typeof error?.message === "string" ? error.message.toLowerCase() : "";
  return message.includes("could not find the table 'public.user_preferences'");
};

const getStorageKey = (userId: string) => `${STORAGE_KEY_PREFIX}${userId}`;

const toCamelKey = (key: string) =>
  key.replace(/_([a-z])/g, (_match: string, letter: string) =>
    letter.toUpperCase(),
  );

const addCamelAliases = (value: Record<string, any>) =>
  Object.entries(value).reduce<Record<string, any>>((acc, [key, entryValue]) => {
    acc[key] = entryValue;
    acc[toCamelKey(key)] = entryValue;
    return acc;
  }, {});

export const getUserPreferences = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!error) {
    const mapped = mapUserPreferencesRow(data ?? null);
    return mapped ? addCamelAliases(mapped) : null;
  }

  if (!isMissingUserPreferencesTableError(error)) {
    throw error;
  }

  const raw = await AsyncStorage.getItem(getStorageKey(userId));
  if (!raw) return null;

  const parsed = JSON.parse(raw) as Record<string, any>;
  return addCamelAliases(parsed);
};

export const upsertUserPreferences = async (
  userId: string,
  payload: Record<string, any>,
) => {
  const working = { user_id: userId, ...payload };

  while (true) {
    const { error } = await supabase
      .from("user_preferences")
      .upsert(working, { onConflict: "user_id" });

    if (!error) {
      await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(working));
      return;
    }

    if (isMissingUserPreferencesTableError(error)) {
      await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(working));
      return;
    }

    if (error.code !== "PGRST204") {
      throw error;
    }

    const match = error.message.match(/'([^']+)' column/);
    const missingColumn = match?.[1];
    if (!missingColumn || missingColumn === "user_id") {
      throw error;
    }
    if (!(missingColumn in working)) {
      throw error;
    }
    delete working[missingColumn];
    if (Object.keys(working).length <= 1) {
      throw error;
    }
  }
};
