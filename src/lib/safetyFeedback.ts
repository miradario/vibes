export const SAFETY_FEEDBACK_CATEGORIES = ["child_safety", "abuse", "support", "feedback"] as const;
export type SafetyFeedbackCategory = typeof SAFETY_FEEDBACK_CATEGORIES[number];
export const CHILD_SAFETY_POLICY_URL = "https://vibes.gurudevelopers.dev/seguridad-infantil";
export function validateSafetyFeedback(category: string, details: string, context: string): boolean {
  return (SAFETY_FEEDBACK_CATEGORIES as readonly string[]).includes(category) && details.trim().length >= 10 && details.trim().length <= 4000 && context.trim().length <= 1000;
}
