import { useQuery } from "@tanstack/react-query";
import { getProfileCompletion } from "../../src/lib/profileCompletion";
import { isEmailOwnershipVerified } from "../../src/auth/emailVerification";
import { useEmailOwnershipQuery } from "../../src/queries/emailOwnership.queries";
import { readProfileAnswers } from "../../src/lib/profileQuestions";
import { useProfileQuery } from "../../src/queries/profile.queries";
import { useUserPreferencesQuery } from "../../src/queries/userPreferences.queries";

/**
 * Profile percentage for the FTUX (shared query keys with CompleteProfilePrompt,
 * so no extra requests when both are mounted). Pass no userId to stay idle.
 * Email validation does not count toward the percent/completion here: someone who
 * filled in everything during onboarding is not asked to complete the profile just
 * for the email. It is still listed in `missingSummary` ("validar email") while the
 * email ownership is not verified, so the summary can show at 100%.
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
  const { data: emailOwner } = useEmailOwnershipQuery(id);
  const ready = Boolean(id) && profileReady && preferencesReady && answersReady;
  if (!ready) return { ready: false, percent: 0, complete: false, nextScreen: "EditProfile", missingSummary: "", profile };
  const completion = getProfileCompletion(
    profile,
    preferences,
    // Until ownership loads, assume verified so the summary doesn't flash "validar email".
    emailOwner ? isEmailOwnershipVerified(emailOwner) : true,
    answers,
    { emailCountsInPercent: false }
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
