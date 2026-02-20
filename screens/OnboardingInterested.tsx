/** @format */

import React, { useState } from "react";
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  useCompleteOnboardingMutation,
  useOnboardingDraft,
} from "../src/queries/onboarding.queries";

const OnboardingInterested = () => {
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const { draft, updateDraft, resetDraft } = useOnboardingDraft();
  const completeMutation = useCompleteOnboardingMutation();
  const [selected, setSelected] = useState<number | null>(
    draft.intentId ?? null
  );

  const options = [
    { id: 1, label: "Women" },
    { id: 2, label: "Man" },
    { id: 3, label: "Everyone" },
  ];

  return (
    <ImageBackground
      source={require("../assets/images/backgroundSimple.png")}
      style={styles.bg}
    >
      <View style={styles.onboardContainer}>
        <View style={styles.onboardHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={22} color={DARK_GRAY} />
          </TouchableOpacity>
          <View style={styles.onboardProgressTrack}>
            <View style={[styles.onboardProgressFill, { width: "100%" }]} />
          </View>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.onboardTitle}>
          Who are you interested in seeing?
        </Text>

        <View style={styles.onboardOptions}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.onboardOption,
                selected === option.id && styles.onboardOptionActive,
              ]}
              onPress={() => setSelected(option.id)}
            >
              <Text
                style={[
                  styles.onboardOptionText,
                  selected === option.id && styles.onboardOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.onboardFooter}>
          <TouchableOpacity
            style={[
              styles.onboardNext,
              (!selected || completeMutation.isPending) &&
                styles.onboardNextDisabled,
            ]}
            disabled={!selected || completeMutation.isPending}
            onPress={async () => {
              const userId = session?.user?.id;
              if (!selected || !userId) {
                Alert.alert("Error", "No se pudo completar el registro.");
                return;
              }

              console.log("onboarding:submit", { userId, selected, draft });
              updateDraft({ intentId: selected });

              try {
                await completeMutation.mutateAsync({
                  userId,
                  draft: {
                    ...draft,
                    intentId: selected,
                  },
                });
                resetDraft();
                navigation.navigate("Tab" as never);
              } catch (error) {
                console.log("onboarding:submit_error", error);
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
    </ImageBackground>
  );
};

export default OnboardingInterested;
