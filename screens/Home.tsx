/** @format */

import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CardItem } from "../components";
import DiscoverOrbitCanvas from "../components/DiscoverOrbitCanvas";
import Filters from "../components/Filters";
import styles from "../assets/styles";
import DEMO from "../assets/data/demo";
import Icon from "../components/Icon";
import type { DataT } from "../types";
import { useSwipeMutation } from "../src/queries/swipes.mutations";
import { handleApiError } from "../src/utils/handleApiError";

const Home = () => {
  const navigation = useNavigation();
  const [showGallery, setShowGallery] = useState<boolean>(false);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [showProfileSheet, setShowProfileSheet] = useState<boolean>(false);
  const [selectedProfile, setSelectedProfile] = useState<DataT | null>(null);
  const swipeMutation = useSwipeMutation();

  const openGallery = (images: any[] | undefined) => {
    if (!images || images.length === 0) return;
    setGalleryImages(images);
    setShowGallery(true);
  };

  const connectProfile = (profile: DataT | null) => {
    if (!profile) return;

    swipeMutation.mutate(
      {
        targetUserId: String(profile.id),
        direction: "like",
      },
      {
        onError: (error) =>
          handleApiError(error, { toastTitle: "Connect Error" }),
      },
    );

    closeProfileSheet();
    if (Math.random() < 0.35) {
      navigation.navigate("Match" as never, { profile } as never);
    }
  };

  const openProfileSheet = (profile: DataT) => {
    setSelectedProfile(profile);
    setShowProfileSheet(true);
  };

  const closeProfileSheet = () => {
    setShowProfileSheet(false);
  };

  return (
    <View style={localStyles.screen}>
      <SafeAreaView style={localStyles.safeArea} edges={["top", "left", "right"]}>
        <Modal
          visible={showGallery}
          transparent
          animationType="fade"
          onRequestClose={() => setShowGallery(false)}
        >
          <View style={styles.galleryOverlay}>
            <TouchableOpacity
              style={styles.galleryClose}
              onPress={() => setShowGallery(false)}
            >
              <Icon name="close" size={18} color="#F6F6F4" />
            </TouchableOpacity>
            <FlatList
              data={galleryImages}
              keyExtractor={(_, index) => `gallery-${index}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.gallerySlide}>
                  <Image source={item} style={styles.galleryImage} />
                </View>
              )}
            />
          </View>
        </Modal>

        <Modal
          visible={showProfileSheet}
          transparent
          animationType="slide"
          onRequestClose={closeProfileSheet}
        >
          <View style={styles.discoverSheetRoot}>
            <TouchableOpacity
              activeOpacity={1}
              style={styles.discoverSheetBackdrop}
              onPress={closeProfileSheet}
            />
            <View style={styles.discoverSheetContainer}>
              <View style={styles.discoverSheetHandle} />
              {selectedProfile ? (
                <CardItem
                  variant="discover"
                  image={selectedProfile.image}
                  name={selectedProfile.name}
                  location={selectedProfile.location}
                  description={selectedProfile.description}
                  vibe={selectedProfile.vibe}
                  intention={selectedProfile.intention}
                  prompt={selectedProfile.prompt}
                  tags={selectedProfile.tags}
                  images={selectedProfile.images}
                  matches={selectedProfile.match}
                  onImagePress={() =>
                    openGallery(selectedProfile.images || [selectedProfile.image])
                  }
                  onContactPress={() => connectProfile(selectedProfile)}
                />
              ) : null}
            </View>
          </View>
        </Modal>

        <View style={styles.containerHome}>
          <View style={localStyles.discoverTop}>
            <Text style={localStyles.discoverTitle}>Vibes</Text>
          </View>

          <View style={localStyles.discoverOrbitWrap}>
            <DiscoverOrbitCanvas users={DEMO} onUserPress={openProfileSheet} />
          </View>

          <View style={localStyles.discoverFiltersRow}>
            <Filters />
            <TouchableOpacity style={localStyles.discoverFilterChip} activeOpacity={0.9}>
              <Text style={localStyles.discoverFilterChipText}>Distance</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const localStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F6F4",
  },
  safeArea: {
    flex: 1,
  },
  discoverTop: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 6,
  },
  discoverTitle: {
    fontSize: 42,
    lineHeight: 46,
    color: "#2B2B2B",
    fontFamily: "CormorantGaramond_700Bold",
    letterSpacing: 0.3,
  },
  discoverOrbitWrap: {
    flex: 1,
    width: "100%",
  },
  discoverFiltersRow: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  discoverFilterChip: {
    backgroundColor: "#F6F6F4",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.12)",
    paddingHorizontal: 16,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  discoverFilterChipText: {
    color: "#2B2B2B",
    fontSize: 14,
    fontFamily: "CormorantGaramond_500Medium",
  },
});

export default Home;
