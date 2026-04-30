/** @format */

import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import DiscoverOrbitCanvas from "../components/DiscoverOrbitCanvas";
import Icon from "../components/Icon";
import UserProfileSheet from "../components/UserProfileSheet";
import styles, { DIMENSION_WIDTH } from "../assets/styles";
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

const Discover = () => {
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  const { data: ownProfileData } = useProfileQuery(session?.user?.id);
  const { data: candidates = [], isLoading, isError, error } = useCandidatesQuery();
  const swipeMutation = useSwipeMutation();
  const [selectedProfile, setSelectedProfile] = useState<DataT | null>(null);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

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

  const profiles = useMemo<DataT[]>(
    () =>
      candidates.map((candidate) => {
        const profile = mapCandidateToConnectionProfile(candidate);
        return { ...profile, match: profile.match ?? "0" } as DataT;
      }),
    [candidates],
  );

  const errorMessage =
    error instanceof Error && error.message.trim()
      ? error.message
      : "No se pudieron cargar perfiles reales.";

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
      { targetUserId: String(profile.id), direction: "like" },
      {
        onSuccess: (response) => {
          if (response?.match) {
            navigation.navigate("Match" as never, { profile } as never);
          }
        },
        onError: (connectError) =>
          handleApiError(connectError, { toastTitle: "Connect Error" }),
      },
    );

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

        <UserProfileSheet
          visible={showProfileSheet}
          profile={selectedProfile}
          onClose={() => setShowProfileSheet(false)}
          onImagePress={(_image, index) =>
            selectedProfile
              ? openGallery(
                  selectedProfile.images || [selectedProfile.image],
                  index ?? 0,
                )
              : undefined
          }
          onContactPress={() => connectProfile(selectedProfile)}
        />

        <View style={localStyles.header}>
          <Text style={localStyles.title}>Descubrir</Text>
        </View>

        <View style={localStyles.orbitWrap}>
          {isLoading ? (
            <View style={localStyles.emptyState}>
              <ActivityIndicator color="#2B2B2B" />
              <Text style={localStyles.emptyText}>Cargando perfiles reales...</Text>
            </View>
          ) : isError ? (
            <View style={localStyles.emptyState}>
              <Text style={localStyles.emptyTitle}>No se pudieron cargar</Text>
              <Text style={localStyles.emptyText}>{errorMessage}</Text>
            </View>
          ) : (
            <>
              <DiscoverOrbitCanvas
                users={profiles.filter((item) => item.id !== centerProfile.id)}
                centerUser={centerProfile}
                onCenterPress={() => navigation.navigate("Aura" as never)}
                onUserPress={(profile) => {
                  setSelectedProfile(profile);
                  setShowProfileSheet(true);
                }}
              />
              {profiles.length === 0 ? (
                <View style={localStyles.orbitHint}>
                  <Text style={localStyles.emptyTitle}>Todavía no hay perfiles reales</Text>
                  <Text style={localStyles.emptyText}>
                    Tu perfil queda en el centro. Las demás personas aparecerán alrededor.
                  </Text>
                </View>
              ) : null}
            </>
          )}
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
  header: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 6,
  },
  title: {
    color: "#2B2B2B",
    fontSize: 42,
    lineHeight: 46,
    fontFamily: "CormorantGaramond_700Bold",
  },
  orbitWrap: {
    flex: 1,
  },
  orbitHint: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 24,
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: "#2B2B2B",
    fontSize: 24,
    fontFamily: "CormorantGaramond_600SemiBold",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 10,
    color: "rgba(43, 43, 43, 0.7)",
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "CormorantGaramond_500Medium",
    textAlign: "center",
  },
});

export default Discover;
