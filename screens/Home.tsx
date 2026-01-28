import React, { useRef, useState } from "react";
import {
  View,
  ImageBackground,
  Animated,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import CardStack, { Card } from "react-native-card-stack-swiper";
import { Filters, CardItem } from "../components";
import styles, { DARK_GRAY } from "../assets/styles";
import DEMO from "../assets/data/demo";
import Icon from "../components/Icon";

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
    <ImageBackground
      source={require("../assets/images/bg.png")}
      style={styles.bg}
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
            <Icon name="close" size={18} color="#FFFFFF" />
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
                <Icon name="close" size={18} color="#000000" />
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
              )
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
            {(contactProfile?.videos || []).map(
              (item: any, index: number) => (
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
              )
            )}

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
            {(contactProfile?.events || []).map(
              (item: any, index: number) => (
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
              )
            )}
          </View>
        </View>
      </Modal>

      {swipeType && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.swipeOverlay,
            {
              opacity: isSwiping ? swipeProgress : swipeAnim,
              transform: [
                {
                  scale: (isSwiping ? swipeProgress : swipeAnim).interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 1],
                  }),
                },
                {
                  translateY: (isSwiping ? swipeProgress : swipeAnim).interpolate({
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
              color={swipeType === "like" ? "#2F8F83" : "#B76E5A"}
            />
          </View>
          {!isSwiping && swipeType === "nope" && nopePhrase ? (
            <Text style={styles.swipeText}>{nopePhrase}</Text>
          ) : null}
          {!isSwiping && swipeType === "like" && likePhrase ? (
            <Text style={styles.swipeText}>{likePhrase}</Text>
          ) : null}
        </Animated.View>
      )}

      <View style={styles.containerHome}>
        <View style={styles.top}>
          <Filters />
          <TouchableOpacity
            style={styles.meditatePill}
            onPress={() => navigation.navigate("Meditations" as never)}
          >
            <Icon name="moon" size={13} color={DARK_GRAY} />
            <Text style={styles.meditateText}>Meditate</Text>
          </TouchableOpacity>
        </View>

        <CardStack
          loop
          verticalSwipe={false}
          renderNoMoreCards={() => null}
          ref={(newSwiper): void => setSwiper(newSwiper)}
          onSwipeStart={() => {
            setIsSwiping(true);
            swipeProgress.setValue(0);
          }}
          onSwipe={(x) => {
            const distance = Math.min(Math.abs(x), 120);
            const progress = distance / 120;
            swipeProgress.setValue(progress);
            if (distance < 5) {
              setSwipeType(null);
              return;
            }
            setSwipeType(x > 0 ? "like" : "nope");
          }}
          onSwipeEnd={() => {
            setIsSwiping(false);
            swipeProgress.setValue(0);
          }}
          onSwipedRight={() => triggerSwipeFeedback("like")}
          onSwipedLeft={() => triggerSwipeFeedback("nope")}
        >
          {DEMO.map((item) => (
            <Card key={item.id}>
              <CardItem
                hasActions
                image={item.image}
                name={item.name}
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
            </Card>
          ))}
        </CardStack>
      </View>
    </ImageBackground>
  );
};

export default Home;
