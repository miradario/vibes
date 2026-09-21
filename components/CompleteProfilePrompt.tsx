import React from "react";
import { TouchableOpacity } from "react-native";
import { Text } from "./Typography";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import {
  hasMissingProfileAnswers,
  readProfileAnswers,
} from "../src/lib/profileQuestions";
export default function CompleteProfilePrompt({ userId }: { userId?: string }) {
  const navigation = useNavigation();
  const { data, isSuccess } = useQuery({
    queryKey: ["profileAnswers", userId],
    queryFn: () => readProfileAnswers(userId!),
    enabled: !!userId,
  });
  if (!isSuccess || !hasMissingProfileAnswers(data)) return null;
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate("ProfileQuestions" as never)}
      style={{
        padding: 18,
        backgroundColor: "#F8F1E5",
        borderRadius: 20,
        marginBottom: 16,
      }}
    >
      <Text style={{ fontSize: 18 }}>Completá tu perfil</Text>
      <Text style={{ marginTop: 6, color: "#6E6E6E" }}>
        Sumá tus intereses y planes. Siempre es opcional.
      </Text>
    </TouchableOpacity>
  );
}
