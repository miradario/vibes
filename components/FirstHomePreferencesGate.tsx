import React, { useEffect, useRef } from "react";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "../src/lib/supabase";
import {
  hasMissingProfileAnswers,
  readProfileAnswers,
} from "../src/lib/profileQuestions";

/** Mounted with a user key: the claim lives in the account, never in device storage. */
export default function FirstHomePreferencesGate({
  userId,
  onReady,
}: {
  userId: string;
  onReady?: () => void;
}) {
  const navigation = useNavigation();
  const focused = useIsFocused();
  const focusedRef = useRef(focused);
  focusedRef.current = focused;
  const answers = useQuery({
    queryKey: ["profileAnswers", userId],
    queryFn: () => readProfileAnswers(userId),
  });
  const claim = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc(
        "claim_home_preferences_visit"
      );
      if (error) throw error;
      return data === true;
    },
    onSuccess: (claimed) => {
      if (
        claimed &&
        focusedRef.current &&
        hasMissingProfileAnswers(answers.data)
      ) {
        navigation.navigate(
          "ProfileQuestions" as never,
          { firstHomeVisit: true } as never
        );
      }
    },
  });
  useEffect(() => {
    if (focused && answers.isSuccess && claim.isIdle) claim.mutate();
  }, [focused, answers.isSuccess, claim.isIdle, claim.mutate]);
  useEffect(() => {
    if (answers.isError || claim.isSuccess || claim.isError) onReady?.();
  }, [answers.isError, claim.isSuccess, claim.isError, onReady]);
  return null;
}
