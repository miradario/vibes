/** @format */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Audio, ResizeMode, Video, type AVPlaybackStatus } from "expo-av";
import Icon from "../components/Icon";
import { vibesTheme } from "../src/theme/vibesTheme";

type MeditationType = "silent" | "guided";
type DurationOption = 5 | 10 | 20;

type PracticeOption = {
  value: MeditationType;
  title: string;
  subtitle: string;
  iconName: string;
  iconTint: string;
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

const DURATION_OPTIONS: DurationOption[] = [5, 10];

const TAB_ITEMS = [
  { key: "explore", label: "Explorar", icon: "compass-outline" },
  { key: "challenges", label: "Desafíos", icon: "trophy-outline" },
  { key: "home", label: "Home", icon: "home-outline" },
  { key: "vibes", label: "Vibes", icon: "musical-notes-outline" },
  { key: "profile", label: "Perfil", icon: "person-outline" },
] as const;

const AUDIO_BY_DURATION: Record<DurationOption, number> = {
  5: require("../assets/audio/meditation/meditation5minLoud.mp3"),
  10: require("../assets/audio/meditation/10minVozMeditacionLooud.mp3"),
  20: require("../assets/audio/meditation/meditation20min.mp3"),
};

const BACKGROUND_MUSIC_BY_DURATION: Record<DurationOption, number> = {
  5: require("../assets/audio/meditation/music5min.mp3"),
  10: require("../assets/audio/meditation/music10min.mp3"),
  20: require("../assets/audio/meditation/music10min.mp3"),
};

const FINISH_SOUND = require("../assets/audio/meditation/finish.mp3");
const MEDITATION_VIDEO_BACKGROUND = "#FFFFFF";
const MEDITATION_AUDIO_VOLUME = 1;
const BACKGROUND_MUSIC_VOLUME = 0.08;

const formatDuration = (minutes: number) =>
  `${String(minutes).padStart(2, "0")}:00`;
const formatMillis = (millis: number) => {
  const safeMillis = Math.max(0, Math.floor(millis));
  const totalSeconds = Math.floor(safeMillis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
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
                  <Text
                    style={[localStyles.tabLabel, localStyles.homeTabLabel]}
                  >
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
  const backgroundMusicRef = useRef<Audio.Sound | null>(null);
  const finishSoundRef = useRef<Audio.Sound | null>(null);
  const videoRef = useRef<Video | null>(null);
  const silentStartedAtRef = useRef<number | null>(null);
  const shouldResumeOnReloadRef = useRef(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedType, setSelectedType] = useState<MeditationType>("guided");
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>(10);
  const [isBackgroundMusicEnabled, setIsBackgroundMusicEnabled] =
    useState(true);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreparingAudio, setIsPreparingAudio] = useState(false);
  const [showImmersivePlayer, setShowImmersivePlayer] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [videoDurationMillis, setVideoDurationMillis] = useState<number | null>(
    null,
  );
  const [videoResetKey, setVideoResetKey] = useState(0);
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);
  const immersivePlayerProgress = useSharedValue(0);
  const targetDurationMillis = selectedDuration * 60 * 1000;

  const selectedAudioSource = useMemo(
    () => AUDIO_BY_DURATION[selectedDuration],
    [selectedDuration],
  );
  const selectedBackgroundMusicSource = useMemo(
    () => BACKGROUND_MUSIC_BY_DURATION[selectedDuration],
    [selectedDuration],
  );
  const isSilentMode = selectedType === "silent";
  const selectedVideoRate = useMemo(() => {
    if (!videoDurationMillis || targetDurationMillis <= 0) return 1;
    return Math.max(
      0.05,
      Math.min(4, videoDurationMillis / targetDurationMillis),
    );
  }, [targetDurationMillis, videoDurationMillis]);

  const totalDurationLabel = formatMillis(targetDurationMillis);
  const currentTimeLabel = formatMillis(positionMillis);
  const progressRatio =
    targetDurationMillis > 0
      ? Math.min(Math.max(positionMillis / targetDurationMillis, 0), 1)
      : 0;
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
  const showPreviewVideo = isPlaying;

  useEffect(() => {
    if (isPlaying) {
      setShowImmersivePlayer(true);
      immersivePlayerProgress.value = withTiming(1, {
        duration: 680,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      });
      return undefined;
    }

    if (!showImmersivePlayer) return undefined;

    immersivePlayerProgress.value = withTiming(0, {
      duration: 520,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
    const timeoutId = setTimeout(() => {
      setShowImmersivePlayer(false);
    }, 520);

    return () => clearTimeout(timeoutId);
  }, [immersivePlayerProgress, isPlaying, showImmersivePlayer]);

  const immersiveOverlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(immersivePlayerProgress.value, [0, 1], [0, 1]),
  }));

  const immersivePlayerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(immersivePlayerProgress.value, [0, 0.2, 1], [0, 0.25, 1]),
    transform: [
      { translateY: interpolate(immersivePlayerProgress.value, [0, 1], [72, 0]) },
      { scale: interpolate(immersivePlayerProgress.value, [0, 1], [0.92, 1]) },
    ],
  }));

  const playFinishSound = useCallback(async () => {
    try {
      const previousFinishSound = finishSoundRef.current;
      finishSoundRef.current = null;
      previousFinishSound?.setOnPlaybackStatusUpdate(null);
      await previousFinishSound?.unloadAsync();

      const finishSound = new Audio.Sound();
      finishSoundRef.current = finishSound;
      finishSound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded || !status.didJustFinish) return;
        finishSound.setOnPlaybackStatusUpdate(null);
        finishSound.unloadAsync().catch(() => undefined);
        if (finishSoundRef.current === finishSound) {
          finishSoundRef.current = null;
        }
      });
      await finishSound.loadAsync(FINISH_SOUND, { shouldPlay: true }, true);
    } catch {
      // The finish chime is secondary; do not interrupt the meditation flow.
    }
  }, []);

  const finishSession = useCallback(() => {
    silentStartedAtRef.current = null;
    setIsPlaying(false);
    setPositionMillis(0);
    void soundRef.current?.stopAsync().catch(() => undefined);
    void soundRef.current?.setPositionAsync(0).catch(() => undefined);
    void backgroundMusicRef.current?.stopAsync().catch(() => undefined);
    void backgroundMusicRef.current?.setPositionAsync(0).catch(() => undefined);
    void videoRef.current?.setPositionAsync(0).catch(() => undefined);
    void playFinishSound();
  }, [playFinishSound]);

  const updatePlaybackState = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        setIsPlayerReady(false);
        setIsPlaying(false);
        setPositionMillis(0);
        if (status.error) {
          console.warn("[MeditationScreen] playback error", status.error);
        }
        return;
      }

      setIsPlayerReady(true);
      setIsPlaying(status.isPlaying);
      const nextPosition = Math.min(
        status.positionMillis ?? 0,
        targetDurationMillis,
      );
      setPositionMillis(nextPosition);
      if (nextPosition >= targetDurationMillis || status.didJustFinish) {
        finishSession();
      }
    },
    [finishSession, targetDurationMillis],
  );

  const unloadSound = useCallback(async () => {
    const activeSound = soundRef.current;
    soundRef.current = null;
    if (!activeSound) return;
    activeSound.setOnPlaybackStatusUpdate(null);
    await activeSound.unloadAsync();
  }, []);

  const unloadBackgroundMusic = useCallback(async () => {
    const activeSound = backgroundMusicRef.current;
    backgroundMusicRef.current = null;
    if (!activeSound) return;
    activeSound.setOnPlaybackStatusUpdate(null);
    await activeSound.unloadAsync();
  }, []);

  const unloadFinishSound = useCallback(async () => {
    const activeSound = finishSoundRef.current;
    finishSoundRef.current = null;
    if (!activeSound) return;
    activeSound.setOnPlaybackStatusUpdate(null);
    await activeSound.unloadAsync();
  }, []);

  const loadBackgroundMusic = useCallback(
    async (shouldPlay: boolean, startPositionMillis = 0) => {
      await unloadBackgroundMusic();

      const sound = new Audio.Sound();
      backgroundMusicRef.current = sound;
      await sound.loadAsync(
        selectedBackgroundMusicSource,
        {
          shouldPlay,
          volume: BACKGROUND_MUSIC_VOLUME,
          positionMillis: Math.min(startPositionMillis, targetDurationMillis),
        },
        true,
      );
    },
    [
      selectedBackgroundMusicSource,
      targetDurationMillis,
      unloadBackgroundMusic,
    ],
  );

  const loadMeditationAudio = useCallback(
    async (shouldPlay: boolean) => {
      setIsPreparingAudio(true);

      try {
        await unloadSound();

        if (isSilentMode) {
          soundRef.current = null;
          setIsPlayerReady(true);
          setIsPlaying(false);
          setPositionMillis(0);
          silentStartedAtRef.current = null;
          return;
        }

        const sound = new Audio.Sound();
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate(updatePlaybackState);

        await sound.loadAsync(
          selectedAudioSource,
          {
            shouldPlay,
            volume: MEDITATION_AUDIO_VOLUME,
            progressUpdateIntervalMillis: 250,
            positionMillis: 0,
          },
          true,
        );
      } finally {
        setIsPreparingAudio(false);
      }
    },
    [isSilentMode, selectedAudioSource, unloadSound, updatePlaybackState],
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

  useEffect(() => {
    if (!isBackgroundMusicEnabled) {
      unloadBackgroundMusic().catch(() => undefined);
      return undefined;
    }

    loadBackgroundMusic(isPlaying, positionMillis).catch(() => {
      Alert.alert("Música no disponible", "No se pudo cargar la música de fondo.");
      setIsBackgroundMusicEnabled(false);
    });

    return undefined;
  }, [
    isBackgroundMusicEnabled,
    loadBackgroundMusic,
    selectedBackgroundMusicSource,
    unloadBackgroundMusic,
  ]);

  useEffect(() => {
    if (!isSilentMode || !isPlaying) return undefined;

    silentStartedAtRef.current = Date.now() - positionMillis;

    const intervalId = setInterval(() => {
      const startedAt = silentStartedAtRef.current;
      if (startedAt === null) return;

      const elapsed = Math.min(Date.now() - startedAt, targetDurationMillis);
      setPositionMillis(elapsed);

      if (elapsed < targetDurationMillis) return;
      clearInterval(intervalId);
      finishSession();
    }, 250);

    return () => clearInterval(intervalId);
  }, [
    finishSession,
    isPlaying,
    isSilentMode,
    positionMillis,
    targetDurationMillis,
  ]);

  useEffect(() => {
    return () => {
      unloadBackgroundMusic().catch(() => undefined);
      unloadFinishSound().catch(() => undefined);
    };
  }, [unloadBackgroundMusic, unloadFinishSound]);

  const resetSessionToBeginning = useCallback(() => {
    shouldResumeOnReloadRef.current = false;
    silentStartedAtRef.current = null;
    setIsPlaying(false);
    setPositionMillis(0);
    setVideoResetKey((current) => current + 1);
    void soundRef.current?.setPositionAsync(0).catch(() => undefined);
    void backgroundMusicRef.current?.stopAsync().catch(() => undefined);
    void backgroundMusicRef.current?.setPositionAsync(0).catch(() => undefined);
    void videoRef.current?.setPositionAsync(0).catch(() => undefined);
  }, []);

  const handleSelectType = useCallback(
    (nextType: MeditationType) => {
      if (nextType === selectedType) return;
      if (isPlaying || isPreparingAudio) return;

      resetSessionToBeginning();
      setSelectedType(nextType);
    },
    [isPlaying, isPreparingAudio, resetSessionToBeginning, selectedType],
  );

  const handleSelectDuration = useCallback(
    (nextDuration: DurationOption) => {
      if (nextDuration === selectedDuration) return;
      if (isPlaying || isPreparingAudio) return;

      resetSessionToBeginning();
      setSelectedDuration(nextDuration);
    },
    [isPlaying, isPreparingAudio, resetSessionToBeginning, selectedDuration],
  );

  const playBackgroundMusicFromCurrentPosition = useCallback(async () => {
    if (!isBackgroundMusicEnabled) return;

    if (!backgroundMusicRef.current) {
      await loadBackgroundMusic(true, positionMillis);
      return;
    }

    await backgroundMusicRef.current.setPositionAsync(positionMillis);
    await backgroundMusicRef.current.playAsync();
  }, [isBackgroundMusicEnabled, loadBackgroundMusic, positionMillis]);

  const handleBackgroundMusicToggle = useCallback(async () => {
    const nextEnabled = !isBackgroundMusicEnabled;
    setIsBackgroundMusicEnabled(nextEnabled);

    if (!nextEnabled) {
      await unloadBackgroundMusic().catch(() => undefined);
    }
  }, [
    isBackgroundMusicEnabled,
    unloadBackgroundMusic,
  ]);

  const togglePlayback = useCallback(async () => {
    try {
      if (isSilentMode) {
        setIsPlayerReady(true);
        if (isPlaying) {
          silentStartedAtRef.current = null;
          setIsPlaying(false);
          await backgroundMusicRef.current?.pauseAsync();
        } else {
          silentStartedAtRef.current = Date.now() - positionMillis;
          setIsPlaying(true);
          await playBackgroundMusicFromCurrentPosition();
        }
        return;
      }

      if (!soundRef.current || !isPlayerReady) {
        await loadMeditationAudio(true);
        await playBackgroundMusicFromCurrentPosition();
        return;
      }

      if (isPlaying) {
        await soundRef.current.pauseAsync();
        await backgroundMusicRef.current?.pauseAsync();
      } else {
        await soundRef.current.playAsync();
        await playBackgroundMusicFromCurrentPosition();
      }
    } catch {
      Alert.alert(
        "No se pudo reproducir",
        "Intentá nuevamente en unos segundos.",
      );
    }
  }, [
    isPlayerReady,
    isPlaying,
    isSilentMode,
    loadMeditationAudio,
    playBackgroundMusicFromCurrentPosition,
    positionMillis,
  ]);

  const handleSeekPress = useCallback(
    async (event: any) => {
      if (!isPlayerReady || progressTrackWidth <= 0) return;
      const ratio = Math.min(
        Math.max(event.nativeEvent.locationX / progressTrackWidth, 0),
        1,
      );
      const nextPosition = ratio * targetDurationMillis;
      setPositionMillis(nextPosition);
      if (isSilentMode && isPlaying) {
        silentStartedAtRef.current = Date.now() - nextPosition;
      }
      if (!isSilentMode) {
        await soundRef.current?.setPositionAsync(nextPosition);
      }
      if (isBackgroundMusicEnabled) {
        await backgroundMusicRef.current?.setPositionAsync(nextPosition);
      }
      if (videoDurationMillis) {
        await videoRef.current?.setPositionAsync(ratio * videoDurationMillis);
      }
    },
    [
      isPlayerReady,
      isPlaying,
      isSilentMode,
      isBackgroundMusicEnabled,
      progressTrackWidth,
      targetDurationMillis,
      videoDurationMillis,
    ],
  );

  const handleProgressLayout = useCallback((event: LayoutChangeEvent) => {
    setProgressTrackWidth(event.nativeEvent.layout.width);
  }, []);

  return (
    <View style={localStyles.screen}>
      <SafeAreaView
        style={localStyles.safeArea}
        edges={["top", "left", "right"]}
      >
        <ScrollView
          contentContainerStyle={[
            localStyles.scrollContent,
            {
              paddingBottom: Math.max(insets.bottom, 18) + 190,
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
                  onPress={() => handleSelectType(option.value)}
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
                  onPress={() => handleSelectDuration(duration)}
                />
              ))}
            </View>
          </View>

          <View style={localStyles.section}>
            <SectionLabel>MÚSICA DE FONDO (OPCIONAL)</SectionLabel>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isBackgroundMusicEnabled }}
              onPress={() => {
                void handleBackgroundMusicToggle();
              }}
              style={[
                localStyles.musicSelector,
                isBackgroundMusicEnabled ? localStyles.musicSelectorActive : null,
              ]}
            >
              <View style={localStyles.musicSelectorLeft}>
                <View
                  style={[
                    localStyles.musicIconBubble,
                    isBackgroundMusicEnabled ? localStyles.musicIconBubbleActive : null,
                  ]}
                >
                  <Icon
                    name="musical-notes-outline"
                    size={22}
                    color={
                      isBackgroundMusicEnabled
                        ? "#FFFFFF"
                        : vibesTheme.colors.primaryText
                    }
                  />
                </View>
                <View style={localStyles.musicTextWrap}>
                  <Text style={localStyles.musicTitle}>Con música de fondo</Text>
                  <Text style={localStyles.musicSubtitle}>
                    {isBackgroundMusicEnabled
                      ? "Ambiente suave activado"
                      : "Sumá una capa suave a tu meditación"}
                  </Text>
                </View>
              </View>
              <Icon
                name={
                  isBackgroundMusicEnabled ? "checkmark-circle" : "ellipse-outline"
                }
                size={24}
                color={
                  isBackgroundMusicEnabled
                    ? vibesTheme.colors.accentMustard
                    : "rgba(43, 43, 43, 0.28)"
                }
              />
            </Pressable>
          </View>

          {!showImmersivePlayer ? (
            <View
              style={[
                localStyles.previewCard,
                !showPreviewVideo ? localStyles.previewCardCompact : null,
              ]}
            >
            <View
              style={[
                localStyles.previewPlayerHeader,
                !showPreviewVideo ? localStyles.previewPlayerHeaderCompact : null,
              ]}
            >
              <Text
                style={[
                  localStyles.previewPlayerTitle,
                  !showPreviewVideo ? localStyles.previewPlayerTitleCompact : null,
                ]}
              >
                {playerTitle}
              </Text>
              <Text
                style={[
                  localStyles.previewPlayerSubtitle,
                  !showPreviewVideo ? localStyles.previewPlayerSubtitleCompact : null,
                ]}
              >
                {playerSubtitle}
              </Text>
              <View
                style={[
                  localStyles.previewPlayerDivider,
                  !showPreviewVideo ? localStyles.previewPlayerDividerCompact : null,
                ]}
              />
            </View>

            {showPreviewVideo ? (
              <View style={localStyles.previewMediaFrame}>
                <Video
                  key={`meditation-video-${selectedType}-${selectedDuration}-${videoResetKey}`}
                  ref={videoRef}
                  source={require("../assets/videos/meditation/videoMeditation.mp4")}
                  style={localStyles.previewVideo}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={isPlaying}
                  isMuted
                  isLooping={false}
                  rate={selectedVideoRate}
                  shouldCorrectPitch={false}
                  progressUpdateIntervalMillis={250}
                  onPlaybackStatusUpdate={(status) => {
                    if (!status.isLoaded) return;
                    if (typeof status.durationMillis === "number") {
                      setVideoDurationMillis(status.durationMillis);
                    }
                  }}
                />
                <View style={localStyles.previewOverlay} />
              </View>
            ) : null}

            <View
              style={[
                localStyles.previewBottom,
                !showPreviewVideo ? localStyles.previewBottomCompact : null,
              ]}
            >
              <Text
                style={[
                  localStyles.previewMantra,
                  !showPreviewVideo ? localStyles.previewMantraCompact : null,
                ]}
              >
                {playerMantra}
              </Text>
              <View style={localStyles.progressMetaRow}>
                <Text
                  style={[
                    localStyles.progressTime,
                    !showPreviewVideo ? localStyles.progressTimeCompact : null,
                  ]}
                >
                  {currentTimeLabel}
                </Text>
                <Text
                  style={[
                    localStyles.progressTime,
                    !showPreviewVideo ? localStyles.progressTimeCompact : null,
                  ]}
                >
                  {totalDurationLabel}
                </Text>
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
              <View
                style={[
                  localStyles.controlRow,
                  !showPreviewVideo ? localStyles.controlRowCompact : null,
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void togglePlayback();
                  }}
                  style={[
                    localStyles.primaryControl,
                    !showPreviewVideo ? localStyles.primaryControlCompact : null,
                  ]}
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
              </View>
            </View>
          </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <BottomTabPreview />

      {showImmersivePlayer ? (
        <Animated.View
          pointerEvents="auto"
          style={[
            localStyles.immersivePlayerOverlay,
            immersiveOverlayAnimatedStyle,
          ]}
        >
          <SafeAreaView
            style={localStyles.immersivePlayerSafeArea}
            edges={["top", "bottom", "left", "right"]}
          >
            <Animated.View
              style={[
                localStyles.previewCardImmersive,
                immersivePlayerAnimatedStyle,
              ]}
            >
              <View style={localStyles.previewPlayerHeaderImmersive}>
                <Text style={localStyles.previewPlayerTitleImmersive}>
                  {playerTitle}
                </Text>
                <Text style={localStyles.previewPlayerSubtitleImmersive}>
                  {playerSubtitle}
                </Text>
                <View style={localStyles.previewPlayerDivider} />
              </View>

              {showPreviewVideo ? (
                <View style={localStyles.previewMediaFrameImmersive}>
                  <Video
                    key={`meditation-video-${selectedType}-${selectedDuration}-${videoResetKey}-immersive`}
                    ref={videoRef}
                    source={require("../assets/videos/meditation/videoMeditation.mp4")}
                    style={localStyles.previewVideo}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={isPlaying}
                    isMuted
                    isLooping={false}
                    rate={selectedVideoRate}
                    shouldCorrectPitch={false}
                    progressUpdateIntervalMillis={250}
                    onPlaybackStatusUpdate={(status) => {
                      if (!status.isLoaded) return;
                      if (typeof status.durationMillis === "number") {
                        setVideoDurationMillis(status.durationMillis);
                      }
                    }}
                  />
                  <View style={localStyles.previewOverlay} />
                </View>
              ) : null}

              <View
                style={[
                  localStyles.previewBottomImmersive,
                  !showPreviewVideo ? localStyles.previewBottomCompact : null,
                ]}
              >
                <Text style={localStyles.previewMantraImmersive}>
                  {playerMantra}
                </Text>
                <View style={localStyles.progressMetaRow}>
                  <Text style={localStyles.progressTime}>{currentTimeLabel}</Text>
                  <Text style={localStyles.progressTime}>
                    {totalDurationLabel}
                  </Text>
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
                </View>
              </View>
            </Animated.View>
          </SafeAreaView>
        </Animated.View>
      ) : null}
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
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    marginTop: 8,
    color: vibesTheme.colors.primaryText,
    fontSize: 26,
    lineHeight: 28,
    fontFamily: "CormorantGaramond_700Bold",
  },
  subtitle: {
    marginTop: 2,
    color: "#6F6A65",
    fontSize: 16,
    lineHeight: 21,
    fontFamily: vibesTheme.fonts.medium,
  },
  section: {
    marginTop: 14,
  },
  sectionLabel: {
    color: "#6F6A65",
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: 1,
    fontFamily: vibesTheme.fonts.medium,
  },
  practiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  practiceCardWrap: {
    width: "47.6%",
  },
  practiceCard: {
    minHeight: 108,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
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
    top: 8,
    right: 8,
  },
  practiceIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  practiceTitle: {
    color: vibesTheme.colors.primaryText,
    fontSize: 15,
    lineHeight: 19,
    textAlign: "center",
    fontFamily: "CormorantGaramond_700Bold",
  },
  practiceSubtitle: {
    marginTop: 3,
    color: "#7B756F",
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: vibesTheme.fonts.medium,
  },
  durationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  durationCardWrap: {
    width: "30.2%",
  },
  durationCard: {
    height: 82,
    borderRadius: 16,
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
    top: 6,
    right: 6,
  },
  durationValue: {
    color: vibesTheme.colors.primaryText,
    fontSize: 28,
    lineHeight: 32,
    fontFamily: vibesTheme.fonts.medium,
  },
  durationLabel: {
    marginTop: 1,
    color: "#6F6A65",
    fontSize: 15,
    lineHeight: 19,
    fontFamily: vibesTheme.fonts.medium,
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
  musicSelectorActive: {
    borderColor: "rgba(228, 183, 110, 0.62)",
    backgroundColor: "#FFFFFF",
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
  musicIconBubbleActive: {
    backgroundColor: vibesTheme.colors.accentMustard,
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
    color: "#6F6A65",
    fontSize: 16,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.medium,
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
    color: "#6F6A65",
    fontSize: 16,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.medium,
  },
  previewCard: {
    marginTop: 22,
    borderRadius: 28,
    backgroundColor: "#fafafa",
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
  previewCardCompact: {
    marginTop: 16,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  previewCardImmersive: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 28,
    justifyContent: "center",
  },
  previewPlayerHeader: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 14,
  },
  previewPlayerHeaderCompact: {
    paddingTop: 0,
    paddingBottom: 8,
  },
  previewPlayerHeaderImmersive: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 22,
  },
  previewPlayerTitle: {
    color: vibesTheme.colors.primaryText,
    fontSize: 28,
    lineHeight: 32,
    textAlign: "center",
    fontFamily: "CormorantGaramond_700Bold",
  },
  previewPlayerTitleCompact: {
    fontSize: 22,
    lineHeight: 26,
  },
  previewPlayerTitleImmersive: {
    color: vibesTheme.colors.primaryText,
    fontSize: 34,
    lineHeight: 38,
    textAlign: "center",
    fontFamily: "CormorantGaramond_700Bold",
  },
  previewPlayerSubtitle: {
    marginTop: 2,
    color: "#6F6A65",
    fontSize: 16,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: vibesTheme.fonts.medium,
  },
  previewPlayerSubtitleCompact: {
    fontSize: 16,
    lineHeight: 20,
  },
  previewPlayerSubtitleImmersive: {
    marginTop: 4,
    color: "#6F6A65",
    fontSize: 18,
    lineHeight: 22,
    textAlign: "center",
    fontFamily: vibesTheme.fonts.medium,
  },
  previewPlayerDivider: {
    marginTop: 10,
    width: 42,
    height: 3,
    borderRadius: 999,
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  previewPlayerDividerCompact: {
    marginTop: 8,
    width: 32,
    height: 2,
  },
  previewMediaFrame: {
    height: 214,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    backgroundColor: MEDITATION_VIDEO_BACKGROUND,
  },
  previewMediaFrameImmersive: {
    flex: 1,
    minHeight: 360,
    borderRadius: 32,
    overflow: "hidden",
    position: "relative",
    backgroundColor: MEDITATION_VIDEO_BACKGROUND,
  },
  previewVideo: {
    width: "100%",
    height: "100%",
    backgroundColor: MEDITATION_VIDEO_BACKGROUND,
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(43, 43, 43, 0.02)",
  },
  previewBottom: {
    paddingTop: 18,
  },
  previewBottomCompact: {
    paddingTop: 4,
  },
  previewBottomImmersive: {
    paddingTop: 24,
  },
  previewMantra: {
    color: "#6F6A65",
    fontSize: 18,
    lineHeight: 22,
    textAlign: "center",
    fontFamily: vibesTheme.fonts.medium,
    marginBottom: 14,
  },
  previewMantraCompact: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 10,
  },
  previewMantraImmersive: {
    color: "#6F6A65",
    fontSize: 22,
    lineHeight: 28,
    textAlign: "center",
    fontFamily: vibesTheme.fonts.medium,
    marginBottom: 20,
  },
  progressMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressTime: {
    color: vibesTheme.colors.primaryText,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.medium,
  },
  progressTimeCompact: {
    fontSize: 16,
    lineHeight: 20,
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
  },
  controlRowCompact: {
    marginTop: 12,
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
  primaryControlCompact: {
    width: 62,
    height: 62,
    borderRadius: 31,
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
  },
  immersivePlayerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
    zIndex: 60,
  },
  immersivePlayerSafeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    color: "#6F6A65",
    fontSize: 15,
    lineHeight: 19,
    fontFamily: vibesTheme.fonts.medium,
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
