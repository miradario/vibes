/** @format */

import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";
import { useOnboardingDraft } from "../src/queries/onboarding.queries";

const OnboardingGender = () => {
  const navigation = useNavigation();
  const { draft, updateDraft } = useOnboardingDraft();
  const [selected, setSelected] = useState<number | null>(
    draft.genderId ?? null
  );

  const options = [
    { id: 1, label: "Woman" },
    { id: 2, label: "Man" },
    { id: 3, label: "More" },
  ];

  return (
    <View style={styles.bg}>
      <View style={styles.onboardContainer}>
        <View style={styles.onboardHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={22} color={DARK_GRAY} />
          </TouchableOpacity>
          <View style={styles.onboardProgressTrack}>
            <View style={[styles.onboardProgressFill, { width: "33%" }]} />
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("Tab" as never)}>
            <Text style={styles.onboardSkip}>Skip</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.onboardTitle}>What’s your gender?</Text>

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
              !selected && styles.onboardNextDisabled,
            ]}
            disabled={!selected}
            onPress={() => {
              if (!selected) return;
              updateDraft({ genderId: selected });
              navigation.navigate("OnboardingOrientation" as never);
            }}
          >
            <Text style={styles.onboardNextText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default OnboardingGender;
