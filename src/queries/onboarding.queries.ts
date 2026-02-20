import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { profileKeys } from "./profile.queries";
import { userPreferencesKeys } from "./userPreferences.queries";

export type OnboardingDraft = {
  displayName?: string;
  birthDate?: string;
  genderId?: number;
  orientation?: string[];
  intentId?: number;
};

const defaultDraft: OnboardingDraft = {
  displayName: "",
  birthDate: "",
  genderId: undefined,
  orientation: [],
  intentId: undefined,
};

export const onboardingKeys = {
  pending: ["onboarding", "pending"] as const,
  draft: ["onboarding", "draft"] as const,
};

export const useOnboardingPending = () => {
  return useQuery<boolean>({
    queryKey: onboardingKeys.pending,
    queryFn: async () => false,
    initialData: false,
    staleTime: Infinity,
  });
};

export const useOnboardingDraft = () => {
  const queryClient = useQueryClient();
  const query = useQuery<OnboardingDraft>({
    queryKey: onboardingKeys.draft,
    queryFn: async () => defaultDraft,
    initialData: defaultDraft,
    staleTime: Infinity,
  });

  const setDraft = (next: OnboardingDraft) => {
    queryClient.setQueryData(onboardingKeys.draft, next);
  };

  const updateDraft = (patch: Partial<OnboardingDraft>) => {
    queryClient.setQueryData(onboardingKeys.draft, (prev) => ({
      ...(prev ?? defaultDraft),
      ...patch,
    }));
  };

  const resetDraft = () => {
    queryClient.setQueryData(onboardingKeys.draft, defaultDraft);
  };

  return {
    ...query,
    draft: query.data ?? defaultDraft,
    setDraft,
    updateDraft,
    resetDraft,
  };
};

type CompleteOnboardingInput = {
  userId: string;
  draft: OnboardingDraft;
};

export const useCompleteOnboardingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, CompleteOnboardingInput>({
    mutationFn: async ({ userId, draft }) => {
      const payload: Record<string, unknown> = {
        id: userId,
        display_name: draft.displayName?.trim() ?? "",
      };

      if (draft.birthDate) payload.birth_date = draft.birthDate;
      if (draft.genderId) payload.gender_id = draft.genderId;
      if (draft.orientation?.length) payload.orientation = draft.orientation;
      if (draft.intentId) payload.intent_id = draft.intentId;

      console.log("completeOnboarding:payload", payload);
      const { error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" });

      if (error) {
        console.log("completeOnboarding:error", error);
        console.log("completeOnboarding:error_message", error.message);
        if ("details" in error) {
          console.log(
            "completeOnboarding:error_details",
            (error as any).details
          );
        }
        if ("hint" in error) {
          console.log("completeOnboarding:error_hint", (error as any).hint);
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
      queryClient.invalidateQueries({ queryKey: userPreferencesKeys.all });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.pending });
    },
  });
};
