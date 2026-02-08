import { useQuery } from "@tanstack/react-query";

export const onboardingKeys = {
  pending: ["onboarding", "pending"] as const,
};

export const useOnboardingPending = () => {
  return useQuery<boolean>({
    queryKey: onboardingKeys.pending,
    queryFn: async () => false,
    initialData: false,
    staleTime: Infinity,
  });
};
