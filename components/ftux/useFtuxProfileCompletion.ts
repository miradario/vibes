import { useQuery } from "@tanstack/react-query";
import { isEmailOwnershipVerified } from "../../src/auth/emailVerification";
import { getProfileCompletion } from "../../src/lib/profileCompletion";
import { readProfileAnswers } from "../../src/lib/profileQuestions";
import { useEmailOwnershipQuery } from "../../src/queries/emailOwnership.queries";
import { useProfileQuery } from "../../src/queries/profile.queries";
import { useUserPreferencesQuery } from "../../src/queries/userPreferences.queries";

/**
 * Same real profile percentage as CompleteProfilePrompt (shared query keys,
 * so no extra requests when both are mounted). Pass no userId to stay idle.
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
  const { data: emailOwner, isSuccess: emailReady } = useEmailOwnershipQuery(id);
  const ready = Boolean(id) && profileReady && preferencesReady && answersReady && emailReady;
  if (!ready) return { ready: false, percent: 0, complete: false, nextScreen: "EditProfile", profile };
  const completion = getProfileCompletion(
    profile,
    preferences,
    isEmailOwnershipVerified(emailOwner),
    answers
  );
  return {
    ready: true,
    percent: completion.percent,
    complete: completion.percent >= 100,
    nextScreen: completion.nextScreen,
    profile,
  };
}
