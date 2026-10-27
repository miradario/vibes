import { useQuery } from "@tanstack/react-query";
import { getProfileCompletion } from "../../src/lib/profileCompletion";
import { readProfileAnswers } from "../../src/lib/profileQuestions";
import { useProfileQuery } from "../../src/queries/profile.queries";
import { useUserPreferencesQuery } from "../../src/queries/userPreferences.queries";

/**
 * Profile percentage for the FTUX (shared query keys with CompleteProfilePrompt,
 * so no extra requests when both are mounted). Pass no userId to stay idle.
 * Email validation does not count here: someone who filled in everything during
 * onboarding is not asked to complete the profile just for the email.
 */
export function useFtuxProfileCompletion(userId?: string | null) {
  const id = userId ?? undefined;
  const { data: profile, isSuccess: profileReady } = useProfileQuery(id);
  const { data: preferences, isSuccess: preferencesReady } = useUserPreferencesQuery(id);
  const { data: answers, isSuccess: answersReady } = useQuery({
    queryKey: ["profileAnswers", id],
    queryFn: () => readProfileAnswers(id!),
    enabled: !!id,
  });
  const ready = Boolean(id) && profileReady && preferencesReady && answersReady;
  if (!ready) return { ready: false, percent: 0, complete: false, nextScreen: "EditProfile", missingSummary: "", profile };
  const completion = getProfileCompletion(
    profile,
    preferences,
    true,
    answers
  );
  return {
    ready: true,
    percent: completion.percent,
    complete: completion.percent >= 100,
    nextScreen: completion.nextScreen,
    missingSummary: completion.missingSummary,
    profile,
  };
}
