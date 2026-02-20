/** @format */

import React, { useRef, useState } from "react";
import {
  View,
  Animated,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import CardStack, { Card } from "react-native-card-stack-swiper";

// Workaround: library typings do not declare `children` on CardStackProps.
const CardStackAny = CardStack as unknown as React.ComponentType<any>;
// Workaround: library typings do not declare `children` on Card props.
const CardAny = Card as unknown as React.ComponentType<any>;

import { CardItem } from "../components";
import styles, { DARK_GRAY } from "../assets/styles";
import DEMO from "../assets/data/demo";
import Icon from "../components/Icon";
import { useSwipeMutation } from "../src/queries/swipes.mutations";
import { handleApiError } from "../src/utils/handleApiError";

const Home = () => {
  const [swiper, setSwiper] = useState<CardStack | null>(null);
  const [swipeType, setSwipeType] = useState<"like" | "nope" | null>(null);
  const [likePhrase, setLikePhrase] = useState<string>("");
  const [nopePhrase, setNopePhrase] = useState<string>("");
  const [showGallery, setShowGallery] = useState<boolean>(false);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const navigation = useNavigation();
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const swipeProgress = useRef(new Animated.Value(0)).current;
  const swipeX = useRef(new Animated.Value(0)).current;
  const [showContact, setShowContact] = useState<boolean>(false);
  const [contactProfile, setContactProfile] = useState<any>(null);
  const likePhrases = [
    "Have faith",
    "She/He could be your soulmate",
    "Life is amazing",
    "People are amazing",
  ];
  const nopePhrases = [
    "Maybe next life",
    "Good luck to them",
    "She/He is amazing anyways",
    "People are amazing",
  ];
  const swipeMutation = useSwipeMutation();
  const logSwipeResult = (data: unknown) => {
    console.log("swipeMutation result:", data);
  };

  const triggerSwipeFeedback = (type: "like" | "nope") => {
    setSwipeType(type);
    if (type === "like") {
      const phrase =
        likePhrases[Math.floor(Math.random() * likePhrases.length)];
      setLikePhrase(phrase);
      setNopePhrase("");
    } else {
      const phrase =
        nopePhrases[Math.floor(Math.random() * nopePhrases.length)];
      setNopePhrase(phrase);
      setLikePhrase("");
    }
    swipeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(swipeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(swipeAnim, {
        toValue: 0,
        duration: 200,
        delay: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setSwipeType(null));
  };

  const openGallery = (images: any[] | undefined) => {
    if (!images || images.length === 0) return;
    setGalleryImages(images);
    setShowGallery(true);
  };

  const openContact = (profile: any) => {
    setContactProfile(profile);
    setShowContact(true);
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
        visible={showContact}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContact(false)}
      >
        <View style={styles.contactOverlay}>
          <View style={styles.contactCard}>
            <View style={styles.contactHeader}>
              <Text style={styles.contactTitle}>Library & Events</Text>
              <TouchableOpacity onPress={() => setShowContact(false)}>
                <Icon name="close" size={18} color="#2B2B2B" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.contactSectionHeader}
              onPress={() => {
                setShowContact(false);
                navigation.navigate("Meditations" as never);
              }}
            >
              <Text style={styles.contactSectionTitle}>Meditations</Text>
              <Icon name="chevron-forward" size={16} color={DARK_GRAY} />
            </TouchableOpacity>
            {(contactProfile?.meditations || []).map(
              (item: any, index: number) => (
                <TouchableOpacity
                  key={`cmed-${index}`}
                  style={styles.contactRow}
                  onPress={() => {
                    setShowContact(false);
                    navigation.navigate("Meditations" as never);
                  }}
                >
                  <Text style={styles.contactRowTitle}>{item.title}</Text>
                  <Text style={styles.contactRowMeta}>
                    {item.duration} · {item.access}
                  </Text>
                </TouchableOpacity>
              ),
            )}

            <TouchableOpacity
              style={styles.contactSectionHeader}
              onPress={() => {
                setShowContact(false);
                navigation.navigate("Videos" as never);
              }}
            >
              <Text style={styles.contactSectionTitle}>Videos</Text>
              <Icon name="chevron-forward" size={16} color={DARK_GRAY} />
            </TouchableOpacity>
            {(contactProfile?.videos || []).map((item: any, index: number) => (
              <TouchableOpacity
                key={`cvid-${index}`}
                style={styles.contactRow}
                onPress={() => {
                  setShowContact(false);
                  navigation.navigate("Videos" as never);
                }}
              >
                <Text style={styles.contactRowTitle}>{item.title}</Text>
                <Text style={styles.contactRowMeta}>
                  {item.duration} · {item.access}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.contactSectionHeader}
              onPress={() => {
                setShowContact(false);
                navigation.navigate("Events" as never);
              }}
            >
              <Text style={styles.contactSectionTitle}>Events</Text>
              <Icon name="chevron-forward" size={16} color={DARK_GRAY} />
            </TouchableOpacity>
            {(contactProfile?.events || []).map((item: any, index: number) => (
              <TouchableOpacity
                key={`cevt-${index}`}
                style={styles.contactRow}
                onPress={() => {
                  setShowContact(false);
                  navigation.navigate("Events" as never);
                }}
              >
                <Text style={styles.contactRowTitle}>{item.title}</Text>
                <Text style={styles.contactRowMeta}>
                  {item.date} · {item.location} · {item.access}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Tinder-like badges during swipe: LIKE (left), NOPE (right) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.swipeBadgeLike,
          {
            opacity: swipeX.interpolate({
              inputRange: [0, 80],
              outputRange: [0, 1],
            }),
            transform: [
              {
                scale: swipeX.interpolate({
                  inputRange: [0, 80],
                  outputRange: [0.4, 1],
                }),
              },
              {
                rotate: swipeX.interpolate({
                  inputRange: [0, 120],
                  outputRange: ["-25deg", "0deg"],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.swipeBadgeTextLike}>VIBE</Text>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.swipeBadgeNope,
          {
            opacity: swipeX.interpolate({
              inputRange: [-80, 0],
              outputRange: [1, 0],
            }),
            transform: [
              {
                scale: swipeX.interpolate({
                  inputRange: [-80, 0],
                  outputRange: [1, 0.4],
                }),
              },
              {
                rotate: swipeX.interpolate({
                  inputRange: [-120, 0],
                  outputRange: ["0deg", "25deg"],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.swipeBadgeTextNope}>LET GO</Text>
      </Animated.View>

      {/* Post-swipe feedback: centered icon + phrase */}
      {swipeType && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.swipeOverlay,
            {
              opacity: isSwiping ? 0 : swipeAnim,
              transform: [
                {
                  scale: swipeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 1],
                  }),
                },
                {
                  translateY: swipeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.swipeIconWrap}>
            <Icon
              name={swipeType === "like" ? "heart" : "heart-dislike"}
              size={34}
              color={swipeType === "like" ? "#AEBFD1" : "#D88C7A"}
            />
          </View>
          {swipeType === "nope" && nopePhrase ? (
            <Text style={styles.swipeText}>{nopePhrase}</Text>
          ) : null}
          {swipeType === "like" && likePhrase ? (
            <Text style={styles.swipeText}>{likePhrase}</Text>
          ) : null}
        </Animated.View>
      )}

      <View style={styles.containerHome}>
        <CardStackAny
          style={{ flex: 1 }}
          loop
          verticalSwipe={false}
          renderNoMoreCards={() => null}
          ref={(newSwiper: any): void => setSwiper(newSwiper)}
          onSwipeStart={() => {
            setIsSwiping(true);
            swipeProgress.setValue(0);
            swipeX.setValue(0);
          }}
          onSwipe={(x: number) => {
            const distance = Math.min(Math.abs(x), 120);
            const progress = distance / 120;
            swipeProgress.setValue(progress);
            swipeX.setValue(x);
            if (distance < 5) {
              setSwipeType(null);
              return;
            }
            setSwipeType(x > 0 ? "like" : "nope");
          }}
          onSwipeEnd={() => {
            setIsSwiping(false);
            swipeProgress.setValue(0);
            swipeX.setValue(0);
          }}
          onSwipedRight={(index: number) => {
            const item = DEMO[index];
            if (item) {
              swipeMutation.mutate(
                {
                  targetUserId: String(item.id),
                  direction: "like",
                },
                {
                  onSuccess: logSwipeResult,
                  onError: (error) =>
                    handleApiError(error, { toastTitle: "Swipe Error" }),
                },
              );
              if (Math.random() < 0.35) {
                navigation.navigate(
                  "Match" as never,
                  { profile: item } as never,
                );
              }
            }
            triggerSwipeFeedback("like");
          }}
          onSwipedLeft={(index: number) => {
            const item = DEMO[index];
            if (item) {
              swipeMutation.mutate(
                {
                  targetUserId: String(item.id),
                  direction: "pass",
                },
                {
                  onSuccess: logSwipeResult,
                  onError: (error) => handleApiError(error),
                },
              );
            }
            triggerSwipeFeedback("nope");
          }}
        >
          {DEMO.map((item) => (
            <CardAny key={item.id}>
              <CardItem
                hasActions
                variant="discover"
                image={item.image}
                name={item.name}
                location={item.location}
                description={item.description}
                vibe={item.vibe}
                intention={item.intention}
                prompt={item.prompt}
                tags={item.tags}
                images={item.images}
                matches={item.match}
                onImagePress={() => openGallery(item.images || [item.image])}
                onContactPress={() => openContact(item)}
              />
            </CardAny>
          ))}
        </CardStackAny>
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
  readabilityVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(246, 246, 244, 0.12)",
  },
});

export default Home;
