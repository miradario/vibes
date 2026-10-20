import type { OnboardingDraft } from "../queries/onboarding.queries";
import type { ProfileAnswers } from "./profileQuestions";
import { PURPOSE_OPTIONS } from "../screens/Onboarding/vibesOnboardingContent";

/** Seed from saved account data, never from a previous user's onboarding draft. */
export const buildResumeOnboardingDraft = (
  profile: Record<string, any>,
  preferences: Record<string, any> | null,
  answers: ProfileAnswers
): OnboardingDraft => {
  const prefs = preferences ?? {};
  const photos = (profile.photos ?? [])
    .map((photo: any) => (typeof photo === "string" ? photo : photo.url))
    .filter(
      (uri: unknown): uri is string => typeof uri === "string" && Boolean(uri)
    )
    .slice(0, 6);
  const purpose = prefs.openTo ?? [];
  return {
    editingExistingProfile: true,
    displayName: profile.displayName ?? "",
    birthDate: profile.birthDate ?? "",
    genderId: profile.genderId,
    intentId: profile.intentId,
    orientation: profile.orientation ?? [],
    ageRange: profile.ageRange ?? "",
    country: profile.country ?? "",
    city: profile.city ?? "",
    neighborhood: profile.neighborhood ?? "",
    locationLabel: profile.locationLabel ?? "",
    latitude: profile.latitude ?? undefined,
    longitude: profile.longitude ?? undefined,
    spiritualPath: prefs.spiritualPath ?? [],
    spiritualPathDetails: prefs.spiritualPathDetails ?? {},
    vegetarian: prefs.vegetarian ?? "",
    otherTags: prefs.otherTags ?? [],
    aboutMe: prefs.aboutMe ?? "",
    briefDescription: prefs.aboutMe ?? "",
    purpose,
    purposeIds: PURPOSE_OPTIONS.filter((option) =>
      purpose.includes(option.label)
    ).map((option) => option.id),
    profileAnswers: answers,
    photoUris: photos,
    primaryPhotoUri: photos[0] ?? "",
  };
};

/** Keep the resumed flow focused on missing data, including backward navigation. */
export const getCompletedResumeSteps = (draft: OnboardingDraft) => {
  if (!draft.editingExistingProfile) return [];
  const completed: Array<"profileText" | "profile"> = [];
  const nameParts = (draft.displayName ?? "").trim().split(/\s+/);
  const firstName = draft.firstName ?? nameParts[0] ?? "";
  const lastName = draft.lastName ?? nameParts.slice(1).join(" ");
  if (firstName.trim() && lastName.trim() && draft.briefDescription?.trim() && draft.profileAnswers?.gender) {
    completed.push("profileText");
  }
  const photos = new Set([draft.primaryPhotoUri, ...(draft.photoUris ?? [])].filter(uri => uri?.trim()));
  // Birth date shares the photo step: don't hide it if age assurance is missing.
  if (photos.size >= 6 && draft.birthDate) completed.push("profile");
  return completed;
};
