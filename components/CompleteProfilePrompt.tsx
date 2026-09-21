import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "./Typography";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import {
  hasMissingProfileAnswers,
  readProfileAnswers,
} from "../src/lib/profileQuestions";
import { vibesTheme } from "../src/theme/vibesTheme";
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
      style={styles.card}
    >
      <Text style={styles.title}>Completá tu perfil</Text>
      <Text style={styles.subtitle}>
        Sumá tus intereses y planes. Siempre es opcional.
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    backgroundColor: "#F8F1E5",
    borderRadius: 20,
    marginBottom: 16,
  },
  title: {
    color: "#2B2B2B",
    fontSize: 18,
    lineHeight: 22,
    fontFamily: vibesTheme.fonts.medium,
  },
  subtitle: {
    marginTop: 6,
    color: "#6E6E6E",
    fontSize: 15,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.regular,
  },
});
