import {
  normalizeSpiritualPathDetails,
  type SpiritualPathDetails,
} from "./spiritualPaths";
export type AboutMePreferences = {
  aboutMe: string;
  openTo: string[];
  spiritualPath: string[];
  spiritualPathDetails: SpiritualPathDetails;
};
const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && Boolean(item.trim())
      )
    : [];
export const aboutMePreferencesFromSaved = (
  preferences: Record<string, any> | null | undefined
): AboutMePreferences => ({
  aboutMe: preferences?.aboutMe ?? preferences?.about_me ?? "",
  openTo: strings(preferences?.openTo ?? preferences?.open_to),
  spiritualPath: strings(
    preferences?.spiritualPath ?? preferences?.spiritual_path
  ),
  spiritualPathDetails: normalizeSpiritualPathDetails(
    preferences?.spiritualPathDetails ?? preferences?.spiritual_path_details
  ),
});
/** Partial upsert: keep privacy, discovery and other legacy preferences intact. */
export const aboutMePreferencesPayload = (value: AboutMePreferences) => ({
  about_me: value.aboutMe.trim(),
  open_to: value.openTo,
  spiritual_path: value.spiritualPath,
  spiritual_path_details: value.spiritualPathDetails,
});
