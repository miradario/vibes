/** @format */

import React, { memo, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { ResizeMode } from "expo-av";
import * as Haptics from "expo-haptics";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Icon from "../components/Icon";
import LoopingVideo from "../components/LoopingVideo";
import {
  useChallengeCheckinsQuery,
  useChallengeParticipantQuery,
  useCheckInChallengeMutation,
  type EventFeedItem,
} from "../src/queries/events.queries";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  getChallengeMediaPreset,
  getChallengeProgressVideo,
  type ChallengeMediaPresetId,
} from "../src/constants/challengeMediaPresets";

type CheckInStatus = "pending" | "completed" | "broken";
type ProgressMode = "path" | "compact" | "calendar";

export type ChallengeDetailData = {
  id?: string;
  title: string;
  subtitle: string;
  date: string;
  startsAt?: string | null;
  participantsCount: number;
  totalDays: number;
  currentDay: number;
  completedDays: number[];
  streak: number;
  bestStreak: number;
  checkInStatus: CheckInStatus;
};

const treeStageImages = [
  require("../assets/images/tree/1.png"),
  require("../assets/images/tree/2.png"),
  require("../assets/images/tree/3.png"),
  require("../assets/images/tree/4.png"),
  require("../assets/images/tree/5.png"),
  require("../assets/images/tree/6.png"),
];

const FALLBACK_CHALLENGE: ChallengeDetailData = {
  title: "Ejercicio matutino",
  subtitle: "Ejercitación matutina diaria.",
  date: "4 de mayo de 2026",
  participantsCount: 2,
  totalDays: 10,
  currentDay: 4,
  completedDays: [1, 2, 3],
  streak: 3,
  bestStreak: 7,
  checkInStatus: "pending",
};

const palette = {
  bg: "#F6F6F4",
  surface: "#FFFDF8",
  surfaceAlt: "#FDF6EA",
  text: "#2D2924",
  muted: "#7C746B",
  faint: "#E9E0D3",
  gold: "#E2A84F",
  goldDeep: "#B7772F",
  accentBlue: "#AEBFD1",
  accentBlueSoft: "rgba(174, 191, 209, 0.18)",
  red: "#C9695D",
  redSoft: "#FCE9E6",
};

export const getProgressMode = (totalDays: number): ProgressMode => {
  if (totalDays <= 10) return "path";
  if (totalDays <= 30) return "compact";
  return "calendar";
};

export const getCompletionPercent = (
  completedDays: number[],
  totalDays: number,
) => {
  if (totalDays <= 0) return 0;
  const uniqueCompleted = new Set(completedDays.filter((day) => day >= 1 && day <= totalDays));
  return Math.min(100, Math.round((uniqueCompleted.size / totalDays) * 100));
};

export const getGrowthStage = (percent: number) => {
  if (percent >= 84) return 5;
  if (percent >= 67) return 4;
  if (percent >= 50) return 3;
  if (percent >= 34) return 2;
  if (percent >= 17) return 1;
  return 0;
};

export const getDaysLeft = (totalDays: number, completedDays: number[]) =>
  Math.max(totalDays - new Set(completedDays).size, 0);

