export const splitOnboardingName = (displayName = "") => {
  const [firstName = "", ...rest] = displayName.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
};
export const onboardingFullName = (firstName: string, lastName: string) =>
  [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
export const hasOnboardingBasics = (firstName: string, _lastName?: string) =>
  Boolean(firstName.trim());
