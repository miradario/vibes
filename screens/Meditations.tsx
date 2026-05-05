import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Audio, ResizeMode, type AVPlaybackStatus } from "expo-av";
import Icon from "../components/Icon";
import LoopingVideo from "../components/LoopingVideo";
import { vibesTheme } from "../src/theme/vibesTheme";

type MeditationType = "silent" | "guided";
type DurationOption = 5 | 10 | 20;
type MusicValue = null | "nature" | "bowls" | "soft_mantra" | "rain";

type PracticeOption = {
  value: MeditationType;
  title: string;
  subtitle: string;
  iconName: string;
  iconTint: string;
};

type MusicOption = {
  value: MusicValue;
  title: string;
  subtitle: string;
  iconName: string;
};

const PRACTICE_OPTIONS: PracticeOption[] = [
  {
    value: "silent",
    title: "Silencio",
    subtitle: "Solo tú y tu respiración",
    iconName: "body-outline",
    iconTint: "rgba(174, 191, 209, 0.26)",
  },
  {
    value: "guided",
    title: "Guiada",
    subtitle: "Una voz que te acompaña",
    iconName: "headset-outline",
    iconTint: "rgba(228, 183, 110, 0.28)",
  },
];

const DURATION_OPTIONS: DurationOption[] = [5, 10, 20];

const MUSIC_OPTIONS: MusicOption[] = [
  {
    value: null,
    title: "Sin música",
    subtitle: "Ambiente en silencio",
    iconName: "musical-notes-outline",
  },
  {
    value: "nature",
    title: "Naturaleza",
    subtitle: "Viento, hojas y pájaros suaves",
    iconName: "leaf-outline",
  },
  {
    value: "bowls",
    title: "Cuencos",
    subtitle: "Resonancia cálida y envolvente",
    iconName: "radio-outline",
  },
  {
    value: "soft_mantra",
    title: "Mantra suave",
    subtitle: "Voz serena de fondo",
    iconName: "sparkles-outline",
  },
  {
    value: "rain",
    title: "Lluvia",
    subtitle: "Gotas delicadas y calma profunda",
    iconName: "rainy-outline",
  },
];

const TAB_ITEMS = [
  { key: "explore", label: "Explorar", icon: "compass-outline" },
  { key: "challenges", label: "Desafíos", icon: "trophy-outline" },
  { key: "home", label: "Home", icon: "home-outline" },
  { key: "vibes", label: "Vibes", icon: "musical-notes-outline" },
  { key: "profile", label: "Perfil", icon: "person-outline" },
] as const;

const AUDIO_BY_DURATION: Record<DurationOption, number> = {
  5: require("../assets/audio/meditation/meditation5min.mp3"),
  10: require("../assets/audio/meditation/meditation10min.mp3"),
  20: require("../assets/audio/meditation/meditation20min.mp3"),
};

const VIDEO_RATE_BY_DURATION: Record<DurationOption, number> = {
  5: 1.2,
  10: 1,
  20: 0.82,
};

