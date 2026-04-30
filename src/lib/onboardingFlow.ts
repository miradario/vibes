export const ACTIVE_ONBOARDING_FLOW = [
  "OnboardingName",
  "OnboardingAge",
  "OnboardingGender",
  "OnboardingPhoto",
  "OnboardingSpiritualPath",
] as const;

const FLOW_STEP_INDEX: Record<string, number> = {
  OnboardingName: 0,
  OnboardingAge: 1,
  OnboardingGender: 2,
  OnboardingCountry: 3,
  OnboardingPhoto: 3,
  OnboardingSpiritualPath: 4,
  OnboardingOrientation: 4,
  OnboardingInterested: 4,
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
