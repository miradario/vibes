/** @format */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CardItem } from "../components";
import DiscoverOrbitCanvas from "../components/DiscoverOrbitCanvas";
import Filters from "../components/Filters";
import styles, { DIMENSION_WIDTH } from "../assets/styles";
import Icon from "../components/Icon";
import type { DataT } from "../types";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  mapCandidateToConnectionProfile,
  mapOwnProfileToConnectionProfile,
} from "../src/lib/connectionProfiles";
import { useCandidatesQuery } from "../src/queries/candidates.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useSwipeMutation } from "../src/queries/swipes.mutations";
import { handleApiError } from "../src/utils/handleApiError";

const Home = () => {
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const { data: ownProfileData } = useProfileQuery(session?.user?.id);
  const {
    data: candidates = [],
    isLoading,
    isError,
    error,
  } = useCandidatesQuery();
  const profiles = useMemo<DataT[]>(() => {
    return candidates.map((candidate) => {
      const profile = mapCandidateToConnectionProfile(candidate);
      return {
        ...profile,
        match: profile.match ?? "0",
      };
    }) as DataT[];
  }, [candidates]);
  const centerProfile = useMemo<DataT>(
    () =>
      ({
        ...mapOwnProfileToConnectionProfile(
          ownProfileData,
          session?.user?.email?.split("@")[0],
        ),
        match: "0",
      } as DataT),
    [ownProfileData, session?.user?.email],
  );
  const errorMessage =
    error instanceof Error && error.message.trim()
      ? error.message
      : "Could not load real profiles.";
  const orbitUsers = profiles.filter((item) => item.id !== centerProfile.id);
  const [showGallery, setShowGallery] = useState<boolean>(false);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState<number>(0);
  const [showProfileSheet, setShowProfileSheet] = useState<boolean>(false);
  const [selectedProfile, setSelectedProfile] = useState<DataT | null>(null);
  const swipeMutation = useSwipeMutation();

  const openGallery = (images: any[] | undefined, initialIndex = 0) => {
    if (!images || images.length === 0) return;
    setGalleryImages(images);
    setGalleryInitialIndex(
      initialIndex >= 0 && initialIndex < images.length ? initialIndex : 0,
    );
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
        onSuccess: (response) => {
          if (response?.match) {
            navigation.navigate("Match" as never, { profile } as never);
          }
        },
        onError: (error) =>
          handleApiError(error, { toastTitle: "Connect Error" }),
      },
    );

    closeProfileSheet();
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
      <SafeAreaView
        style={localStyles.safeArea}
        edges={["top", "left", "right"]}
      >
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
              key={`gallery-${galleryInitialIndex}-${galleryImages.length}`}
              data={galleryImages}
              keyExtractor={(_, index) => `gallery-${index}`}
              getItemLayout={(_, index) => ({
                length: DIMENSION_WIDTH,
                offset: DIMENSION_WIDTH * index,
                index,
              })}
              horizontal
              initialScrollIndex={galleryInitialIndex}
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
            <TouchableOpacity
              style={styles.discoverSheetCloseButton}
              onPress={closeProfileSheet}
              activeOpacity={0.9}
            >
              <Icon name="close" size={20} color="#2B2B2B" />
            </TouchableOpacity>
            <View style={styles.discoverSheetContainer}>
              <View style={styles.discoverSheetHandle} />
              {selectedProfile ? (
                <CardItem
                  variant="discover"
                  image={selectedProfile.image}
                  name={selectedProfile.name}
                  age={selectedProfile.age}
                  location={selectedProfile.location}
                  description={selectedProfile.description}
                  vibe={selectedProfile.vibe}
                  intention={selectedProfile.intention}
                  prompt={selectedProfile.prompt}
                  tags={selectedProfile.tags}
                  preferences={selectedProfile.preferences}
                  vegetarian={selectedProfile.vegetarian}
                  smoking={selectedProfile.smoking}
                  pets={selectedProfile.pets}
                  images={selectedProfile.images}
                  matches={selectedProfile.match}
                  onImagePress={(_image, index) =>
                    openGallery(
                      selectedProfile.images || [selectedProfile.image],
                      index ?? 0,
                    )
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
            {isLoading ? (
              <View style={localStyles.emptyState}>
                <ActivityIndicator color="#2B2B2B" />
                <Text style={localStyles.emptyStateText}>
                  Loading real profiles...
                </Text>
              </View>
            ) : isError ? (
              <View style={localStyles.emptyState}>
                <Text style={localStyles.emptyStateTitle}>
                  Could not load profiles
                </Text>
                <Text style={localStyles.emptyStateText}>{errorMessage}</Text>
              </View>
            ) : (
              <View style={localStyles.discoverOrbitContent}>
                <DiscoverOrbitCanvas
                  users={orbitUsers}
                  centerUser={centerProfile}
                  onCenterPress={() => navigation.navigate("Aura" as never)}
                  onUserPress={openProfileSheet}
                />
                {profiles.length === 0 ? (
                  <View style={localStyles.discoverOrbitHint}>
                    <Text style={localStyles.emptyStateTitle}>
                      No real profiles yet
                    </Text>
                    <Text style={localStyles.emptyStateText}>
                      Your profile stays in the center. Other users will appear
                      around it.
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>

          <View style={localStyles.discoverFiltersRow}>
            <Filters />
            <TouchableOpacity
              style={localStyles.discoverFilterChip}
              activeOpacity={0.9}
            >
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
  discoverOrbitContent: {
    flex: 1,
  },
  discoverOrbitHint: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 18,
    alignItems: "center",
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
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    color: "#2B2B2B",
    fontSize: 24,
    fontFamily: "CormorantGaramond_600SemiBold",
    textAlign: "center",
  },
  emptyStateText: {
    marginTop: 10,
    color: "rgba(43, 43, 43, 0.7)",
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "CormorantGaramond_500Medium",
    textAlign: "center",
  },
});

export default Home;
