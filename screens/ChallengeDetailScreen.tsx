/** @format */

import React, { memo, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  PanResponder,
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
import Avatar from "../components/Avatar";
import LoopingVideo from "../components/LoopingVideo";
import {
  useChallengeCheckinsQuery,
  useChallengeParticipantQuery,
  useChallengeJoinRequestQuery,
  useChallengeJoinRequestsQuery,
  useChallengeTodayCheckinsCountQuery,
  useJoinChallengeMutation,
  useRequestChallengeJoinMutation,
  useApproveChallengeJoinRequestMutation,
  useCheckInChallengeMutation,
  type EventFeedItem,
} from "../src/queries/events.queries";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  getChallengeMediaPreset,
  getChallengeProgressVideo,
  type ChallengeMediaPresetId,
} from "../src/constants/challengeMediaPresets";
import { shareChallengeInvite, shareChallengeProgress } from "../src/lib/socialShare";

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

const FOOTER_SLIDER_HANDLE_SIZE = 42;
const FOOTER_SLIDER_HORIZONTAL_PADDING = 8;

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

const getVisibilityMeta = (visibility?: EventFeedItem["visibility"]) => {
  if (visibility === "friends") {
    return {
      icon: "people-outline" as const,
      label: "Solo amigos",
      subtitle: "Una práctica reservada para tus conexiones",
    };
  }
  if (visibility === "private") {
    return {
      icon: "lock-closed-outline" as const,
      label: "Privado",
      subtitle: "Un espacio íntimo para sostenerte",
    };
  }
  return {
    icon: "earth-outline" as const,
    label: "Público",
    subtitle: "La comunidad puede descubrirlo y sumarse",
  };
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
  onShare?: () => void;
  statusLabel?: string;
  statusTone?: "active" | "done" | "warm";
};

export const ChallengeHeader = memo(({ challenge, onBack, onShare, statusLabel, statusTone = "active" }: ChallengeHeaderProps) => (
  <View style={localStyles.header}>
    <TouchableOpacity style={localStyles.iconButton} onPress={onBack}>
      <Icon name="chevron-back" size={23} color={palette.text} />
    </TouchableOpacity>
    <View style={localStyles.headerCopy}>
      <Text style={localStyles.eyebrow}>Desafío</Text>
      <Text style={localStyles.title}>{challenge.title}</Text>
      <Text style={localStyles.subtitle}>{challenge.subtitle}</Text>
      {statusLabel ? (
        <View
          style={[
            localStyles.headerStatusPill,
            statusTone === "done"
              ? localStyles.headerStatusPillDone
              : statusTone === "warm"
                ? localStyles.headerStatusPillWarm
                : null,
          ]}
        >
          <Text style={localStyles.headerStatusText}>{statusLabel}</Text>
        </View>
      ) : null}
    </View>
    <TouchableOpacity style={localStyles.iconButton} onPress={onShare}>
      <Icon name="share-social-outline" size={21} color={palette.text} />
    </TouchableOpacity>
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
          {daysLeft === 0 ? "Desafío completo" : `${daysLeft} días por delante`}
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

const getStreakCelebrationCopy = (streak: number) => {
  if (streak >= 21) {
    return {
      title: `Racha de ${streak} días`,
      body: "Tu práctica ya tiene una raíz profunda. Lo que sostenés también te sostiene.",
    };
  }
  if (streak >= 14) {
    return {
      title: `Racha de ${streak} días`,
      body: "Tu constancia ya cambió el ritmo del challenge. Se nota en tu energía.",
    };
  }
  if (streak >= 7) {
    return {
      title: `Racha de ${streak} días`,
      body: "Una semana presente. Seguí así: la comunidad también empuja con vos.",
    };
  }
  return {
    title: `Racha de ${streak} días`,
    body: "Buen ritmo. Cada check-in suma presencia y te acerca al cierre del challenge.",
  };
};

const StreakCelebrationCard = memo(({ streak }: { streak: number }) => {
  const glow = useSharedValue(0.92);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.96, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glow.value }],
    opacity: interpolate(glow.value, [0.96, 1.02], [0.76, 1]),
  }));
  const copy = getStreakCelebrationCopy(streak);

  return (
    <View style={localStyles.celebrationCard}>
      <Animated.View style={[localStyles.celebrationGlow, animatedStyle]} />
      <View style={localStyles.celebrationBadge}>
        <Icon name="sparkles-outline" size={17} color={palette.goldDeep} />
      </View>
      <View style={localStyles.celebrationCopy}>
        <Text style={localStyles.celebrationTitle}>{copy.title}</Text>
        <Text style={localStyles.celebrationBody}>{copy.body}</Text>
      </View>
    </View>
  );
});

