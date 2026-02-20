/** @format */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";

const OnboardingName = () => {
  const navigation = useNavigation();
  const [name, setName] = useState("");

  const progress = 16; // 1/6 steps

  return (
    <View style={styles.bg}>
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

        <Text style={styles.onboardTitle}>What's your name?</Text>
        <Text style={styles.onboardSubtitle}>
          This is how it will appear on your profile
        </Text>

        <View style={styles.loginField}>
          <TextInput
            style={styles.loginInput}
            placeholder="Enter your name"
            placeholderTextColor="#9B91A6"
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
            maxLength={50}
          />
        </View>

        <View style={styles.onboardFooter}>
          <TouchableOpacity
            style={[
              styles.onboardNext,
              !name.trim() && styles.onboardNextDisabled,
            ]}
            disabled={!name.trim()}
            onPress={() => navigation.navigate("OnboardingAge" as never)}
          >
            <Text style={styles.onboardNextText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default OnboardingName;
