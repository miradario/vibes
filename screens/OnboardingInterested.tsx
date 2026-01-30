import React, { useState } from "react";
import { View, Text, ImageBackground, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";

const OnboardingInterested = () => {
  const navigation = useNavigation();
  const [selected, setSelected] = useState<string | null>(null);

  const options = ["Women", "Men", "Everyone"];

  return (
    <ImageBackground
      source={require("../assets/images/bg.png")}
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

        <Text style={styles.onboardTitle}>Who are you interested in seeing?</Text>

        <View style={styles.onboardOptions}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.onboardOption,
                selected === option && styles.onboardOptionActive,
              ]}
              onPress={() => setSelected(option)}
            >
              <Text
                style={[
                  styles.onboardOptionText,
                  selected === option && styles.onboardOptionTextActive,
                ]}
              >
                {option}
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
            onPress={() => navigation.navigate("Tab" as never)}
          >
            <Text style={styles.onboardNextText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
};

export default OnboardingInterested;
