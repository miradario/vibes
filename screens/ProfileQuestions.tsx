import ProfileOnboardingFields from "../components/ProfileOnboardingFields";
import {
  aboutMePreferencesFromSaved,
  aboutMePreferencesPayload,
  type AboutMePreferences,
} from "../src/lib/aboutMeProfile";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { upsertUserPreferences } from "../src/lib/userPreferencesStore";
import { assertAcceptableContent } from "../src/lib/moderation";
import AppHeader from "../components/AppHeader";
import ProfileSectionTabs from "../components/ProfileSectionTabs";
import VibesLoader from "../components/VibesLoader";
import { vibesTheme } from "../src/theme/vibesTheme";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "../components/Typography";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
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
import * as ds from "../src/theme/tokens";

const SECTION_COUNT = 3;

export default function ProfileQuestions() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const firstHomeVisit = route.params?.firstHomeVisit === true;
  const { data: session } = useAuthSession();
  const userId = session?.user.id;
  const client = useQueryClient();
  const preferences = useUserPreferencesQuery(userId);
  const [preferencesDraft, setPreferencesDraft] =
    useState<AboutMePreferences | null>(null);
  const preferencesValue =
    preferencesDraft ?? aboutMePreferencesFromSaved(preferences.data);

  const query = useQuery({
    queryKey: ["profileAnswers", userId],
    queryFn: () => readProfileAnswers(userId!),
    enabled: !!userId,
  });
  const [draft, setDraft] = useState<ProfileAnswers | null>(null);
  const requestedGroup = Number(route.params?.initialGroup);
  const [group, setGroup] = useState(
    Number.isInteger(requestedGroup) && requestedGroup >= 0 && requestedGroup < SECTION_COUNT
      ? requestedGroup
      : 0
  );
  // Re-entering with a new tab (e.g. from the profile-completion line) jumps to it.
  useEffect(() => {
    if (Number.isInteger(requestedGroup) && requestedGroup >= 0 && requestedGroup < SECTION_COUNT) {
      setGroup(requestedGroup);
    }
  }, [requestedGroup]);
  const [saving, setSaving] = useState(false);
  const value = draft ?? query.data ?? {};
  const ready = query.isSuccess && preferences.isSuccess;
  const loading = query.isLoading || preferences.isLoading;
  const failed = query.isError || preferences.isError;
  const isLastGroup = group >= SECTION_COUNT - 1;
  // En Identidad e Intereses guardamos y pasamos a la tab siguiente; en Planes guardamos y salimos.
  const save = async () => {
    if (!userId || saving || !ready) return;
    setSaving(true);
    try {
      assertAcceptableContent([
        preferencesValue.aboutMe,
        ...preferencesValue.openTo,
        ...preferencesValue.spiritualPath,
        ...Object.values(preferencesValue.spiritualPathDetails).flatMap(
          (detail) => Object.values(detail)
        ),
      ]);
      await upsertUserPreferences(
        userId,
        aboutMePreferencesPayload(preferencesValue, aboutMePreferencesFromSaved(preferences.data))
      );
      await saveProfileAnswers(userId, value);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["profileAnswers", userId] }),
        client.invalidateQueries({ queryKey: ["candidates"] }),
        client.invalidateQueries({
          queryKey: userPreferencesKeys.byUser(userId),
        }),
      ]);
      if (isLastGroup) navigation.goBack();
      else setGroup((current) => Math.min(current + 1, SECTION_COUNT - 1));
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
            paddingHorizontal: ds.spacing[6],
            paddingTop: ds.spacing[2],
            paddingBottom: ds.spacing[4],
            backgroundColor: vibesTheme.colors.background,
          }}
        >
          <AppHeader
            title="Sobre mí"
            subtitle="Todo es opcional. Completá solo lo que quieras compartir."
            showBack={!firstHomeVisit}
            onBack={() => navigation.goBack()}
            style={{ paddingHorizontal: 0, paddingVertical: 0 }}
            titleStyle={{
              ...ds.textStyles.title,
            }}
            subtitleStyle={{
              ...ds.textStyles.bodySmall,
            }}
          />
          {ready && (
            <>
              <ProfileSectionTabs value={group} onChange={setGroup} />
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
            paddingHorizontal: ds.spacing[6],
            paddingBottom: ds.spacing[6],
            paddingTop: ds.spacing[2],
          }}
        >
          {loading ? (
            <VibesLoader />
          ) : failed ? (
            <View>
              <Text>No pudimos cargar tus respuestas.</Text>
              <TouchableOpacity
                onPress={() => {
                  void query.refetch();
                  void preferences.refetch();
                }}
                style={{ padding: ds.spacing[4] }}
              >
                <Text>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ProfileOnboardingFields
                group={group}
                value={preferencesValue}
                onChange={setPreferencesDraft}
              />
              <ProfileQuestionsForm
                favoritePlansInPlans
                hiddenFields={["lookingFor", "habits", "idealPlan", "talkAbout", "trySomething"]}
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
            paddingHorizontal: ds.spacing[6],
            paddingTop: ds.spacing[3],
            paddingBottom: ds.spacing[2],
            backgroundColor: vibesTheme.colors.background,
          }}
        >
          <PrimaryButton
            label={isLastGroup ? "Guardar" : "Continuar"}
            loading={saving}
            disabled={!userId || saving || !ready}
            onPress={() => void save()}
          />
          {firstHomeVisit && (
            <TouchableOpacity
              accessibilityRole="button"
              disabled={saving}
              onPress={() => navigation.goBack()}
              style={{
                marginTop: ds.spacing[4],
                borderTopWidth: 1,
                borderTopColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.scrim),
                minHeight: 48,
                paddingVertical: ds.spacing[4],
                alignItems: "center",
              }}
            >
              <Text style={{ color: vibesTheme.colors.secondaryText }}>
                Completar después
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