export const isDayCompleted = (day: number, completedDays: number[]) =>
  completedDays.includes(day);

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const formatDisplayDate = (value?: string | null) => {
  if (!value) return FALLBACK_CHALLENGE.date;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return FALLBACK_CHALLENGE.date;
  return parsed.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const getCurrentDayFromStart = (startsAt: string | null | undefined, totalDays: number) => {
  if (!startsAt) return FALLBACK_CHALLENGE.currentDay;
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return FALLBACK_CHALLENGE.currentDay;
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1;
  return clamp(diff, 1, Math.max(totalDays, 1));
};

const getCompletedDaysFromCheckins = (
  checkins: string[],
  startsAt: string | null | undefined,
  totalDays: number,
) => {
  if (!startsAt || checkins.length === 0) return [];
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return [];
  start.setHours(0, 0, 0, 0);

  return Array.from(
    new Set(
      checkins
        .map((checkin) => {
          const date = new Date(`${checkin}T00:00:00`);
          if (Number.isNaN(date.getTime())) return null;
          const day = Math.floor((date.getTime() - start.getTime()) / 86_400_000) + 1;
          return day >= 1 && day <= totalDays ? day : null;
        })
        .filter((day): day is number => typeof day === "number"),
    ),
  ).sort((left, right) => left - right);
};

const getStatusFromData = (
  currentDay: number,
  completedDays: number[],
  participantCheckedToday?: boolean,
): CheckInStatus => {
  if (participantCheckedToday || completedDays.includes(currentDay)) return "completed";
  if (currentDay > 1 && !completedDays.includes(currentDay - 1)) return "broken";
  return "pending";
};

const triggerHaptic = () => {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

const useAnimatedProgress = (percent: number) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(percent / 100, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [percent]);

  return progress;
};

type ChallengeHeaderProps = {
  challenge: ChallengeDetailData;
  onBack: () => void;
};

export const ChallengeHeader = memo(({ challenge, onBack }: ChallengeHeaderProps) => (
  <View style={localStyles.header}>
    <TouchableOpacity style={localStyles.iconButton} onPress={onBack}>
      <Icon name="chevron-back" size={23} color={palette.text} />
    </TouchableOpacity>
    <View style={localStyles.headerCopy}>
      <Text style={localStyles.eyebrow}>Challenge</Text>
      <Text style={localStyles.title}>{challenge.title}</Text>
      <Text style={localStyles.subtitle}>{challenge.subtitle}</Text>
    </View>
  </View>
));

type InfoCardsRowProps = {
  challenge: ChallengeDetailData;
  percent: number;
};

export const InfoCardsRow = memo(({ challenge, percent }: InfoCardsRowProps) => (
  <View style={localStyles.infoRow}>
    <View style={localStyles.infoCard}>
      <Text style={localStyles.infoValue}>{challenge.currentDay}</Text>
      <Text style={localStyles.infoLabel}>Día actual</Text>
    </View>
    <View style={localStyles.infoCard}>
      <Text style={localStyles.infoValue}>{percent}%</Text>
      <Text style={localStyles.infoLabel}>Completado</Text>
    </View>
    <View style={localStyles.infoCard}>
      <Text style={localStyles.infoValue}>{challenge.participantsCount}</Text>
      <Text style={localStyles.infoLabel}>Personas</Text>
    </View>
  </View>
));

type StreakSummaryCardProps = {
  streak: number;
  bestStreak: number;
  daysLeft: number;
};

export const StreakSummaryCard = memo(
  ({ streak, bestStreak, daysLeft }: StreakSummaryCardProps) => (
    <View style={localStyles.streakCard}>
      <View>
        <Text style={localStyles.cardTitle}>Tu racha</Text>
        <Text style={localStyles.cardSubtitle}>
          {daysLeft === 0 ? "Challenge completo" : `${daysLeft} días por delante`}
        </Text>
      </View>
      <View style={localStyles.streakMetrics}>
        <View>
          <Text style={localStyles.streakValue}>{streak}</Text>
          <Text style={localStyles.streakLabel}>actual</Text>
        </View>
        <View style={localStyles.metricDivider} />
        <View>
          <Text style={localStyles.streakValue}>{bestStreak}</Text>
          <Text style={localStyles.streakLabel}>mejor</Text>
        </View>
      </View>
    </View>
  ),
);

type DayState = "completed" | "active" | "future" | "missed";

const getDayState = (
  day: number,
  currentDay: number,
  completedDays: number[],
): DayState => {
  if (completedDays.includes(day)) return "completed";
  if (day === currentDay) return "active";
  if (day < currentDay) return "missed";
  return "future";
};

type DayCircleProps = {
  day: number;
  state: DayState;
  size?: number;
  showLabel?: boolean;
};

const DayCircle = memo(({ day, state, size = 38, showLabel = true }: DayCircleProps) => {
  const pulse = useSharedValue(1);
  const isActive = state === "active";

  useEffect(() => {
    if (!isActive) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    shadowOpacity: isActive ? interpolate(pulse.value, [1, 1.08], [0.2, 0.42]) : 0,
  }));

  return (
    <Animated.View
      style={[
        localStyles.dayCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        state === "completed" && localStyles.dayCompleted,
        state === "active" && localStyles.dayActive,
        state === "future" && localStyles.dayFuture,
        state === "missed" && localStyles.dayMissed,
        animatedStyle,
      ]}
    >
      {state === "completed" ? (
        <Icon name="checkmark" size={Math.max(14, size * 0.42)} color="#FFFFFF" />
      ) : (
        <Text
          style={[
            localStyles.dayText,
            state === "active" && localStyles.dayTextActive,
            state === "future" && localStyles.dayTextFuture,
            state === "missed" && localStyles.dayTextMissed,
          ]}
        >
          {showLabel ? day : ""}
        </Text>
      )}
    </Animated.View>
  );
});

