/** @format */

import React from "react";
import {
  ScrollView,
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Icon } from "../components";
import DEMO from "../assets/data/demo";
import styles, { DARK_GRAY, PRIMARY_COLOR, WHITE } from "../assets/styles";
import { useCandidatesQuery } from "../src/queries/candidates.queries";

const Profile = () => {
  const navigation = useNavigation();
  const { age, image, name } = DEMO[7];
  const { data: candidates, isError, error, isLoading } = useCandidatesQuery(); //Example usage of the query
  console.log(
    "Candidates data:",
    isError ? `Error getting candidates: ${error}` : candidates,
  );
  return (
    <ImageBackground
      source={require("../assets/images/backgroundSimple.png")}
      style={styles.bg}
    >
      <ScrollView
        style={styles.containerProfile}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.auraHeader}>
          <View style={styles.auraAvatarWrap}>
            <Image
              source={require("../assets/images/halo.png")}
              style={styles.auraAvatarHalo}
            />
            <Image source={image} style={styles.auraAvatar} />
          </View>
          <View style={styles.auraProgress}>
            <Text style={styles.auraProgressText}>20% complete</Text>
          </View>
          <View style={styles.auraNameRow}>
            <Text style={styles.auraName}>
              {name}
              {age ? `, ${age}` : ""}
            </Text>
            <View style={styles.auraVerified}>
              <Icon name="checkmark" size={12} color={WHITE} />
            </View>
          </View>
        </View>

        <View style={styles.auraActions}>
          <TouchableOpacity
            style={styles.auraActionItem}
            onPress={() => navigation.navigate("Settings" as never)}
          >
            <View style={styles.auraActionCircle}>
              <Icon name="settings" size={20} color={DARK_GRAY} />
            </View>
            <Text style={styles.auraActionLabel}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.auraActionItem}
            onPress={() => navigation.navigate("EditProfile" as never)}
          >
            <View style={styles.auraActionCircle}>
              <Icon name="pencil" size={20} color={DARK_GRAY} />
            </View>
            <Text style={styles.auraActionLabel}>Edit profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.auraActionItem}
            onPress={() => navigation.navigate("EditProfile" as never)}
          >
            <View
              style={[styles.auraActionCircle, { borderColor: PRIMARY_COLOR }]}
            >
              <Icon name="camera" size={20} color={PRIMARY_COLOR} />
            </View>
            <Text style={styles.auraActionLabel}>Add media</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.auraCard}>
          <Text style={styles.auraCardTitle}>Vibe Plus</Text>
          <Text style={styles.auraCardSubtitle}>
            Level up every action you take on Vibe.
          </Text>
          <View style={styles.auraDots}>
            <View style={[styles.auraDot, styles.auraDotActive]} />
            <View style={styles.auraDot} />
            <View style={styles.auraDot} />
            <View style={styles.auraDot} />
          </View>
          <TouchableOpacity
            style={styles.auraCta}
            onPress={() => navigation.navigate("Premium" as never)}
          >
            <Text style={styles.auraCtaText}>GET VIBE PLUS</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ImageBackground>
  );
};

export default Profile;
