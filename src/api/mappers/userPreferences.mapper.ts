import { mapSupabaseSelect } from "./case.mapper";

export type UserPreferencesRow = Record<string, any>;

export const mapUserPreferencesRow = (row: UserPreferencesRow | null) =>
  (mapSupabaseSelect(row) as UserPreferencesRow | null) ?? null;
