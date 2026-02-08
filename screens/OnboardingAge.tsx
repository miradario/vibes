/** @format */

import React, { useState } from "react";
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";

const OnboardingAge = () => {
  const navigation = useNavigation();
  const [age, setAge] = useState("");

  const progress = 33; // 2/6 steps

  const isValidAge = () => {
    const ageNum = parseInt(age);
    return ageNum >= 18 && ageNum <= 100;
  };

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
            <View
              style={[styles.onboardProgressFill, { width: `${progress}%` }]}
            />
          </View>
          <View style={{ width: 40 }}>
            <Text style={styles.onboardSkip}>{progress}%</Text>
          </View>
        </View>

        <Text style={styles.onboardTitle}>How old are you?</Text>
        <Text style={styles.onboardSubtitle}>
          You must be at least 18 years old
        </Text>

        <View style={styles.loginField}>
          <TextInput
            style={styles.loginInput}
            placeholder="Enter your age"
            placeholderTextColor="#9B91A6"
            keyboardType="number-pad"
            value={age}
            onChangeText={setAge}
            maxLength={3}
          />
        </View>

        <View style={styles.onboardFooter}>
          <TouchableOpacity
            style={[
              styles.onboardNext,
              !isValidAge() && styles.onboardNextDisabled,
            ]}
            disabled={!isValidAge()}
            onPress={() => navigation.navigate("OnboardingGender" as never)}
          >
            <Text style={styles.onboardNextText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
};

export default OnboardingAge;
