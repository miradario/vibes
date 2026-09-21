import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "../components/Typography";
import Icon from "../components/Icon";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
import ScreenContainer from "../components/ScreenContainer";
import ProfileQuestionsForm, {
  ProfileQuestionsHeader,
} from "../components/onboarding/ProfileQuestionsForm";
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
  const route = useRoute<any>();
  const firstHomeVisit = route.params?.firstHomeVisit === true;
  const { data: session } = useAuthSession();
  const userId = session?.user.id;
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["profileAnswers", userId],
    queryFn: () => readProfileAnswers(userId!),
    enabled: !!userId,
  });
  const [draft, setDraft] = useState<ProfileAnswers | null>(null);
  const [group, setGroup] = useState(0);
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 8,
            backgroundColor: "#FEFEFD",
          }}
        >
          {!firstHomeVisit && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Volver"
              onPress={() => navigation.goBack()}
              style={{ width: 48, minHeight: 48, justifyContent: "center" }}
            >
              <Icon name="chevron-back" size={24} color="#2B2B2B" />
            </TouchableOpacity>
          )}
          {query.isSuccess && (
            <>
              <View
                accessibilityRole="tablist"
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                {["Identidad", "Intereses", "Planes"].map((label, index) => (
                  <TouchableOpacity
                    key={label}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: group === index }}
                    onPress={() => setGroup(index)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 24,
                      backgroundColor: group === index ? "#D7B56D" : "#F5F1E8",
                    }}
                  >
                    <Text style={{ color: "#2B2B2B" }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <ProfileQuestionsHeader group={group} />
            </>
          )}
        </View>
        <ScreenContainer
          scroll
          edges={[]}
          scrollViewProps={{
            keyboardShouldPersistTaps: "handled",
            keyboardDismissMode: "on-drag",
          }}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 24,
            paddingTop: 8,
          }}
        >
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
              <ProfileQuestionsForm
                showHeader={false}
                group={group}
                value={value}
                onChange={setDraft}
              />
            </>
          )}
        </ScreenContainer>
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 8,
            backgroundColor: "#FEFEFD",
          }}
        >
          <PrimaryButton
            label="Guardar respuestas"
            loading={saving}
            disabled={!userId || saving || !query.isSuccess}
            onPress={() => void save()}
          />
          {firstHomeVisit && (
            <TouchableOpacity
              accessibilityRole="button"
              disabled={saving}
              onPress={() => navigation.goBack()}
              style={{
                marginTop: 16,
                borderTopWidth: 1,
                borderTopColor: "#E7DFD2",
                minHeight: 48,
                paddingVertical: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#6E6E6E" }}>Omitir</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