const formatDuration = (minutes: number) => `${String(minutes).padStart(2, "0")}:00`;
const formatMillis = (millis: number) => {
  const safeMillis = Math.max(0, Math.floor(millis));
  const totalSeconds = Math.floor(safeMillis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <Text style={localStyles.sectionLabel}>{children}</Text>
);

const SelectablePracticeCard = ({
  option,
  selected,
  onPress,
}: {
  option: PracticeOption;
  selected: boolean;
  onPress: () => void;
}) => {
  const scale = useSharedValue(selected ? 1.02 : 1);
  const checkOpacity = useSharedValue(selected ? 1 : 0);

  React.useEffect(() => {
    scale.value = withSpring(selected ? 1.02 : 1, {
      damping: 15,
      stiffness: 180,
    });
    checkOpacity.value = withTiming(selected ? 1 : 0, { duration: 180 });
  }, [checkOpacity, scale, selected]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: 0.88 + checkOpacity.value * 0.12 }],
  }));

  return (
    <Animated.View style={[localStyles.practiceCardWrap, cardStyle]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={[
          localStyles.practiceCard,
          selected ? localStyles.practiceCardSelected : null,
        ]}
      >
        <Animated.View style={[localStyles.checkWrap, checkStyle]}>
          <Icon
            name="checkmark-circle"
            size={22}
            color={vibesTheme.colors.accentBlue}
          />
        </Animated.View>

        <View
          style={[
            localStyles.practiceIconCircle,
            { backgroundColor: option.iconTint },
          ]}
        >
          <Icon
            name={option.iconName}
            size={28}
            color={vibesTheme.colors.lineArt}
          />
        </View>

        <Text style={localStyles.practiceTitle}>{option.title}</Text>
        <Text style={localStyles.practiceSubtitle}>{option.subtitle}</Text>
      </Pressable>
    </Animated.View>
  );
};

const DurationCard = ({
  value,
  selected,
  onPress,
}: {
  value: DurationOption;
  selected: boolean;
  onPress: () => void;
}) => {
  const scale = useSharedValue(selected ? 1.02 : 1);
  const checkOpacity = useSharedValue(selected ? 1 : 0);

  React.useEffect(() => {
    scale.value = withSpring(selected ? 1.02 : 1, {
      damping: 15,
      stiffness: 180,
    });
    checkOpacity.value = withTiming(selected ? 1 : 0, { duration: 180 });
  }, [checkOpacity, scale, selected]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
  }));

  return (
    <Animated.View style={[localStyles.durationCardWrap, cardStyle]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={[
          localStyles.durationCard,
          selected ? localStyles.durationCardSelected : null,
        ]}
      >
        <Animated.View style={[localStyles.durationCheckWrap, checkStyle]}>
          <Icon
            name="checkmark-circle"
            size={22}
            color={vibesTheme.colors.accentBlue}
          />
        </Animated.View>
        <Text style={localStyles.durationValue}>{value}</Text>
        <Text style={localStyles.durationLabel}>minutos</Text>
      </Pressable>
    </Animated.View>
  );
};

const CTAButton = ({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}) => {
  const pressScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={() => {
          pressScale.value = withTiming(0.985, { duration: 90 });
        }}
        onPressOut={() => {
          pressScale.value = withTiming(1, { duration: 110 });
        }}
        style={localStyles.ctaButton}
      >
        <Icon name="play" size={18} color="#F6F6F4" />
        <Text style={localStyles.ctaLabel}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
};