const CommunityPulseCard = memo(
  ({
    checkedInTodayCount,
    participantsCount,
  }: {
    checkedInTodayCount: number;
    participantsCount: number;
  }) => (
    <View style={localStyles.communityCard}>
      <View style={localStyles.communityBadge}>
        <Icon name="people-outline" size={17} color={palette.goldDeep} />
      </View>
      <View style={localStyles.communityCopy}>
        <Text style={localStyles.communityTitle}>
          {checkedInTodayCount > 0
            ? `${checkedInTodayCount} personas ya hicieron check-in hoy`
            : "Todavía nadie hizo check-in hoy"}
        </Text>
        <Text style={localStyles.communitySubtitle}>
          {participantsCount > 0
            ? `${participantsCount} personas están transitando este challenge`
            : "Tu presencia puede abrir el ritmo del día"}
        </Text>
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
        <Text style={localStyles.sectionTitle}>Camino del desafío</Text>
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
    "El desafío está floreciendo.",
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
      <Text style={localStyles.chatTitle}>Entrar al chat del desafío</Text>
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
  const joinChallengeMutation = useJoinChallengeMutation();
  const requestChallengeJoinMutation = useRequestChallengeJoinMutation();
  const approveJoinRequestMutation = useApproveChallengeJoinRequestMutation();
  const { data: ownJoinRequest } = useChallengeJoinRequestQuery(event?.id, userId);
  const { data: challengeJoinRequests = [] } = useChallengeJoinRequestsQuery(
    event?.id,
  );
  const { data: remoteCheckins = [] } = useChallengeCheckinsQuery(event?.id, userId);
  const { data: remoteCheckedInTodayCount = 0 } = useChallengeTodayCheckinsCountQuery(event?.id);
  const checkInMutation = useCheckInChallengeMutation();
  const [localCompletedDays, setLocalCompletedDays] = useState<number[]>([]);
  const [localStatus, setLocalStatus] = useState<CheckInStatus | null>(null);
  const [footerSliderWidth, setFooterSliderWidth] = useState(0);
  const [footerSliderOffset, setFooterSliderOffset] = useState(0);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationTitle, setCelebrationTitle] = useState("Día completado");
  const [celebrationBody, setCelebrationBody] = useState("Gracias por elegirte hoy");

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
  const isAdmin = Boolean(userId && event?.createdBy && userId === event.createdBy);
  const isJoined = Boolean(participant);
  const visibilityMeta = getVisibilityMeta(event?.visibility);
  const pendingJoinRequests = challengeJoinRequests.filter(
    (request) => request.status === "pending",
  );
  const percent = getCompletionPercent(challenge.completedDays, challenge.totalDays);
  const daysLeft = getDaysLeft(challenge.totalDays, challenge.completedDays);
  const todayKey = new Date().toISOString().split("T")[0];
  const hasRemoteTodayCheckin =
    participant?.checkedInToday ||
    remoteCheckins.includes(todayKey);
  const checkedInTodayCount =
    remoteCheckedInTodayCount +
    (challenge.checkInStatus === "completed" && !hasRemoteTodayCheckin ? 1 : 0);
  const contentMaxWidth = width >= 700 ? 620 : undefined;
  const isChallengeCompleted =
    challenge.checkInStatus === "completed" &&
    (challenge.currentDay >= challenge.totalDays ||
      challenge.completedDays.length >= challenge.totalDays);
  const headerStatus = isChallengeCompleted
    ? { label: "Challenge completado", tone: "done" as const }
    : challenge.checkInStatus === "completed"
      ? { label: "Hecho hoy", tone: "active" as const }
      : challenge.checkInStatus === "broken"
        ? { label: "Retomá hoy", tone: "warm" as const }
        : { label: `Día ${challenge.currentDay} activo`, tone: "active" as const };
  const footerSliderMaxOffset = Math.max(
    footerSliderWidth -
      FOOTER_SLIDER_HANDLE_SIZE -
      FOOTER_SLIDER_HORIZONTAL_PADDING * 2,
    0,
  );
  const footerSliderFillWidth = Math.min(
    footerSliderOffset +
      FOOTER_SLIDER_HANDLE_SIZE +
      FOOTER_SLIDER_HORIZONTAL_PADDING * 2,
    footerSliderWidth,
  );
  const celebrationProgress = useSharedValue(0);

  const resetFooterSlider = () => {
    setFooterSliderOffset(0);
  };

  const handleCheckIn = async () => {
    if (challenge.checkInStatus === "completed") return;

    if (event?.id && userId) {
      await checkInMutation.mutateAsync({
        challengeId: event.id,
        userId,
      });
    }

    const nextCompletedDays = Array.from(
      new Set([...completedDays, challenge.currentDay]),
    );
    const reachedFinalCheckIn =
      challenge.currentDay >= challenge.totalDays ||
      nextCompletedDays.length >= challenge.totalDays;
    setLocalCompletedDays(nextCompletedDays);
    setLocalStatus("completed");
    setFooterSliderOffset(footerSliderMaxOffset);
    setCelebrationTitle(
      reachedFinalCheckIn ? "Challenge completado" : "Día completado",
    );
    setCelebrationBody(
      reachedFinalCheckIn
        ? "Sostuviste el proceso hasta el final. Tu energía cambió."
        : "Gracias por volver a vos y sostener tu ritmo hoy.",
    );
    setCelebrationVisible(true);
    if (reachedFinalCheckIn) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    triggerHaptic();
  };

  const handleShare = async () => {
    if (!event) return;

    if (isJoined) {
      await shareChallengeProgress(event, {
        currentDay: challenge.currentDay,
        totalDays: challenge.totalDays,
        streak: challenge.streak,
      });
      return;
    }

    await shareChallengeInvite(event);
  };

  const handleJoinOrRequest = async () => {
    if (!event?.id || !userId) return;

    if ((event.visibility ?? "public") === "public") {
      await joinChallengeMutation.mutateAsync({
        challengeId: event.id,
        userId,
      });
      return;
    }

    await requestChallengeJoinMutation.mutateAsync({
      challengeId: event.id,
      userId,
    });
  };

  const handleApproveJoinRequest = async (requestId: string, requesterId: string) => {
    if (!event?.id || !userId) return;

    await approveJoinRequestMutation.mutateAsync({
      requestId,
      challengeId: event.id,
      requesterId,
      responderId: userId,
    });
  };

  useEffect(() => {
    if (challenge.checkInStatus !== "completed") {
      resetFooterSlider();
      return;
    }

    setFooterSliderOffset(footerSliderMaxOffset);
  }, [challenge.checkInStatus, footerSliderMaxOffset]);

  useEffect(() => {
    if (!celebrationVisible) {
      celebrationProgress.value = 0;
      return;
    }

    celebrationProgress.value = withTiming(1, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });

    const hideTimer = setTimeout(() => {
      celebrationProgress.value = withTiming(0, {
        duration: 240,
        easing: Easing.inOut(Easing.quad),
      });
      setTimeout(() => {
        setCelebrationVisible(false);
      }, 240);
    }, 2200);

    return () => clearTimeout(hideTimer);
  }, [celebrationProgress, celebrationVisible]);

  const celebrationAnimatedStyle = useAnimatedStyle(() => ({
    opacity: celebrationProgress.value,
    transform: [
      {
        translateY: interpolate(celebrationProgress.value, [0, 1], [20, 0]),
      },
      {
        scale: interpolate(celebrationProgress.value, [0, 1], [0.96, 1]),
      },
    ],
  }));

  const footerSliderResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          challenge.checkInStatus !== "completed" &&
          !checkInMutation.isPending &&
          Math.abs(gestureState.dx) > 6,
        onPanResponderMove: (_, gestureState) => {
          const next = clamp(gestureState.dx, 0, footerSliderMaxOffset);
          setFooterSliderOffset(next);
        },
        onPanResponderRelease: (_, gestureState) => {
          const next = clamp(gestureState.dx, 0, footerSliderMaxOffset);
          const shouldComplete =
            footerSliderMaxOffset > 0 && next >= footerSliderMaxOffset * 0.72;

          if (shouldComplete) {
            setFooterSliderOffset(footerSliderMaxOffset);
            void handleCheckIn();
          } else {
            resetFooterSlider();
          }
        },
        onPanResponderTerminate: () => {
          resetFooterSlider();
        },
      }),
    [challenge.checkInStatus, checkInMutation.isPending, footerSliderMaxOffset],
  );

  const renderFooterCheckIn = () => {
    if (challenge.checkInStatus === "completed") {
      return (
        <View style={[localStyles.footerSliderTrack, localStyles.footerSliderTrackCompleted]}>
          <View style={[localStyles.footerSliderHandle, localStyles.footerSliderHandleCompleted]}>
            <Icon name="checkmark" size={22} color="#FFFFFF" />
          </View>
          <View style={localStyles.footerSliderCopy}>
            <Text style={localStyles.footerSliderTitle}>
              {isChallengeCompleted ? "Challenge completado" : "Día completado"}
            </Text>
            <Text style={localStyles.footerSliderSubtitle}>
              {isChallengeCompleted
                ? "Lo sostuviste hasta el final"
                : "Gracias por elegirte hoy"}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View
        style={localStyles.footerSliderWrap}
        onLayout={(event) =>
          setFooterSliderWidth(event.nativeEvent.layout.width)
        }
      >
        <View style={localStyles.footerSliderTrack}>
          <View
            style={[
              localStyles.footerSliderFill,
              { width: footerSliderFillWidth || FOOTER_SLIDER_HANDLE_SIZE + FOOTER_SLIDER_HORIZONTAL_PADDING * 2 },
            ]}
            pointerEvents="none"
          />
          <View style={localStyles.footerSliderChevrons} pointerEvents="none">
            <Icon name="chevron-forward" size={16} color="#E2A84F" />
            <Icon name="chevron-forward" size={16} color="#E2A84F" />
          </View>
          <View style={localStyles.footerSliderCopy}>
            <Text style={localStyles.footerSliderTitle}>Check-in diario</Text>
            <Text style={localStyles.footerSliderSubtitle}>
              Deslizá para completar tu día
            </Text>
          </View>
        </View>
        <View
          style={[
            localStyles.footerSliderHandle,
            { transform: [{ translateX: footerSliderOffset }] },
          ]}
          {...footerSliderResponder.panHandlers}
        >
          {checkInMutation.isPending ? (
            <ActivityIndicator color={palette.goldDeep} />
          ) : (
            <Icon name="sunny-outline" size={22} color={palette.goldDeep} />
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={localStyles.screen} edges={["top", "left", "right"]}>
      <View
        style={[
          localStyles.stickyHeader,
          { top: Math.max(insets.top + 8, 16), maxWidth: contentMaxWidth, alignSelf: "center" },
        ]}
      >
        <ChallengeHeader
          challenge={challenge}
          onBack={() => navigation.goBack()}
          onShare={() => {
            void handleShare();
          }}
          statusLabel={headerStatus.label}
          statusTone={headerStatus.tone}
        />
      </View>
      <ScrollView
        contentContainerStyle={[
          localStyles.content,
          {
            paddingTop: 128,
            paddingBottom: insets.bottom + 188,
            maxWidth: contentMaxWidth,
            alignSelf: "center",
            width: "100%",
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <GrowthIllustration
          percent={percent}
          presetId={event?.imagePresetId ?? null}
        />
        <InfoCardsRow challenge={challenge} percent={percent} />
        <View style={localStyles.visibilityCard}>
          <View style={localStyles.visibilityBadge}>
            <Icon
              name={visibilityMeta.icon}
              size={18}
              color={palette.goldDeep}
            />
          </View>
          <View style={localStyles.visibilityCopy}>
            <Text style={localStyles.visibilityTitle}>{visibilityMeta.label}</Text>
            <Text style={localStyles.visibilitySubtitle}>
              {visibilityMeta.subtitle}
            </Text>
          </View>
        </View>
        <CommunityPulseCard
          checkedInTodayCount={checkedInTodayCount}
          participantsCount={challenge.participantsCount}
        />
        {isAdmin && pendingJoinRequests.length > 0 ? (
          <View style={localStyles.requestCard}>
            <View style={localStyles.requestCardHeader}>
              <Text style={localStyles.requestCardTitle}>Solicitudes</Text>
              <Text style={localStyles.requestCardCount}>
                {pendingJoinRequests.length}
              </Text>
            </View>
            {pendingJoinRequests.slice(0, 2).map((request) => (
              <View key={request.id} style={localStyles.requestRow}>
                <View style={localStyles.requestProfile}>
                  <Avatar
                    uri={request.requesterAvatar}
                    size={38}
                    fallbackBackgroundColor="#E9E4DD"
                    fallbackIconColor={palette.muted}
                  />
                  <Text style={localStyles.requestName} numberOfLines={1}>
                    {request.requesterName ?? "Participante"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={localStyles.requestApproveButton}
                  disabled={approveJoinRequestMutation.isPending}
                  onPress={() => {
                    void handleApproveJoinRequest(request.id, request.requesterId);
                  }}
                >
                  <Text style={localStyles.requestApproveText}>Aprobar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}
        {challenge.streak >= 3 ? <StreakCelebrationCard streak={challenge.streak} /> : null}
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
      </ScrollView>

      <View
        style={[
          localStyles.stickyFooter,
          {
            bottom: Math.max(insets.bottom + 12, 20),
            maxWidth: contentMaxWidth,
            alignSelf: "center",
          },
        ]}
      >
        <View style={localStyles.stickyFooterCard}>
          {isJoined ? (
            <>
              {renderFooterCheckIn()}
              <ChatEntryRow
                onPress={() =>
                  event
                    ? navigation.navigate("EventChat" as never, { event } as never)
                    : undefined
                }
              />
            </>
          ) : isAdmin ? (
            <>
              <TouchableOpacity
                style={localStyles.joinRequestButton}
                disabled={joinChallengeMutation.isPending}
                onPress={() => {
                  if (!event?.id || !userId) return;
                  void joinChallengeMutation.mutateAsync({
                    challengeId: event.id,
                    userId,
                  });
                }}
              >
                {joinChallengeMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={localStyles.joinRequestButtonTitle}>
                      Empezar mi challenge
                    </Text>
                    <Text style={localStyles.joinRequestButtonSubtitle}>
                      Activá tu propio espacio y entrá al chat del challenge
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={localStyles.chatLockedRow}>
                <Icon name="trophy-outline" size={18} color={palette.muted} />
                <Text style={localStyles.chatLockedText}>
                  Cuando lo actives, también aparece tu progreso diario.
                </Text>
              </View>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={localStyles.joinRequestButton}
                disabled={
                  joinChallengeMutation.isPending ||
                  requestChallengeJoinMutation.isPending ||
                  ownJoinRequest?.status === "pending"
                }
                onPress={() => {
                  void handleJoinOrRequest();
                }}
              >
                {(joinChallengeMutation.isPending ||
                  requestChallengeJoinMutation.isPending) ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={localStyles.joinRequestButtonTitle}>
                      {(event?.visibility ?? "public") === "public"
                        ? "Sumarme al challenge"
                        : ownJoinRequest?.status === "pending"
                          ? "Solicitud enviada"
                          : "Solicitar acceso"}
                    </Text>
                    <Text style={localStyles.joinRequestButtonSubtitle}>
                      {(event?.visibility ?? "public") === "public"
                        ? "Entrás directo al espacio compartido"
                        : "El creador lo puede aprobar cuando quiera"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={localStyles.chatLockedRow}>
                <Icon name="chatbubbles-outline" size={18} color={palette.muted} />
                <Text style={localStyles.chatLockedText}>
                  Uníte o pedí acceso para entrar al chat
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {celebrationVisible ? (
        <Animated.View
          pointerEvents="none"
          style={[
            localStyles.completionCelebration,
            { top: Math.max(insets.top + 110, 148) },
            celebrationAnimatedStyle,
          ]}
        >
          <View style={localStyles.completionCelebrationBadge}>
            <Icon
              name={isChallengeCompleted ? "trophy-outline" : "sparkles-outline"}
              size={20}
              color="#FFFFFF"
            />
          </View>
          <Text style={localStyles.completionCelebrationTitle}>
            {celebrationTitle}
          </Text>
          <Text style={localStyles.completionCelebrationBody}>
            {celebrationBody}
          </Text>
        </Animated.View>
      ) : null}
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
  stickyHeader: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 40,
    elevation: 16,
  },
  stickyFooter: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 40,
    elevation: 16,
  },
  stickyFooterCard: {
    borderRadius: 26,
    backgroundColor: "rgba(246, 246, 244, 0.96)",
    padding: 12,
    gap: 10,
    shadowColor: "#6F5536",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  joinRequestButton: {
    borderRadius: 24,
    backgroundColor: palette.gold,
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.goldDeep,
    shadowOpacity: 0.20,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  joinRequestButtonTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 20,
    fontFamily: "CormorantGaramond_700Bold",
  },
  joinRequestButtonSubtitle: {
    marginTop: 4,
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    lineHeight: 16,
    fontFamily: "CormorantGaramond_500Medium",
  },
  chatLockedRow: {
    borderRadius: 18,
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "rgba(45, 41, 36, 0.08)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chatLockedText: {
    flex: 1,
    color: palette.muted,
    fontSize: 14,
    lineHeight: 17,
    fontFamily: "CormorantGaramond_500Medium",
  },
  completionCelebration: {
    position: "absolute",
    left: 24,
    right: 24,
    zIndex: 55,
    borderRadius: 24,
    backgroundColor: "rgba(255, 252, 247, 0.98)",
    borderWidth: 1,
    borderColor: "rgba(226, 168, 79, 0.22)",
    paddingHorizontal: 20,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#6F5536",
    shadowOpacity: 0.18,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  completionCelebrationBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  completionCelebrationTitle: {
    marginTop: 12,
    color: palette.text,
    fontSize: 24,
    lineHeight: 28,
    fontFamily: "CormorantGaramond_700Bold",
    textAlign: "center",
  },
  completionCelebrationBody: {
    marginTop: 6,
    color: palette.muted,
    fontSize: 16,
    lineHeight: 21,
    fontFamily: "CormorantGaramond_500Medium",
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    backgroundColor: "rgba(246, 246, 244, 0.96)",
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 8,
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
  headerStatusPill: {
    alignSelf: "flex-start",
    marginTop: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(174, 191, 209, 0.20)",
  },
  headerStatusPillDone: {
    backgroundColor: "rgba(174, 209, 178, 0.22)",
  },
  headerStatusPillWarm: {
    backgroundColor: "rgba(228, 183, 110, 0.18)",
  },
  headerStatusText: {
    color: palette.text,
    fontSize: 13,
    lineHeight: 16,
    fontFamily: "CormorantGaramond_700Bold",
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
  communityCard: {
    borderRadius: 22,
    backgroundColor: "#FFF9EF",
    borderWidth: 1,
    borderColor: "rgba(226, 168, 79, 0.18)",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  visibilityCard: {
    borderRadius: 22,
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "rgba(45, 41, 36, 0.07)",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  visibilityBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 223, 177, 0.32)",
  },
  visibilityCopy: {
    flex: 1,
  },
  visibilityTitle: {
    color: palette.text,
    fontSize: 18,
    lineHeight: 21,
    fontFamily: "CormorantGaramond_700Bold",
  },
  visibilitySubtitle: {
    marginTop: 3,
    color: palette.muted,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "CormorantGaramond_500Medium",
  },
  communityBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 223, 177, 0.42)",
  },
  communityCopy: {
    flex: 1,
  },
  communityTitle: {
    color: palette.text,
    fontSize: 18,
    lineHeight: 22,
    fontFamily: "CormorantGaramond_700Bold",
  },
  communitySubtitle: {
    marginTop: 4,
    color: palette.muted,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "CormorantGaramond_500Medium",
  },
  requestCard: {
    borderRadius: 22,
    backgroundColor: "#FFF9EF",
    borderWidth: 1,
    borderColor: "rgba(226, 168, 79, 0.18)",
    padding: 16,
    gap: 12,
  },
  requestCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  requestCardTitle: {
    color: palette.text,
    fontSize: 20,
    lineHeight: 22,
    fontFamily: "CormorantGaramond_700Bold",
  },
  requestCardCount: {
    color: palette.goldDeep,
    fontSize: 20,
    lineHeight: 22,
    fontFamily: "CormorantGaramond_700Bold",
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  requestProfile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  requestAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3ECE0",
  },
  requestName: {
    flex: 1,
    color: palette.text,
    fontSize: 16,
    lineHeight: 18,
    fontFamily: "CormorantGaramond_600SemiBold",
  },
  requestApproveButton: {
    borderRadius: 999,
    backgroundColor: "rgba(174, 191, 209, 0.22)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  requestApproveText: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 16,
    fontFamily: "CormorantGaramond_700Bold",
  },
  celebrationCard: {
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: "#FFF9EF",
    borderWidth: 1,
    borderColor: "rgba(226, 168, 79, 0.18)",
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  celebrationGlow: {
    position: "absolute",
    left: -12,
    top: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255, 223, 177, 0.24)",
  },
  celebrationBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF2D8",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.82)",
  },
  celebrationCopy: {
    flex: 1,
  },
  celebrationTitle: {
    color: palette.text,
    fontSize: 22,
    lineHeight: 24,
    fontFamily: "CormorantGaramond_700Bold",
  },
  celebrationBody: {
    marginTop: 4,
    color: palette.muted,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "CormorantGaramond_500Medium",
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
  footerSliderWrap: {
    minHeight: 68,
    justifyContent: "center",
  },
  footerSliderTrack: {
    minHeight: 68,
    borderRadius: 34,
    backgroundColor: "#FFF9EF",
    borderWidth: 1,
    borderColor: "rgba(226, 168, 79, 0.24)",
    overflow: "hidden",
    justifyContent: "center",
    paddingLeft: 124,
    paddingRight: 20,
  },
  footerSliderTrackCompleted: {
    backgroundColor: "rgba(210, 231, 213, 0.52)",
    borderColor: "rgba(152, 186, 147, 0.34)",
  },
  footerSliderFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 34,
    backgroundColor: "rgba(255, 223, 177, 0.58)",
  },
  footerSliderHandle: {
    position: "absolute",
    left: FOOTER_SLIDER_HORIZONTAL_PADDING,
    top: 13,
    width: FOOTER_SLIDER_HANDLE_SIZE,
    height: FOOTER_SLIDER_HANDLE_SIZE,
    borderRadius: FOOTER_SLIDER_HANDLE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7E6",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.92)",
    shadowColor: "#F0AE7C",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  footerSliderHandleCompleted: {
    backgroundColor: "#8CB389",
    shadowOpacity: 0,
  },
  footerSliderCopy: {
    justifyContent: "center",
    gap: 2,
    zIndex: 1,
  },
  footerSliderTitle: {
    color: palette.text,
    fontSize: 17,
    lineHeight: 20,
    fontFamily: "CormorantGaramond_700Bold",
  },
  footerSliderSubtitle: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 16,
    fontFamily: "CormorantGaramond_500Medium",
  },
  footerSliderChevrons: {
    position: "absolute",
    left: 62,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    opacity: 0.82,
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
