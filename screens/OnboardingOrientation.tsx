/** @format */

import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from "react-native";
import { ResizeMode, Video } from "expo-av";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  useCompleteOnboardingMutation,
  useOnboardingDraft,
} from "../src/queries/onboarding.queries";

const OPTIONS = [
  "Straight",
  "Gay",
  "Lesbian",
  "Bisexual",
  "Asexual",
  "Demisexual",
  "Pansexual",
  "Queer",
  "Questioning",
];

const OnboardingOrientation = () => {
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const { draft, updateDraft, resetDraft } = useOnboardingDraft();
  const completeMutation = useCompleteOnboardingMutation();
  const [selected, setSelected] = useState<string[]>(draft.orientation ?? []);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      setSelected(selected.filter((v) => v !== value));
      return;
    }
    if (selected.length >= 3) return;
    setSelected([...selected, value]);
  };

  return (
    <View style={styles.bg}>
      <View style={styles.onboardContainer}>
        <View style={styles.onboardHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={22} color={DARK_GRAY} />
          </TouchableOpacity>
          <View style={styles.onboardProgressTrack}>
            <View style={[styles.onboardProgressFill, { width: "100%" }]} />
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("Tab" as never)}>
            <Text style={styles.onboardSkip}>Skip</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.onboardTitle}>Your sexual orientation?</Text>
        <Text style={styles.onboardSubtitle}>Select up to 3</Text>

        <View style={styles.onboardList}>
          {OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.onboardListItem}
              onPress={() => toggle(option)}
            >
              <Text style={styles.onboardListText}>{option}</Text>
              <View
                style={[
                  styles.onboardCheck,
                  selected.includes(option) && styles.onboardCheckActive,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={localStyles.videoWrap}>
          <Video
            source={require("../assets/videos/name.mp4")}
            style={localStyles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isMuted
          />
        </View>

        <View style={styles.onboardFooter}>
          <TouchableOpacity
            style={[
              styles.onboardNext,
              (selected.length === 0 || completeMutation.isPending) &&
                styles.onboardNextDisabled,
            ]}
            disabled={selected.length === 0 || completeMutation.isPending}
            onPress={async () => {
              const userId = session?.user?.id;
              if (!userId) {
                Alert.alert("Error", "No se pudo completar el onboarding.");
                return;
              }

              updateDraft({ orientation: selected });
              try {
                await completeMutation.mutateAsync({
                  userId,
                  draft: {
                    ...draft,
                    orientation: selected,
                  },
                });
                resetDraft();
                navigation.navigate("Tab" as never);
              } catch (error) {
                const message =
                  error instanceof Error
                    ? error.message
                    : "No se pudo completar el onboarding.";
                Alert.alert("Error", message);
              }
            }}
          >
            {completeMutation.isPending ? (
              <ActivityIndicator color={DARK_GRAY} />
            ) : (
              <Text style={styles.onboardNextText}>Next</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default OnboardingOrientation;

const localStyles = StyleSheet.create({
  videoWrap: {
    flex: 1,
    minHeight: 320,
    marginTop: 18,
    marginBottom: 12,
  },
  video: {
    width: "100%",
    height: "100%",
  },
});
