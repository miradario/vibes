import { supabase } from "./supabase";

export const ACTIVE_ONBOARDING_FLOW = [
  "OnboardingName",
  "OnboardingAge",
  "OnboardingPhoto",
  "OnboardingSpiritualPath",
] as const;

const FLOW_STEP_INDEX: Record<string, number> = {
  OnboardingName: 0,
  OnboardingAge: 1,
  OnboardingCountry: 2,
  OnboardingPhoto: 2,
  OnboardingSpiritualPath: 3,
  OnboardingOrientation: 3,
  OnboardingInterested: 3,
};

export const getOnboardingStepIndex = (screenName: string) =>
  FLOW_STEP_INDEX[screenName];

export const getOnboardingProgress = (screenName: string) => {
  const stepIndex = getOnboardingStepIndex(screenName);

  if (typeof stepIndex !== "number") {
    return {
      value: 0,
      label: "0%",
    };
  }

  const totalSteps = ACTIVE_ONBOARDING_FLOW.length;
  const value = Math.round(((stepIndex + 1) / totalSteps) * 100);

  return {
    value,
    label: `${value}%`,
  };
};

type OnboardingProfile = {
  display_name?: unknown;
  displayName?: unknown;
  birth_date?: unknown;
  birthDate?: unknown;
};

export const isOnboardingComplete = (profile: unknown) => {
  if (!profile || typeof profile !== "object") return false;

  const onboardingProfile = profile as OnboardingProfile;

  const displayName =
    onboardingProfile.display_name ?? onboardingProfile.displayName;
  const birthDate = onboardingProfile.birth_date ?? onboardingProfile.birthDate;

  return (
    typeof displayName === "string" &&
    displayName.trim().length > 0 &&
    typeof birthDate === "string" &&
    birthDate.trim().length > 0
  );
};

export const getPostAuthRoute = async (
  userId: string,
): Promise<"Tab" | "VibesOnboardingFlow"> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, birth_date")
    .eq("id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;

  return isOnboardingComplete(data) ? "Tab" : "VibesOnboardingFlow";
};
