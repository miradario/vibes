/** @format */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";

const SPIRITUAL_PATHS = [
  "Art of Living",
  "Ashtanga",
  "Kundalini",
  "Hatha Yoga",
  "Tantra",
  "Other",
];

const OnboardingSpiritualPath = () => {
  const navigation = useNavigation();
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [pathDescriptions, setPathDescriptions] = useState<{
    [key: string]: string;
  }>({});
  const [pathYears, setPathYears] = useState<{ [key: string]: string }>({});
  const [teacherPaths, setTeacherPaths] = useState<string[]>([]);
  const [teachingYears, setTeachingYears] = useState<{ [key: string]: string }>(
    {},
  );

  const progress = 100; // 6/6 steps

  const togglePath = (path: string) => {
    if (selectedPaths.includes(path)) {
      setSelectedPaths(selectedPaths.filter((p) => p !== path));
      setTeacherPaths(teacherPaths.filter((p) => p !== path));
      // Remove data when path is deselected
      const newDescriptions = { ...pathDescriptions };
      const newYears = { ...pathYears };
      const newTeachingYears = { ...teachingYears };
      delete newDescriptions[path];
      delete newYears[path];
      delete newTeachingYears[path];
      setPathDescriptions(newDescriptions);
      setPathYears(newYears);
      setTeachingYears(newTeachingYears);
    } else {
      setSelectedPaths([...selectedPaths, path]);
    }
  };

  const toggleTeacher = (path: string) => {
    if (teacherPaths.includes(path)) {
      setTeacherPaths(teacherPaths.filter((p) => p !== path));
      const newTeachingYears = { ...teachingYears };
      delete newTeachingYears[path];
      setTeachingYears(newTeachingYears);
    } else {
      setTeacherPaths([...teacherPaths, path]);
    }
  };

  const updateDescription = (path: string, description: string) => {
    setPathDescriptions({
      ...pathDescriptions,
      [path]: description,
    });
  };

  const updateYears = (path: string, years: string) => {
    setPathYears({
      ...pathYears,
      [path]: years,
    });
  };

  const updateTeachingYears = (path: string, years: string) => {
    setTeachingYears({
      ...teachingYears,
      [path]: years,
    });
  };

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

        <Text style={styles.onboardTitle}>Your spiritual path</Text>
        <Text style={styles.onboardSubtitle}>
          Select all that resonate with you
        </Text>

        <ScrollView
          style={styles.onboardList}
          showsVerticalScrollIndicator={false}
        >
          {SPIRITUAL_PATHS.map((path) => (
            <View key={path}>
              <TouchableOpacity
                style={styles.onboardListItem}
                onPress={() => togglePath(path)}
              >
                <Text style={styles.onboardListText}>{path}</Text>
                <View
                  style={[
                    styles.onboardCheck,
                    selectedPaths.includes(path) && styles.onboardCheckActive,
                  ]}
                />
              </TouchableOpacity>

              {selectedPaths.includes(path) && (
                <View style={{ paddingHorizontal: 20, paddingBottom: 15 }}>
                  <TextInput
                    style={[styles.loginInput, { marginTop: 0 }]}
                    placeholder={`Tell us about your ${path} practice...`}
                    placeholderTextColor="#6E6E6E"
                    multiline
                    numberOfLines={3}
                    value={pathDescriptions[path] || ""}
                    onChangeText={(text) => updateDescription(path, text)}
                  />
                  <Text style={[styles.loginLabel, { marginTop: 10 }]}>
                    How long have you been practicing?
                  </Text>
                  <TextInput
                    style={[styles.loginInput, { marginTop: 5 }]}
                    placeholder="e.g., 5 years"
                    placeholderTextColor="#6E6E6E"
                    value={pathYears[path] || ""}
                    onChangeText={(text) => updateYears(path, text)}
                  />

                  <TouchableOpacity
                    style={[
                      styles.onboardListItem,
                      {
                        backgroundColor: teacherPaths.includes(path)
                          ? "#F6F6F4"
                          : "transparent",
                        marginTop: 10,
                        paddingHorizontal: 0,
                      },
                    ]}
                    onPress={() => toggleTeacher(path)}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Icon
                        name="school"
                        size={18}
                        color={
                          teacherPaths.includes(path) ? "#D88C7A" : DARK_GRAY
                        }
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={[
                          styles.onboardListText,
                          {
                            fontSize: 14,
                            color: teacherPaths.includes(path)
                              ? "#D88C7A"
                              : "#2B2B2B",
                          },
                        ]}
                      >
                        I am a teacher of {path}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.onboardCheck,
                        teacherPaths.includes(path) &&
                          styles.onboardCheckActive,
                      ]}
                    />
                  </TouchableOpacity>

                  {teacherPaths.includes(path) && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.loginLabel}>
                        How long have you been teaching {path}?
                      </Text>
                      <TextInput
                        style={[styles.loginInput, { marginTop: 5 }]}
                        placeholder="e.g., 3 years"
                        placeholderTextColor="#6E6E6E"
                        value={teachingYears[path] || ""}
                        onChangeText={(text) => updateTeachingYears(path, text)}
                      />
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={styles.onboardFooter}>
          <TouchableOpacity
            style={[
              styles.onboardNext,
              selectedPaths.length === 0 && styles.onboardNextDisabled,
            ]}
            disabled={selectedPaths.length === 0}
            onPress={() => navigation.navigate("OnboardingInterested" as never)}
          >
            <Text style={styles.onboardNextText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default OnboardingSpiritualPath;
