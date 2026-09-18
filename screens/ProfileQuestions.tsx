import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import ScreenContainer from "../components/ScreenContainer";
import ProfileQuestionsForm from "../components/onboarding/ProfileQuestionsForm";
import PrimaryButton from "../components/onboarding/PrimaryButton";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  readProfileAnswers,
  saveProfileAnswers,
  type ProfileAnswers,
} from "../src/lib/profileQuestions";
import { userPreferencesKeys } from "../src/queries/userPreferences.queries";

export default function ProfileQuestions() {
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const userId = session?.user.id;
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["profileAnswers", userId],
    queryFn: () => readProfileAnswers(userId!),
    enabled: !!userId,
  });
  const [draft, setDraft] = useState<ProfileAnswers | null>(null);
  const [saving, setSaving] = useState(false);
  const value = draft ?? query.data ?? {};
  const save = async () => {
    if (!userId || saving) return;
    setSaving(true);
    try {
      await saveProfileAnswers(userId, value);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["profileAnswers", userId] }),
        client.invalidateQueries({
          queryKey: userPreferencesKeys.byUser(userId),
        }),
      ]);
      navigation.goBack();
    } catch {
      Alert.alert(
        "No pudimos guardar",
        "Tus respuestas siguen aquí. Intentá de nuevo."
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScreenContainer
          scroll
          edges={[]}
          scrollViewProps={{
            keyboardShouldPersistTaps: "handled",
            keyboardDismissMode: "on-drag",
          }}
          contentContainerStyle={{ padding: 24 }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ paddingVertical: 12 }}
          >
            <Text>Volver</Text>
          </TouchableOpacity>
          {query.isLoading ? (
            <ActivityIndicator />
          ) : query.isError ? (
            <View>
              <Text>No pudimos cargar tus respuestas.</Text>
              <TouchableOpacity
                onPress={() => void query.refetch()}
                style={{ padding: 16 }}
              >
                <Text>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {[0, 1, 2].map((group) => (
                <ProfileQuestionsForm
                  key={group}
                  group={group}
                  value={value}
                  onChange={setDraft}
                />
              ))}
              <PrimaryButton
                label="Guardar respuestas"
                loading={saving}
                disabled={!userId || saving}
                onPress={() => void save()}
              />
            </>
          )}
        </ScreenContainer>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
