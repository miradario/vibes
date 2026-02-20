/** @format */

import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";
import { useOnboardingDraft } from "../src/queries/onboarding.queries";

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
  const { draft, updateDraft } = useOnboardingDraft();
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
            <View style={[styles.onboardProgressFill, { width: "66%" }]} />
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

        <View style={styles.onboardFooter}>
          <TouchableOpacity
            style={[
              styles.onboardNext,
              selected.length === 0 && styles.onboardNextDisabled,
            ]}
            disabled={selected.length === 0}
            onPress={() => {
              updateDraft({ orientation: selected });
              navigation.navigate("OnboardingInterested" as never);
            }}
          >
            <Text style={styles.onboardNextText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default OnboardingOrientation;