type AdaptiveProgressProps = {
  totalDays: number;
  currentDay: number;
  completedDays: number[];
};

export const AdaptiveProgress = memo(
  ({ totalDays, currentDay, completedDays }: AdaptiveProgressProps) => {
    const mode = getProgressMode(totalDays);
    if (mode === "path") {
      return (
        <PathProgress
          totalDays={totalDays}
          currentDay={currentDay}
          completedDays={completedDays}
        />
      );
    }
    if (mode === "compact") {
      return (
        <CompactProgress
          totalDays={totalDays}
          currentDay={currentDay}
          completedDays={completedDays}
        />
      );
    }
    return (
      <CalendarProgress
        totalDays={totalDays}
        currentDay={currentDay}
        completedDays={completedDays}
      />
    );
  },
);

export const PathProgress = memo(
  ({ totalDays, currentDay, completedDays }: AdaptiveProgressProps) => {
    const days = useMemo(
      () => Array.from({ length: totalDays }, (_, index) => index + 1),
      [totalDays],
    );

    return (
      <View style={localStyles.progressCard}>
        <Text style={localStyles.sectionTitle}>Camino del challenge</Text>
        <View style={localStyles.pathRow}>
          {days.map((day, index) => {
            const state = getDayState(day, currentDay, completedDays);
            return (
              <View key={day} style={localStyles.pathItem}>
                <DayCircle day={day} state={state} />
                {index < days.length - 1 ? (
                  <View
                    style={[
                      localStyles.pathConnector,
                      isDayCompleted(day, completedDays) && localStyles.pathConnectorDone,
                    ]}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    );
  },
);

export const CompactProgress = memo(
  ({ totalDays, currentDay, completedDays }: AdaptiveProgressProps) => {
    const percent = getCompletionPercent(completedDays, totalDays);
    const progress = useAnimatedProgress(percent);
    const milestones = useMemo(() => {
      const points = [1, Math.ceil(totalDays * 0.25), Math.ceil(totalDays * 0.5), Math.ceil(totalDays * 0.75), totalDays];
      return Array.from(new Set(points)).sort((left, right) => left - right);
    }, [totalDays]);
    const fillStyle = useAnimatedStyle(() => ({
      width: `${progress.value * 100}%`,
    }));

    return (
      <View style={localStyles.progressCard}>
        <Text style={localStyles.sectionTitle}>Progreso compacto</Text>
        <View style={localStyles.compactTrack}>
          <Animated.View style={[localStyles.compactFill, fillStyle]} />
        </View>
        <View style={localStyles.milestonesRow}>
          {milestones.map((day) => (
            <View key={day} style={localStyles.milestoneItem}>
              <DayCircle
                day={day}
                state={getDayState(day, currentDay, completedDays)}
                size={34}
                showLabel
              />
              <Text style={localStyles.milestoneText}>Día {day}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  },
);

export const CalendarProgress = memo(
  ({ totalDays, currentDay, completedDays }: AdaptiveProgressProps) => {
    const days = useMemo(
      () => Array.from({ length: totalDays }, (_, index) => index + 1),
      [totalDays],
    );

    return (
      <View style={localStyles.progressCard}>
        <Text style={localStyles.sectionTitle}>Calendario de avance</Text>
        <FlatList
          data={days}
          keyExtractor={(day) => `calendar-day-${day}`}
          numColumns={7}
          scrollEnabled={false}
          columnWrapperStyle={localStyles.calendarRow}
          renderItem={({ item }) => (
            <View style={localStyles.calendarCell}>
              <DayCircle
                day={item}
                state={getDayState(item, currentDay, completedDays)}
                size={34}
                showLabel={item % 5 === 0 || item === currentDay || item === 1}
              />
            </View>
          )}
        />
      </View>
    );
  },
);

type GrowthIllustrationProps = {
  percent: number;
  presetId?: ChallengeMediaPresetId | null;
};

const getProgressVideoStage = (percent: number) =>
  Math.min(4, Math.floor(clamp(percent, 0, 100) / 20));

export const GrowthIllustration = memo(({ percent, presetId }: GrowthIllustrationProps) => {
  const stage = getProgressVideoStage(percent);
  const treeStage = getGrowthStage(percent);
  const preset = getChallengeMediaPreset(presetId);
  const progressVideo = getChallengeProgressVideo(presetId, percent);
  const imageOpacity = useSharedValue(1);

  useEffect(() => {
    imageOpacity.value = 0.72;
    imageOpacity.value = withTiming(1, {
      duration: 520,
      easing: Easing.out(Easing.cubic),
    });
  }, [stage, presetId]);

  const imageStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [
      {
        scale: interpolate(imageOpacity.value, [0.72, 1], [0.98, 1]),
      },
    ],
  }));

  return (
    <View style={localStyles.illustrationCard}>
      {progressVideo ? (
        <Animated.View style={[localStyles.growthVideoWrap, imageStyle]}>
          <LoopingVideo
            key={`${presetId ?? "fallback"}-${stage}`}
            source={progressVideo}
            posterSource={preset?.image ?? treeStageImages[treeStage]}
            style={localStyles.growthVideo}
            resizeMode={ResizeMode.CONTAIN}
            isLooping={false}
          />
        </Animated.View>
      ) : (
        <Animated.Image
          source={treeStageImages[treeStage]}
          style={[localStyles.growthImage, imageStyle]}
          resizeMode="contain"
        />
      )}
      <Text style={localStyles.growthTitle}>Etapa {stage + 1} de 5</Text>
      <Text style={localStyles.growthSubtitle}>{getGrowthStageCopy(treeStage)}</Text>
    </View>
  );
});

const getGrowthStageCopy = (stage: number) => {
  const copy = [
    "La semilla está lista.",
    "El hábito empieza a brotar.",
    "Tu constancia gana forma.",
    "La energía se expande.",
    "El árbol sostiene tu avance.",
    "El challenge está floreciendo.",
  ];
  return copy[stage] ?? copy[0];
};

type ProgressSummaryCardProps = {
  completedDays: number[];
  totalDays: number;
};

export const ProgressSummaryCard = memo(
  ({ completedDays, totalDays }: ProgressSummaryCardProps) => {
    const percent = getCompletionPercent(completedDays, totalDays);
    const progress = useAnimatedProgress(percent);
    const fillStyle = useAnimatedStyle(() => ({
      width: `${progress.value * 100}%`,
    }));

    return (
      <View style={localStyles.summaryCard}>
        <View style={localStyles.summaryHeader}>
          <Text style={localStyles.cardTitle}>Resumen</Text>
          <Text style={localStyles.percentText}>{percent}%</Text>
        </View>
        <View style={localStyles.summaryTrack}>
          <Animated.View style={[localStyles.summaryFill, fillStyle]} />
        </View>
        <Text style={localStyles.summaryCopy}>
          {completedDays.length} de {totalDays} días completados.
        </Text>
      </View>
    );
  },
);

type CheckInButtonProps = {
  status: CheckInStatus;
  isLoading?: boolean;
  onPress: () => void;
};

export const CheckInButton = memo(({ status, isLoading, onPress }: CheckInButtonProps) => {
  const label =
    status === "completed"
      ? "¡Check-in completado!"
      : status === "broken"
        ? "Racha interrumpida — Volvé a empezar hoy"
        : "Hacer check-in de hoy";
  const icon =
    status === "completed"
      ? "checkmark-circle"
      : status === "broken"
        ? "refresh-circle"
        : "flame";
  const isCompleted = status === "completed";
  const isBroken = status === "broken";

  return (
    <TouchableOpacity
      style={[
        localStyles.checkInButton,
        isCompleted && localStyles.checkInCompleted,
        isBroken && localStyles.checkInBroken,
      ]}
      onPress={onPress}
      disabled={isLoading || isCompleted}
      activeOpacity={0.88}
    >
      {isLoading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          <Icon name={icon} size={21} color="#FFFFFF" />
          <Text style={localStyles.checkInText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
});

type ChatEntryRowProps = {
  onPress: () => void;
};

export const ChatEntryRow = memo(({ onPress }: ChatEntryRowProps) => (
  <TouchableOpacity style={localStyles.chatRow} onPress={onPress} activeOpacity={0.9}>
    <View style={localStyles.chatIconWrap}>
      <Icon name="chatbubbles-outline" size={21} color={palette.text} />
    </View>
    <View style={localStyles.chatCopy}>
      <Text style={localStyles.chatTitle}>Entrar al chat del challenge</Text>
      <Text style={localStyles.chatSubtitle}>Compartí avances con la comunidad.</Text>
    </View>
    <Icon name="chevron-forward" size={20} color={palette.muted} />
  </TouchableOpacity>
));

const mapEventToChallengeData = (
  event: EventFeedItem | undefined,
  checkins: string[],
  participant: any,
): ChallengeDetailData => {
  if (!event) return FALLBACK_CHALLENGE;
  const totalDays = Math.max(Number(event.durationDays ?? 0) || 0, 1);
  const currentDay = getCurrentDayFromStart(event.startsAt, totalDays);
  const completedDays = getCompletedDaysFromCheckins(checkins, event.startsAt, totalDays);
  const streak = Math.max(
    Number(participant?.streak ?? 0) || 0,
    completedDays.filter((day) => day <= currentDay).length,
  );

  return {
    id: event.id,
    title: event.title || FALLBACK_CHALLENGE.title,
    subtitle: event.description || event.subtitle || FALLBACK_CHALLENGE.subtitle,
    date: formatDisplayDate(event.startsAt),
    startsAt: event.startsAt,
    participantsCount: Number.parseInt(event.attendees, 10) || 0,
    totalDays,
    currentDay,
    completedDays,
    streak,
    bestStreak: Math.max(streak, Number(participant?.totalCheckins ?? 0) || streak),
    checkInStatus: getStatusFromData(currentDay, completedDays, participant?.checkedInToday),
  };
};

const ChallengeDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const event = route.params?.event as EventFeedItem | undefined;
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const { data: participant } = useChallengeParticipantQuery(event?.id, userId);
  const { data: remoteCheckins = [] } = useChallengeCheckinsQuery(event?.id, userId);
  const checkInMutation = useCheckInChallengeMutation();
  const [localCompletedDays, setLocalCompletedDays] = useState<number[]>([]);
  const [localStatus, setLocalStatus] = useState<CheckInStatus | null>(null);

  const baseChallenge = useMemo(
    () => mapEventToChallengeData(event, remoteCheckins, participant),
    [event, participant, remoteCheckins],
  );
  const completedDays = useMemo(
    () =>
      Array.from(new Set([...baseChallenge.completedDays, ...localCompletedDays]))
        .filter((day) => day >= 1 && day <= baseChallenge.totalDays)
        .sort((left, right) => left - right),
    [baseChallenge.completedDays, baseChallenge.totalDays, localCompletedDays],
  );
  const status =
    localStatus ??
    getStatusFromData(baseChallenge.currentDay, completedDays, participant?.checkedInToday);
  const challenge: ChallengeDetailData = {
    ...baseChallenge,
    completedDays,
    checkInStatus: status,
    streak:
      status === "completed"
        ? Math.max(baseChallenge.streak, completedDays.length)
        : baseChallenge.streak,
    bestStreak: Math.max(baseChallenge.bestStreak, completedDays.length),
  };
  const percent = getCompletionPercent(challenge.completedDays, challenge.totalDays);
  const daysLeft = getDaysLeft(challenge.totalDays, challenge.completedDays);
  const contentMaxWidth = width >= 700 ? 620 : undefined;

  const handleCheckIn = async () => {
    if (challenge.checkInStatus === "completed") return;

    if (event?.id && userId) {
      await checkInMutation.mutateAsync({
        challengeId: event.id,
        userId,
      });
    }

    setLocalCompletedDays((prev) =>
      Array.from(new Set([...prev, challenge.currentDay])),
    );
    setLocalStatus("completed");
    triggerHaptic();
  };

  return (
    <SafeAreaView style={localStyles.screen} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={[
          localStyles.content,
          {
            paddingBottom: insets.bottom + 28,
            maxWidth: contentMaxWidth,
            alignSelf: "center",
            width: "100%",
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ChallengeHeader
          challenge={challenge}
          onBack={() => navigation.goBack()}
        />
        <GrowthIllustration
          percent={percent}
          presetId={event?.imagePresetId ?? null}
        />
        <InfoCardsRow challenge={challenge} percent={percent} />
        <StreakSummaryCard
          streak={challenge.streak}
          bestStreak={challenge.bestStreak}
          daysLeft={daysLeft}
        />
        <AdaptiveProgress
          totalDays={challenge.totalDays}
          currentDay={challenge.currentDay}
          completedDays={challenge.completedDays}
        />
        <ProgressSummaryCard
          completedDays={challenge.completedDays}
          totalDays={challenge.totalDays}
        />
        <CheckInButton
          status={challenge.checkInStatus}
          isLoading={checkInMutation.isPending}
          onPress={() => {
            void handleCheckIn();
          }}
        />
        <ChatEntryRow
          onPress={() =>
            event
              ? navigation.navigate("EventChat" as never, { event } as never)
              : undefined
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 253, 248, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(45, 41, 36, 0.08)",
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: palette.goldDeep,
    fontSize: 14,
    fontFamily: "CormorantGaramond_700Bold",
    textTransform: "uppercase",
  },
  title: {
    marginTop: 2,
    color: palette.text,
    fontSize: 36,
    lineHeight: 39,
    fontFamily: "CormorantGaramond_700Bold",
  },
  subtitle: {
    marginTop: 8,
    color: palette.muted,
    fontSize: 19,
    lineHeight: 24,
    fontFamily: "CormorantGaramond_500Medium",
  },
  illustrationCard: {
    minHeight: 286,
    borderRadius: 26,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: "rgba(45, 41, 36, 0.07)",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    shadowColor: "#6F5536",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  growthImage: {
    width: "100%",
    height: 230,
  },
  growthVideoWrap: {
    width: "100%",
    height: 230,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: palette.bg,
  },
  growthVideo: {
    width: "100%",
    height: "100%",
  },
  growthTitle: {
    color: palette.text,
    textAlign: "center",
    fontSize: 23,
    fontFamily: "CormorantGaramond_700Bold",
  },
  growthSubtitle: {
    marginTop: 4,
    color: palette.muted,
    textAlign: "center",
    fontSize: 17,
    fontFamily: "CormorantGaramond_500Medium",
  },
  infoRow: {
    flexDirection: "row",
    gap: 10,
  },
  infoCard: {
    flex: 1,
    minHeight: 92,
    borderRadius: 20,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: "rgba(45, 41, 36, 0.07)",
    padding: 14,
    justifyContent: "center",
  },
  infoValue: {
    color: palette.text,
    fontSize: 30,
    lineHeight: 32,
    fontFamily: "CormorantGaramond_700Bold",
  },
  infoLabel: {
    marginTop: 4,
    color: palette.muted,
    fontSize: 14,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  streakCard: {
    borderRadius: 24,
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderColor: "rgba(226, 168, 79, 0.18)",
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  cardTitle: {
    color: palette.text,
    fontSize: 24,
    fontFamily: "CormorantGaramond_700Bold",
  },
  cardSubtitle: {
    marginTop: 4,
    color: palette.muted,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "CormorantGaramond_500Medium",
  },
  streakMetrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  streakValue: {
    color: palette.goldDeep,
    fontSize: 32,
    lineHeight: 34,
    textAlign: "center",
    fontFamily: "CormorantGaramond_700Bold",
  },
  streakLabel: {
    color: palette.muted,
    fontSize: 13,
    textAlign: "center",
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  metricDivider: {
    width: 1,
    height: 42,
    backgroundColor: "rgba(45, 41, 36, 0.1)",
  },
  progressCard: {
    borderRadius: 24,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: "rgba(45, 41, 36, 0.07)",
    padding: 18,
    shadowColor: "#6F5536",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 24,
    fontFamily: "CormorantGaramond_700Bold",
    marginBottom: 16,
  },
  pathRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pathItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  pathConnector: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: palette.faint,
  },
  pathConnectorDone: {
    backgroundColor: palette.gold,
  },
  dayCircle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: palette.gold,
  },
  dayCompleted: {
    backgroundColor: palette.accentBlue,
    borderColor: palette.accentBlue,
  },
  dayActive: {
    backgroundColor: palette.gold,
    borderColor: "#F6D59B",
  },
  dayFuture: {
    backgroundColor: "#F0ECE4",
    borderColor: palette.faint,
  },
  dayMissed: {
    backgroundColor: palette.redSoft,
    borderColor: "rgba(201, 105, 93, 0.22)",
  },
  dayText: {
    color: palette.text,
    fontSize: 14,
    fontFamily: "CormorantGaramond_700Bold",
  },
  dayTextActive: {
    color: "#FFFFFF",
  },
  dayTextFuture: {
    color: "#B6ADA2",
  },
  dayTextMissed: {
    color: palette.red,
  },
  compactTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: palette.faint,
    overflow: "hidden",
  },
  compactFill: {
    height: "100%",
    borderRadius: 6,
    backgroundColor: palette.gold,
  },
  milestonesRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  milestoneItem: {
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  milestoneText: {
    color: palette.muted,
    fontSize: 12,
    textAlign: "center",
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  calendarRow: {
    justifyContent: "space-between",
    marginBottom: 10,
  },
  calendarCell: {
    width: `${100 / 7}%`,
    alignItems: "center",
  },
  summaryCard: {
    borderRadius: 24,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: "rgba(45, 41, 36, 0.07)",
    padding: 18,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  percentText: {
    color: palette.goldDeep,
    fontSize: 25,
    fontFamily: "CormorantGaramond_700Bold",
  },
  summaryTrack: {
    marginTop: 14,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.faint,
    overflow: "hidden",
  },
  summaryFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: palette.accentBlue,
  },
  summaryCopy: {
    marginTop: 10,
    color: palette.muted,
    fontSize: 16,
    fontFamily: "CormorantGaramond_500Medium",
  },
  checkInButton: {
    minHeight: 58,
    borderRadius: 29,
    backgroundColor: palette.gold,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 18,
    shadowColor: palette.goldDeep,
    shadowOpacity: 0.24,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
  },
  checkInCompleted: {
    backgroundColor: palette.accentBlue,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  checkInBroken: {
    backgroundColor: palette.red,
  },
  checkInText: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 22,
    fontFamily: "CormorantGaramond_700Bold",
    textAlign: "center",
  },
  chatRow: {
    borderRadius: 22,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: "rgba(45, 41, 36, 0.08)",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  chatIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5EFE6",
  },
  chatCopy: {
    flex: 1,
  },
  chatTitle: {
    color: palette.text,
    fontSize: 19,
    fontFamily: "CormorantGaramond_700Bold",
  },
  chatSubtitle: {
    marginTop: 2,
    color: palette.muted,
    fontSize: 14,
    fontFamily: "CormorantGaramond_500Medium",
  },
});

export default ChallengeDetailScreen;
