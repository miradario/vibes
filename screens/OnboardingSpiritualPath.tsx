/** @format */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { ResizeMode, Video } from "expo-av";
import { useNavigation } from "@react-navigation/native";
import styles, { DARK_GRAY } from "../assets/styles";
import Icon from "../components/Icon";
import SpiritualPathDetailsModal from "../components/SpiritualPathDetailsModal";
import {
  getSelectedSpiritualPaths,
  hasSpiritualPathDetail,
  normalizeSpiritualPathDetail,
  normalizeSpiritualPathDetails,
  SPIRITUAL_PATH_OPTIONS,
  type SpiritualPathDetail,
  type SpiritualPathDetails,
} from "../src/lib/spiritualPaths";
import { useOnboardingDraft } from "../src/queries/onboarding.queries";

const OnboardingSpiritualPath = () => {
  const navigation = useNavigation();
  const { draft, updateDraft } = useOnboardingDraft();
  const [selectedPaths, setSelectedPaths] = useState<string[]>(
    getSelectedSpiritualPaths(draft.spiritualPath, draft.spiritualPathDetails),
  );
  const [pathDetails, setPathDetails] = useState<SpiritualPathDetails>(
    normalizeSpiritualPathDetails(draft.spiritualPathDetails),
  );
  const [activePath, setActivePath] = useState<string | null>(null);

  const progress = 66;

  const openPathEditor = (path: string) => {
    setSelectedPaths((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setActivePath(path);
  };

  const updatePathDetail = (path: string, nextDetail: SpiritualPathDetail) => {
    setPathDetails((prev) => ({
      ...prev,
      [path]: normalizeSpiritualPathDetail(nextDetail),
    }));
  };

  const removePath = (path: string) => {
    setSelectedPaths((prev) => prev.filter((item) => item !== path));
    setPathDetails((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    setActivePath(null);
  };

  const continueOnboarding = () => {
    updateDraft({
      spiritualPath: selectedPaths,
      spiritualPathDetails: pathDetails,
    });
    navigation.navigate("OnboardingGender" as never);
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
          Select what resonates. Every path can include optional details.
        </Text>

        <ScrollView
          style={styles.onboardList}
          showsVerticalScrollIndicator={false}
        >
          {SPIRITUAL_PATH_OPTIONS.map((path) => (
            <TouchableOpacity
              key={path}
              style={styles.onboardListItem}
              onPress={() => openPathEditor(path)}
            >
              <View>
                <Text style={styles.onboardListText}>{path}</Text>
                {selectedPaths.includes(path) ? (
                  <Text style={localStyles.selectedPathHint}>
                    {hasSpiritualPathDetail(pathDetails[path])
                      ? "Editar datos opcionales"
                      : "Agregar datos opcionales"}
                  </Text>
                ) : null}
              </View>
              <View
                style={[
                  styles.onboardCheck,
                  selectedPaths.includes(path) && styles.onboardCheckActive,
                ]}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>

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
          <TouchableOpacity style={styles.onboardNext} onPress={continueOnboarding}>
            <Text style={styles.onboardNextText}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={localStyles.skipButton} onPress={continueOnboarding}>
            <Text style={styles.onboardSkip}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SpiritualPathDetailsModal
        visible={Boolean(activePath)}
        pathLabel={activePath}
        detail={activePath ? pathDetails[activePath] ?? {} : {}}
        onChange={(nextDetail) => {
          if (!activePath) return;
          updatePathDetail(activePath, nextDetail);
        }}
        onClose={() => setActivePath(null)}
        onRemove={activePath ? () => removePath(activePath) : undefined}
      />
    </View>
  );
};

export default OnboardingSpiritualPath;

const localStyles = StyleSheet.create({
  videoWrap: {
    width: "100%",
    height: 220,
    marginTop: 18,
    marginBottom: 12,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  selectedPathHint: {
    color: "#8C7B63",
    fontSize: 13,
    marginTop: 2,
  },
  skipButton: {
    alignItems: "center",
    marginTop: 10,
  },
});
