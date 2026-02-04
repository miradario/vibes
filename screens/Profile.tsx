import React from "react";
import { ScrollView, View, Text, ImageBackground, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Icon } from "../components";
import DEMO from "../assets/data/demo";
import styles from "../assets/styles";

const ValuePill = ({ label }: { label: string }) => (
  <View style={styles.profileValuePill}>
    <Text style={styles.profileValueText}>{label}</Text>
  </View>
);

const InfoPill = ({ label }: { label: string }) => (
  <View style={styles.profileInfoPill}>
    <Text style={styles.profileInfoText}>{label}</Text>
  </View>
);

const Profile = () => {
  const navigation = useNavigation();
  const profile = DEMO[7];
  const values = [profile.vibe, profile.intention].filter(Boolean).slice(0, 3) as string[];
  const practiceTags = (profile.tags || []).filter(Boolean);
  return (
    <ImageBackground source={require("../assets/images/bg.png")} style={styles.bg}>
      <ScrollView
        style={styles.containerProfile}
        contentContainerStyle={styles.profileCalmContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <Text style={styles.profileName}>
            {profile.name}
            {profile.age ? `, ${profile.age}` : ""}
          </Text>
          {profile.description ? (
            <Text style={styles.profileEssence}>{profile.description}</Text>
          ) : null}
          {profile.prompt ? (
            <Text style={styles.profileEssenceMuted}>{profile.prompt}</Text>
          ) : null}
        </View>

        {values.length > 0 ? (
          <View style={styles.profileValueRow}>
            {values.map((value, index) => (
              <ValuePill key={`value-${index}`} label={value} />
            ))}
          </View>
        ) : null}

        {practiceTags.length > 0 ? (
          <View style={styles.profilePracticeSection}>
            <Text style={styles.profileSectionLabel}>Practice & Lifestyle</Text>
            <View style={styles.profileInfoRow}>
              {practiceTags.map((tag, index) => (
                <InfoPill key={`practice-${index}`} label={tag} />
              ))}
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.profilePrimaryCta}
          onPress={() => navigation.navigate("Chat" as never, { profile } as never)}
        >
          <Icon name="library" size={16} color="#FFFFFF" />
          <Text style={styles.profilePrimaryCtaText}>Assets shared</Text>
        </TouchableOpacity>

        <View style={styles.profileSecondaryActions}>
          <TouchableOpacity style={styles.profileActionButton}>
            <Icon name="star" size={18} color="#8A7D75" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileActionButton}>
            <Icon name="heart" size={20} color="#8A7D75" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileActionButton}>
            <Icon name="close" size={20} color="#8A7D75" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileActionButton}>
            <Icon name="moon" size={18} color="#8A7D75" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ImageBackground>
  );
};

export default Profile;