const BottomTabPreview = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const handleTabPress = (key: (typeof TAB_ITEMS)[number]["key"]) => {
    if (key === "explore") {
      navigation.navigate("Tab" as never, { screen: "Discover" } as never);
      return;
    }

    if (key === "challenges") {
      navigation.navigate("Events" as never, { section: "challenge" } as never);
      return;
    }

    if (key === "home") {
      navigation.navigate("Tab" as never, { screen: "Home" } as never);
      return;
    }

    if (key === "vibes") {
      navigation.navigate("Meditations" as never);
      return;
    }

    navigation.navigate("Tab" as never, { screen: "Aura" } as never);
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        localStyles.bottomBarOuter,
        { paddingBottom: Math.max(insets.bottom, 14) },
      ]}
    >
      <View style={localStyles.bottomBar}>
        {TAB_ITEMS.map((item, index) => {
          const isHome = item.key === "home";
          const isVibes = item.key === "vibes";

          return (
            <Pressable
              key={item.key}
              onPress={() => handleTabPress(item.key)}
              style={[
                localStyles.tabItem,
                isHome ? localStyles.tabItemHome : null,
                index === 3 ? localStyles.tabItemShifted : null,
              ]}
            >
              {isHome ? (
                <>
                  <View style={localStyles.homeBubble}>
                    <Icon
                      name="home"
                      size={24}
                      color={vibesTheme.colors.primaryText}
                    />
                  </View>
                  <Text style={[localStyles.tabLabel, localStyles.homeTabLabel]}>
                    {item.label}
                  </Text>
                </>
              ) : (
                <>
                  <View
                    style={[
                      localStyles.iconBubble,
                      isVibes ? localStyles.iconBubbleActive : null,
                    ]}
                  >
                    <Icon
                      name={item.icon}
                      size={22}
                      color={vibesTheme.colors.primaryText}
                    />
                  </View>
                  <Text
                    style={[
                      localStyles.tabLabel,
                      isVibes ? localStyles.tabLabelActive : null,
                    ]}
                  >
                    {item.label}
                  </Text>
                </>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const MeditationScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const soundRef = useRef<Audio.Sound | null>(null);
  const shouldResumeOnReloadRef = useRef(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedType, setSelectedType] = useState<MeditationType>("silent");
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>(10);
  const [selectedMusic, setSelectedMusic] = useState<MusicValue>(null);
  const [isMusicOpen, setIsMusicOpen] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreparingAudio, setIsPreparingAudio] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(selectedDuration * 60 * 1000);
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);

  const selectedMusicOption = useMemo(
    () => MUSIC_OPTIONS.find((option) => option.value === selectedMusic) ?? MUSIC_OPTIONS[0],
    [selectedMusic],
  );
  const selectedAudioSource = useMemo(
    () => AUDIO_BY_DURATION[selectedDuration],
    [selectedDuration],
  );
  const selectedVideoRate = useMemo(
    () => VIDEO_RATE_BY_DURATION[selectedDuration],
    [selectedDuration],
  );

  const meditationPayload = useMemo(
    () => ({
      type: selectedType,
      duration: selectedDuration,
      music: selectedMusic,
    }),
    [selectedDuration, selectedMusic, selectedType],
  );

  const totalDurationLabel = formatMillis(durationMillis);
  const currentTimeLabel = formatMillis(positionMillis);
  const progressRatio =
    durationMillis > 0 ? Math.min(Math.max(positionMillis / durationMillis, 0), 1) : 0;
  const playerTitle =
    selectedType === "guided" ? "Conexión profunda" : "Silencio interior";
  const playerSubtitle =
    selectedType === "guided"
      ? `Meditación guiada · ${selectedDuration} minutos`
      : `Meditación en silencio · ${selectedDuration} minutos`;
  const playerMantra =
    selectedType === "guided"
      ? "Respira y vuelve a ti."
      : "Respira y escucha tu interior.";

  const updatePlaybackState = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        setIsPlayerReady(false);
        setIsPlaying(false);
        setPositionMillis(0);
        setDurationMillis(selectedDuration * 60 * 1000);
        if (status.error) {
          console.warn("[MeditationScreen] playback error", status.error);
        }
        return;
      }

      setIsPlayerReady(true);
      setIsPlaying(status.isPlaying);
      setPositionMillis(status.positionMillis ?? 0);
      setDurationMillis(
        typeof status.durationMillis === "number"
          ? status.durationMillis
          : selectedDuration * 60 * 1000,
      );
    },
    [selectedDuration],
  );

  const unloadSound = useCallback(async () => {
    const activeSound = soundRef.current;
    soundRef.current = null;
    if (!activeSound) return;
    activeSound.setOnPlaybackStatusUpdate(null);
    await activeSound.unloadAsync();
  }, []);

  const loadMeditationAudio = useCallback(
    async (shouldPlay: boolean) => {
      setIsPreparingAudio(true);

      try {
        await unloadSound();

        const sound = new Audio.Sound();
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate(updatePlaybackState);

        await sound.loadAsync(
          selectedAudioSource,
          {
            shouldPlay,
            progressUpdateIntervalMillis: 250,
            positionMillis: 0,
          },
          true,
        );
      } finally {
        setIsPreparingAudio(false);
      }
    },
    [selectedAudioSource, unloadSound, updatePlaybackState],
  );

  useEffect(() => {
    shouldResumeOnReloadRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {
      // Keep the UI usable even if audio mode setup fails.
    });
  }, []);

  useEffect(() => {
    loadMeditationAudio(shouldResumeOnReloadRef.current).catch(() => {
      Alert.alert("Audio no disponible", "No se pudo cargar esta meditación.");
    });

    return () => {
      unloadSound().catch(() => undefined);
    };
  }, [loadMeditationAudio, unloadSound]);

  const togglePlayback = useCallback(async () => {
    try {
      if (!soundRef.current || !isPlayerReady) {
        await loadMeditationAudio(true);
        return;
      }

      if (isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch {
      Alert.alert("No se pudo reproducir", "Intentá nuevamente en unos segundos.");
    }
  }, [isPlayerReady, isPlaying, loadMeditationAudio]);

  const skipBySeconds = useCallback(
    async (seconds: number) => {
      if (!soundRef.current || !isPlayerReady) return;
      const nextPosition = Math.max(
        0,
        Math.min(durationMillis, positionMillis + seconds * 1000),
      );
      await soundRef.current.setPositionAsync(nextPosition);
    },
    [durationMillis, isPlayerReady, positionMillis],
  );

  const handleSeekPress = useCallback(
    async (event: any) => {
      if (!soundRef.current || !isPlayerReady || progressTrackWidth <= 0) return;
      const ratio = Math.min(
        Math.max(event.nativeEvent.locationX / progressTrackWidth, 0),
        1,
      );
      await soundRef.current.setPositionAsync(ratio * durationMillis);
    },
    [durationMillis, isPlayerReady, progressTrackWidth],
  );

  const handleProgressLayout = useCallback((event: LayoutChangeEvent) => {
    setProgressTrackWidth(event.nativeEvent.layout.width);
  }, []);

  return (
    <View style={localStyles.screen}>
      <SafeAreaView style={localStyles.safeArea} edges={["top", "left", "right"]}>
        <ScrollView
          contentContainerStyle={[
            localStyles.scrollContent,
            {
              paddingBottom:
                Math.max(insets.bottom, 18) + 190,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={localStyles.headerRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.goBack()}
              style={localStyles.headerButton}
            >
              <Icon
                name="chevron-back"
                size={26}
                color={vibesTheme.colors.primaryText}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setIsFavorite((current) => !current)}
              style={localStyles.headerButton}
            >
              <Icon
                name={isFavorite ? "heart" : "heart-outline"}
                size={24}
                color={vibesTheme.colors.primaryText}
              />
            </Pressable>
          </View>

          <Text style={localStyles.title}>Meditación</Text>
          <Text style={localStyles.subtitle}>Elige tu práctica para hoy</Text>

          <View style={localStyles.section}>
            <SectionLabel>TIPO DE PRÁCTICA</SectionLabel>
            <View style={localStyles.practiceRow}>
              {PRACTICE_OPTIONS.map((option) => (
                <SelectablePracticeCard
                  key={option.value}
                  option={option}
                  selected={selectedType === option.value}
                  onPress={() => setSelectedType(option.value)}
                />
              ))}
            </View>
          </View>

          <View style={localStyles.section}>
            <SectionLabel>DURACIÓN</SectionLabel>
            <View style={localStyles.durationRow}>
              {DURATION_OPTIONS.map((duration) => (
                <DurationCard
                  key={duration}
                  value={duration}
                  selected={selectedDuration === duration}
                  onPress={() => setSelectedDuration(duration)}
                />
              ))}
            </View>
          </View>

          <View style={localStyles.section}>
            <SectionLabel>MÚSICA DE FONDO (OPCIONAL)</SectionLabel>

            <Pressable
              accessibilityRole="button"
              onPress={() => setIsMusicOpen((current) => !current)}
              style={localStyles.musicSelector}
            >
              <View style={localStyles.musicSelectorLeft}>
                <View style={localStyles.musicIconBubble}>
                  <Icon
                    name={selectedMusicOption.iconName}
                    size={22}
                    color={vibesTheme.colors.primaryText}
                  />
                </View>
                <View style={localStyles.musicTextWrap}>
                  <Text style={localStyles.musicTitle}>
                    {selectedMusicOption.title}
                  </Text>
                  <Text style={localStyles.musicSubtitle}>
                    {selectedMusicOption.subtitle}
                  </Text>
                </View>
              </View>
              <Icon
                name={isMusicOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color={vibesTheme.colors.secondaryText}
              />
            </Pressable>

            {isMusicOpen ? (
              <View style={localStyles.musicOptionsPanel}>
                {MUSIC_OPTIONS.map((option, index) => {
                  const isSelected = selectedMusic === option.value;

                  return (
                    <Pressable
                      key={String(option.value ?? "none")}
                      onPress={() => {
                        setSelectedMusic(option.value);
                        setIsMusicOpen(false);
                      }}
                      style={[
                        localStyles.musicOptionRow,
                        index < MUSIC_OPTIONS.length - 1
                          ? localStyles.musicOptionDivider
                          : null,
                      ]}
                    >
                      <View style={localStyles.musicOptionCopy}>
                        <Text style={localStyles.musicOptionTitle}>
                          {option.title}
                        </Text>
                        <Text style={localStyles.musicOptionSubtitle}>
                          {option.subtitle}
                        </Text>
                      </View>
                      <Icon
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                        size={20}
                        color={
                          isSelected
                            ? vibesTheme.colors.accentBlue
                            : "rgba(43, 43, 43, 0.24)"
                        }
                      />
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>

          <View style={localStyles.previewCard}>
            <View style={localStyles.previewPlayerHeader}>
              <Text style={localStyles.previewPlayerTitle}>{playerTitle}</Text>
              <Text style={localStyles.previewPlayerSubtitle}>{playerSubtitle}</Text>
              <View style={localStyles.previewPlayerDivider} />
            </View>

            <View style={localStyles.previewMediaFrame}>
              <LoopingVideo
                source={require("../assets/videos/meditation/videoMeditation.mp4")}
                resizeMode={ResizeMode.COVER}
                shouldPlay={isPlaying || isPreparingAudio}
                isMuted
                isLooping
                rate={selectedVideoRate}
                style={localStyles.previewVideo}
              />
              <View style={localStyles.previewOverlay} />
              <View style={localStyles.previewTopRow}>
                <View style={localStyles.durationBadge}>
                  <Text style={localStyles.durationBadgeText}>
                    {totalDurationLabel}
                  </Text>
                </View>
              </View>
            </View>

            <View style={localStyles.previewBottom}>
              <Text style={localStyles.previewMantra}>{playerMantra}</Text>
              <View style={localStyles.progressMetaRow}>
                <Text style={localStyles.progressTime}>{currentTimeLabel}</Text>
                <Text style={localStyles.progressTime}>{totalDurationLabel}</Text>
              </View>
              <Pressable
                accessibilityRole="adjustable"
                onLayout={handleProgressLayout}
                onPress={(event) => {
                  void handleSeekPress(event);
                }}
                style={localStyles.progressTrack}
              >
                <View
                  style={[
                    localStyles.progressFill,
                  { width: `${progressRatio * 100}%` },
                  ]}
                />
                <View
                  style={[
                    localStyles.progressThumb,
                    { left: `${progressRatio * 100}%` },
                  ]}
                />
              </Pressable>
              <View style={localStyles.controlRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void togglePlayback();
                  }}
                  style={localStyles.primaryControl}
                >
                  <Icon
                    name={
                      isPreparingAudio
                        ? "hourglass-outline"
                        : isPlaying
                          ? "pause"
                          : "play"
                    }
                    size={24}
                    color="#F6F6F4"
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void skipBySeconds(15);
                  }}
                  style={localStyles.secondaryControl}
                >
                  <Text style={localStyles.secondaryControlText}>15s</Text>
                  <Icon name="refresh-outline" size={20} color={vibesTheme.colors.primaryText} style={localStyles.forwardIcon} />
                </Pressable>
              </View>
            </View>
          </View>

          <CTAButton
            label="Comenzar meditación"
            onPress={() => {
              console.log("[MeditationScreen] startMeditation", meditationPayload);
              void togglePlayback();
            }}
            style={localStyles.ctaWrap}
          />
        </ScrollView>
      </SafeAreaView>

      <BottomTabPreview />
    </View>
  );
};

const localStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.74)",
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 2,
  },
  title: {
    marginTop: 18,
    color: vibesTheme.colors.primaryText,
    fontSize: 50,
    lineHeight: 52,
    fontFamily: "CormorantGaramond_700Bold",
  },
  subtitle: {
    marginTop: 4,
    color: vibesTheme.colors.secondaryText,
    fontSize: 17,
    lineHeight: 21,
    fontFamily: "CormorantGaramond_500Medium",
  },
  section: {
    marginTop: 26,
  },
  sectionLabel: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 1.8,
    fontFamily: "CormorantGaramond_700Bold",
  },
  practiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  practiceCardWrap: {
    width: "46.5%",
  },
  practiceCard: {
    minHeight: 156,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.03)",
  },
  practiceCardSelected: {
    borderColor: "rgba(43, 43, 43, 0.03)",
    backgroundColor: "#FFFFFF",
  },
  checkWrap: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  practiceIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  practiceTitle: {
    color: vibesTheme.colors.primaryText,
    fontSize: 18,
    lineHeight: 22,
    textAlign: "center",
    fontFamily: "CormorantGaramond_700Bold",
  },
  practiceSubtitle: {
    marginTop: 6,
    color: vibesTheme.colors.secondaryText,
    fontSize: 12,
    lineHeight: 15,
    textAlign: "center",
    fontFamily: "CormorantGaramond_500Medium",
  },
  durationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  durationCardWrap: {
    width: "29.5%",
  },
  durationCard: {
    height: 116,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 26,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.03)",
  },
  durationCardSelected: {
    borderColor: "rgba(43, 43, 43, 0.03)",
    backgroundColor: "#FFFFFF",
  },
  durationCheckWrap: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  durationValue: {
    color: vibesTheme.colors.primaryText,
    fontSize: 34,
    lineHeight: 36,
    fontFamily: "CormorantGaramond_700Bold",
  },
  durationLabel: {
    marginTop: 2,
    color: vibesTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 15,
    fontFamily: "CormorantGaramond_500Medium",
  },
  musicSelector: {
    marginTop: 16,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: vibesTheme.colors.borderSoft,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 1,
  },
  musicSelectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  musicIconBubble: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(216, 140, 122, 0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  musicTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  musicTitle: {
    color: vibesTheme.colors.primaryText,
    fontSize: 20,
    lineHeight: 22,
    fontFamily: "CormorantGaramond_700Bold",
  },
  musicSubtitle: {
    marginTop: 4,
    color: vibesTheme.colors.secondaryText,
    fontSize: 15,
    lineHeight: 18,
    fontFamily: "CormorantGaramond_500Medium",
  },
  musicOptionsPanel: {
    marginTop: 12,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: vibesTheme.colors.borderSoft,
    overflow: "hidden",
  },
  musicOptionRow: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  musicOptionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(43, 43, 43, 0.06)",
  },
  musicOptionCopy: {
    flex: 1,
    paddingRight: 16,
  },
  musicOptionTitle: {
    color: vibesTheme.colors.primaryText,
    fontSize: 20,
    lineHeight: 24,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  musicOptionSubtitle: {
    marginTop: 2,
    color: vibesTheme.colors.secondaryText,
    fontSize: 16,
    lineHeight: 18,
    fontFamily: "CormorantGaramond_500Medium",
  },
  previewCard: {
    marginTop: 22,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.04)",
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 30,
    elevation: 3,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
  },
  previewPlayerHeader: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 14,
  },
  previewPlayerTitle: {
    color: vibesTheme.colors.primaryText,
    fontSize: 28,
    lineHeight: 32,
    textAlign: "center",
    fontFamily: "CormorantGaramond_700Bold",
  },
  previewPlayerSubtitle: {
    marginTop: 2,
    color: vibesTheme.colors.secondaryText,
    fontSize: 16,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: "CormorantGaramond_500Medium",
  },
  previewPlayerDivider: {
    marginTop: 10,
    width: 42,
    height: 3,
    borderRadius: 999,
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  previewMediaFrame: {
    height: 214,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#D7D2CB",
  },
  previewVideo: {
    width: "100%",
    height: "100%",
    backgroundColor: "#D7D2CB",
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(43, 43, 43, 0.02)",
  },
  previewTopRow: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  durationBadge: {
    borderRadius: vibesTheme.radii.pill,
    backgroundColor: "rgba(43, 43, 43, 0.56)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  durationBadgeText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 16,
    fontFamily: "CormorantGaramond_700Bold",
  },
  previewBottom: {
    paddingTop: 18,
  },
  previewMantra: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 18,
    lineHeight: 22,
    textAlign: "center",
    fontFamily: "CormorantGaramond_500Medium",
    marginBottom: 14,
  },
  progressMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressTime: {
    color: vibesTheme.colors.primaryText,
    fontSize: 16,
    lineHeight: 18,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  progressTrack: {
    height: 6,
    borderRadius: vibesTheme.radii.pill,
    backgroundColor: "rgba(43, 43, 43, 0.08)",
    overflow: "visible",
    justifyContent: "center",
  },
  progressFill: {
    height: 6,
    borderRadius: vibesTheme.radii.pill,
    backgroundColor: vibesTheme.colors.accentCoral,
  },
  progressThumb: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: vibesTheme.colors.accentCoral,
    marginLeft: -9,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  controlRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  secondaryControl: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(43, 43, 43, 0.03)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  secondaryControlText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 14,
    lineHeight: 16,
    fontFamily: "CormorantGaramond_700Bold",
  },
  primaryControl: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: vibesTheme.colors.accentBlue,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: vibesTheme.colors.accentBlue,
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 3,
  },
  forwardIcon: {
    transform: [{ rotate: "180deg" }],
  },
  ctaWrap: {
    marginTop: 20,
  },
  ctaButton: {
    height: 56,
    borderRadius: vibesTheme.radii.pill,
    backgroundColor: vibesTheme.colors.accentBlue,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#AEBFD1",
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 3,
  },
  ctaLabel: {
    marginLeft: 10,
    color: "#F6F6F4",
    fontSize: 16,
    lineHeight: 18,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    fontFamily: "CormorantGaramond_700Bold",
  },
  bottomBarOuter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    backgroundColor: "transparent",
  },
  bottomBar: {
    borderRadius: 34,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 1,
    borderColor: vibesTheme.colors.borderSoft,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28,
    elevation: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  tabItemHome: {
    marginTop: -22,
  },
  tabItemShifted: {
    marginLeft: 6,
  },
  homeBubble: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: vibesTheme.colors.accentMustard,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: vibesTheme.colors.accentMustard,
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 4,
  },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(174, 191, 209, 0.1)",
    marginBottom: 6,
  },
  iconBubbleActive: {
    backgroundColor: "rgba(174, 191, 209, 0.22)",
  },
  tabLabel: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 14,
    lineHeight: 16,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  homeTabLabel: {
    marginTop: 8,
    color: vibesTheme.colors.primaryText,
  },
  tabLabelActive: {
    color: vibesTheme.colors.primaryText,
  },
});

export default MeditationScreen;
