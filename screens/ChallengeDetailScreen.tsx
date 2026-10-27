import EventInviteSheet from "../components/EventInviteSheet";
import AppHeader from "../components/AppHeader";
import ChallengeCompletionShareCard from "../components/ChallengeCompletionShareCard";
import { captureRef, releaseCapture } from "react-native-view-shot";
import ChallengeCompletionConfetti from "../components/ChallengeCompletionConfetti";
import ChallengeJourneyPath from "../components/ChallengeJourneyPath";
import BackButton from "../components/BackButton";
import { useLocalDay } from "../src/hooks/useLocalDay";
import { usePublicContentBack } from "../src/hooks/usePublicContentBack";
import { resolvePublicContentRoute } from "../src/lib/publicContentRoute";
import { getChallengeDay, completedChallengeDays, getChallengeStreaks } from "../src/lib/challengeProgress";
import MediaImage from "../components/MediaImage";
import { playAnimation } from "../src/vibi/controller";
import ChallengeDaysSection from "../components/challengeDays/ChallengeDaysSection";
import ParticipantsSheet from "../components/ParticipantsSheet";
/** @format */

import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Animated as NativeAnimated,
  PanResponder,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "../components/Typography";
import * as Haptics from "expo-haptics";
import { StackActions, useNavigation, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Icon from "../components/Icon";
import Avatar from "../components/Avatar";
import ScreenContainer from "../components/ScreenContainer";
import VibesLoader from "../components/VibesLoader";
import DeepLinkLoadingState from "../components/DeepLinkLoadingState";
import AnimatedSheetModal from "../components/AnimatedSheetModal";
import {
  useChallengeCheckinsQuery,
  useChallengeParticipantQuery,
  useChallengeParticipantsQuery,
  useChallengeJoinRequestQuery,
  useChallengeJoinRequestsQuery,
  useChallengeTodayCheckinsCountQuery,
  useJoinChallengeMutation,
  useRequestChallengeJoinMutation,
  useApproveChallengeJoinRequestMutation,
  useCheckInChallengeMutation,
  useLeaveChallengeMutation,
  useDeleteChallengeMutation,
  fetchEventFeedItemById,
  fetchIsRestrictedChallenge,
  type EventFeedItem,
} from "../src/queries/events.queries";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  getChallengeStartsInLabel,
  getChallengeTimeline,
} from "../src/lib/challengeTimeline";
import {
  getChallengeMediaPreset,
  parseChallengeMediaPreset,
} from "../src/constants/challengeMediaPresets";
import {
  shareChallengeInvite,
  shareChallengeProgress,
  shareChallengeCompletion,
} from "../src/lib/socialShare";
import { vibesTheme } from "../src/theme/vibesTheme";
import { WHITE } from "../assets/styles";
import { promptForPublicContentAuth } from "../src/lib/publicContentAuth";
import { useI18n } from "../src/i18n";
import { useReceivedChallengeInvitationsQuery } from "../src/queries/challengeRestart.queries";
import { isCuratedChallenge } from "../src/lib/curatedChallenges";
import RestartChallengeConfirmSheet from "../components/challengeRestart/RestartChallengeConfirmSheet";
import ChallengeInviteesSection from "../components/challengeRestart/ChallengeInviteesSection";
import ChallengeInvitationActions from "../components/challengeRestart/ChallengeInvitationActions";

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
  bg: vibesTheme.colors.background,
  surface: vibesTheme.colors.background,
  surfaceAlt: "rgba(244, 163, 64, 0.13)",
  text: vibesTheme.colors.primaryText,
  muted: vibesTheme.colors.secondaryText,
  faint: "rgba(216, 140, 122, 0.31)",
  gold: vibesTheme.colors.accentMustard,
  goldDeep: vibesTheme.colors.accentMustard,
  accentBlue: vibesTheme.colors.accentBlue,
  accentBlueDeep: vibesTheme.colors.secondaryText,
  accentBlueSoft: "rgba(57, 120, 184, 0.18)",
  red: vibesTheme.colors.accentCoral,
  redSoft: "rgba(216, 140, 122, 0.17)",
};

const FOOTER_SLIDER_HANDLE_SIZE = 50;
const FOOTER_SLIDER_HORIZONTAL_PADDING = 8;
const FOOTER_SLIDER_TRACK_HEIGHT = 68;
const FOOTER_SLIDER_FILL_LEFT =
  FOOTER_SLIDER_HORIZONTAL_PADDING +
  FOOTER_SLIDER_HANDLE_SIZE / 2 -
  FOOTER_SLIDER_TRACK_HEIGHT / 2;

export const getProgressMode = (totalDays: number): ProgressMode => {
  if (totalDays <= 30) return "path";
  return "calendar";
};

export const getCompletionPercent = (
  completedDays: number[],
  totalDays: number
) => {
  if (totalDays <= 0) return 0;
  const uniqueCompleted = new Set(
    completedDays.filter((day) => day >= 1 && day <= totalDays)
  );
  return Math.min(100, Math.round((uniqueCompleted.size / totalDays) * 100));
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

const getStatusFromData = (
  currentDay: number,
  completedDays: number[],
  participantCheckedToday?: boolean
): CheckInStatus => {
  if (participantCheckedToday || completedDays.includes(currentDay))
    return "completed";
  if (currentDay > 1 && !completedDays.includes(currentDay - 1))
    return "broken";
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

const useCountUpValue = (target: number, duration = 700) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const nextTarget = Math.max(0, Math.round(target));
    if (nextTarget === 0) {
      setValue(0);
      return;
    }

    let frameId = 0;
    const startedAt = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(nextTarget * eased));

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    setValue(0);
    frameId = requestAnimationFrame(tick);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [duration, target]);

  return value;
};

type CountUpTextProps = {
  value: number;
  duration?: number;
  style: any;
};

const CountUpText = memo(
  ({ value, duration = 700, style }: CountUpTextProps) => {
    const animatedValue = useCountUpValue(value, duration);

    return <Text style={style}>{animatedValue}</Text>;
  }
);

type ChallengeHeroProps = {
  imageSource: any;
};

export const ChallengeHero = memo(({ imageSource }: ChallengeHeroProps) => (
  <View style={localStyles.heroMedia}>
    <MediaImage
      source={imageSource}
      style={localStyles.heroImage}
      resizeMode="cover"
    />
    <View style={localStyles.heroScrim} />
  </View>
));

type InfoCardsRowProps = {
  challenge: ChallengeDetailData;
  percent: number;
};

export const InfoCardsRow = memo(
  ({ challenge, percent }: InfoCardsRowProps) => (
    <View style={localStyles.infoRow}>
      <View style={localStyles.infoCard}>
        <CountUpText
          value={challenge.currentDay}
          style={localStyles.infoValue}
        />
        <Text
          style={localStyles.infoLabel}
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1}
        >
          Día actual
        </Text>
      </View>
      <View style={localStyles.infoCard}>
        <View style={localStyles.infoValueRow}>
          <CountUpText value={percent} style={localStyles.infoValue} />
          <Text style={localStyles.infoValueSuffix}>%</Text>
        </View>
        <Text
          style={localStyles.infoLabel}
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1}
        >
          Completado
        </Text>
      </View>
      <View style={localStyles.infoCard}>
        <CountUpText
          value={challenge.participantsCount}
          style={localStyles.infoValue}
        />
        <Text
          style={localStyles.infoLabel}
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1}
        >
          Personas
        </Text>
      </View>
    </View>
  )
);

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
  )
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
      body: "Tu constancia ya cambió el ritmo del desafío. Se nota en tu energía.",
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
    body: "Buen ritmo. Cada check-in suma presencia y te acerca al cierre del desafío.",
  };
};

const StreakCelebrationCard = memo(({ streak }: { streak: number }) => {
  const glow = useSharedValue(0.92);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.96, { duration: 1600, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glow.value }],
    opacity: interpolate(glow.value, [0.96, 1.02], [0.76, 1]),
  }));
  const copy = getStreakCelebrationCopy(streak);

  return (
    <View style={localStyles.celebrationCard}>
      <Reanimated.View style={[localStyles.celebrationGlow, animatedStyle]} />
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

const ChallengeIntroMetaRow = memo(({ challenge, checkedInTodayCount }: { challenge: ChallengeDetailData; checkedInTodayCount: number }) => (
  <View style={{ gap: 16, paddingVertical: 8 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
      <Icon name="calendar-outline" size={25} color={vibesTheme.colors.accentBlue} />
      <View style={{ flex: 1 }}><Text style={{ color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.semibold, fontSize: 16 }}>{challenge.currentDay > 0 ? `Día ${challenge.currentDay} de ${challenge.totalDays}` : `${challenge.totalDays} días de actividades`}</Text></View>
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
      <Icon name="people-outline" size={25} color={vibesTheme.colors.accentBlue} />
      <View style={{ flex: 1 }}><Text style={{ color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.semibold, fontSize: 16 }}>{challenge.participantsCount} participantes</Text><Text style={{ color: vibesTheme.colors.secondaryText, fontSize: 14 }}>{checkedInTodayCount} {checkedInTodayCount === 1 ? "completó" : "completaron"} hoy</Text></View>
    </View>
  </View>
));

const ChallengeJourneyCard = memo(({ challenge }: { challenge: ChallengeDetailData; percent: number }) => {
  return (<View style={localStyles.journeyCard}>
    <ChallengeJourneyPath totalDays={challenge.totalDays} currentDay={challenge.currentDay} completedDays={challenge.completedDays} />
        <View style={localStyles.journeyStatsRow}>
          <View style={localStyles.journeyStatItem}>
            <Icon name="flame-outline" size={24} color={vibesTheme.colors.accentCoral} />
            <Text style={localStyles.journeyStatText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              Racha actual:{" "}
              <Text style={localStyles.journeyStatValue}>
                {challenge.streak} {challenge.streak === 1 ? "día" : "días"}
              </Text>
            </Text>
          </View>
          <View style={localStyles.journeyStatItem}>
            <Icon name="trophy-outline" size={24} color={vibesTheme.colors.accentMustard} />
            <Text style={localStyles.journeyStatText}>
              Mejor racha:{" "}
              <Text style={localStyles.journeyStatValue}>
                {challenge.bestStreak} {challenge.bestStreak === 1 ? "día" : "días"}
              </Text>
            </Text>
          </View>
        </View>
      </View>
    );
  }
);

type DayState = "completed" | "active" | "future" | "missed";

const getDayState = (
  day: number,
  currentDay: number,
  completedDays: number[]
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

const DayCircle = memo(
  ({ day, state, size = 38, showLabel = true }: DayCircleProps) => {
    const pulse = useSharedValue(1);
    const isActive = state === "active";

    useEffect(() => {
      if (!isActive) return;
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.08, {
            duration: 900,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );
    }, [isActive]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: pulse.value }],
      shadowOpacity: isActive
        ? interpolate(pulse.value, [1, 1.08], [0.2, 0.42])
        : 0,
    }));

    return (
      <Reanimated.View
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
          <Icon
            name="checkmark"
            size={Math.max(14, size * 0.42)}
            color={vibesTheme.colors.primaryText}
          />
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
      </Reanimated.View>
    );
  }
);

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
  }
);

export const PathProgress = memo(
  ({ totalDays, currentDay, completedDays }: AdaptiveProgressProps) => {
    const days = useMemo(
      () => Array.from({ length: totalDays }, (_, index) => index + 1),
      [totalDays]
    );
    const completedCount = completedDays.filter(
      (day) => day >= 1 && day <= totalDays
    ).length;
    const safeCurrentDay = Math.max(Math.min(currentDay, totalDays), 0);
    const remainingCount = Math.max(
      totalDays - completedCount - (safeCurrentDay > 0 ? 1 : 0),
      0
    );

    return (
      <View style={localStyles.progressCard}>
        <View style={localStyles.pathHeader}>
          <View style={localStyles.pathIconWrap}>
            <Icon name="flag-outline" size={26} color={vibesTheme.colors.accentCoral} />
          </View>
          <View style={localStyles.pathHeaderCopy}>
            <Text
              style={localStyles.sectionTitle}
              numberOfLines={2}
              maxFontSizeMultiplier={1}
            >
              Tu progreso
            </Text>
            <Text style={localStyles.pathSubtitle}>
              {totalDays} días para conectar con vos
            </Text>
          </View>
          <View style={localStyles.pathPill}>
            <Icon name="trending-up-outline" size={15} color={vibesTheme.colors.accentCoral} />
            <Text style={localStyles.pathPillText}>Progreso</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={localStyles.pathScrollContent}
        >
          {days.map((day, index) => {
            const state = getDayState(day, currentDay, completedDays);
            return (
              <View key={day} style={localStyles.pathNodeWrap}>
                <DayCircle day={day} state={state} size={38} />
                {index < days.length - 1 ? (
                  <View
                    style={[
                      localStyles.pathConnector,
                      isDayCompleted(day, completedDays) && localStyles.pathConnectorDone,
                      !isDayCompleted(day, completedDays) && day < currentDay && localStyles.pathConnectorMissed,
                    ]}
                  />
                ) : null}
              </View>
            );
          })}
        </ScrollView>

        <View style={localStyles.pathMantraRow}>
          <View style={localStyles.pathMantraIcon}>
            <Icon name="leaf-outline" size={20} color={vibesTheme.colors.secondaryText} />
          </View>
          <Text style={localStyles.pathMantraText}>
            Cada paso te acerca a tu mejor versión.
          </Text>
        </View>

        <View style={localStyles.pathStatsCard}>
          <View style={localStyles.pathStatItem}>
            <View style={localStyles.pathStatTopRow}>
              <View
                style={[
                  localStyles.pathStatDot,
                  localStyles.pathStatDotCompleted,
                ]}
              >
                <Icon name="checkmark" size={16} color={vibesTheme.colors.primaryText} />
              </View>
              <Text style={localStyles.pathStatValue}>{completedCount}</Text>
            </View>
            <Text
              style={localStyles.pathStatLabel}
              numberOfLines={2}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={1}
            >
              Completados
            </Text>
          </View>
          <View style={localStyles.pathStatDivider} />
          <View
            style={[localStyles.pathStatItem, localStyles.pathStatItemIndented]}
          >
            <View style={localStyles.pathStatTopRow}>
              <View
                style={[
                  localStyles.pathStatDot,
                  localStyles.pathStatDotCurrent,
                ]}
              />
              <Text style={localStyles.pathStatValue}>{safeCurrentDay}</Text>
            </View>
            <Text
              style={localStyles.pathStatLabel}
              numberOfLines={2}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={1}
            >
              Actual
            </Text>
          </View>
          <View style={localStyles.pathStatDivider} />
          <View
            style={[localStyles.pathStatItem, localStyles.pathStatItemIndented]}
          >
            <View style={localStyles.pathStatTopRow}>
              <View
                style={[localStyles.pathStatDot, localStyles.pathStatDotFuture]}
              />
              <Text style={localStyles.pathStatValue}>{remainingCount}</Text>
            </View>
            <Text
              style={localStyles.pathStatLabel}
              numberOfLines={2}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={1}
            >
              Por completar
            </Text>
          </View>
        </View>
      </View>
    );
  }
);

export const CompactProgress = memo(
  ({ totalDays, currentDay, completedDays }: AdaptiveProgressProps) => {
    const percent = getCompletionPercent(completedDays, totalDays);
    const progress = useAnimatedProgress(percent);
    const milestones = useMemo(() => {
      const points = [
        1,
        Math.ceil(totalDays * 0.25),
        Math.ceil(totalDays * 0.5),
        Math.ceil(totalDays * 0.75),
        totalDays,
      ];
      return Array.from(new Set(points)).sort((left, right) => left - right);
    }, [totalDays]);
    const fillStyle = useAnimatedStyle(() => ({
      width: `${progress.value * 100}%`,
    }));

    return (
      <View style={localStyles.progressCard}>
        <Text style={localStyles.sectionTitle}>Progreso compacto</Text>
        <View style={localStyles.compactTrack}>
          <Reanimated.View style={[localStyles.compactFill, fillStyle]} />
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
  }
);

export const CalendarProgress = memo(
  ({ totalDays, currentDay, completedDays }: AdaptiveProgressProps) => {
    const days = useMemo(
      () => Array.from({ length: totalDays }, (_, index) => index + 1),
      [totalDays]
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
  }
);

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
          <Reanimated.View style={[localStyles.summaryFill, fillStyle]} />
        </View>
        <Text style={localStyles.summaryCopy}>
          {completedDays.length} de {totalDays} días completados.
        </Text>
      </View>
    );
  }
);

type CheckInButtonProps = {
  status: CheckInStatus;
  isLoading?: boolean;
  onPress: () => void;
};

export const CheckInButton = memo(
  ({ status, isLoading, onPress }: CheckInButtonProps) => {
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
          <VibesLoader />
        ) : (
          <>
            <Icon name={icon} size={21} color={vibesTheme.colors.background} />
            <Text style={[localStyles.checkInText, isCompleted && { color: vibesTheme.colors.surface }]}>{label}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  }
);

type ChatEntryRowProps = {
  onPress: () => void;
};

export const ChatEntryRow = memo(({ onPress }: ChatEntryRowProps) => (
  <TouchableOpacity
    style={localStyles.floatingChatButton}
    accessibilityRole="button"
    accessibilityLabel="Entrar al chat del desafío"
    onPress={onPress}
    activeOpacity={0.9}
  >
    <Icon name="chatbubble-outline" size={28} color={vibesTheme.colors.surface} />
  </TouchableOpacity>
));

const mapEventToChallengeData = (
  event: EventFeedItem | undefined,
  checkins: string[],
  participant: any,
  now = new Date()
): ChallengeDetailData => {
  if (!event) return FALLBACK_CHALLENGE;
  const totalDays = Math.max(Number(event.durationDays ?? 0) || 0, 1);
  const rawDay = getChallengeDay(event.startsAt, now);
  const currentDay = clamp(rawDay, 0, totalDays);
  const completedDays = completedChallengeDays(
    checkins,
    event.startsAt,
    totalDays
  );
  const { streak, bestStreak } = getChallengeStreaks(completedDays, rawDay, totalDays);

  return {
    id: event.id,
    title: event.title || FALLBACK_CHALLENGE.title,
    subtitle:
      event.description || event.subtitle || FALLBACK_CHALLENGE.subtitle,
    date: formatDisplayDate(event.startsAt),
    startsAt: event.startsAt,
    participantsCount: Number.parseInt(event.attendees, 10) || 0,
    totalDays,
    currentDay,
    completedDays,
    streak,
    bestStreak,
    checkInStatus: getStatusFromData(
      currentDay,
      completedDays
    ),
  };
};

const ChallengeDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const routeEvent = route.params?.event as EventFeedItem | undefined;
  const { id: challengeId, inlineEvent } = resolvePublicContentRoute(route.params?.challengeId, routeEvent);
  const {
    data: linkedEvent,
    isPending: linkedEventPending,
    isError: linkedEventError,
    fetchStatus: linkedEventFetchStatus,
    refetch: refetchLinkedEvent,
  } = useQuery({
    queryKey: ["challenge_deep_link", challengeId],
    queryFn: () => fetchEventFeedItemById(challengeId as string, "challenge"),
    enabled: Boolean(challengeId),
    staleTime: 60_000,
  });
  const event = linkedEvent ?? inlineEvent;
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const { data: isRestrictedChallenge = false } = useQuery({
    queryKey: ["challenge_restricted", challengeId, userId ?? null],
    queryFn: () => fetchIsRestrictedChallenge(challengeId as string),
    enabled: Boolean(challengeId) && !event && !linkedEventPending,
    staleTime: 60_000,
  });
  const handleBack = usePublicContentBack(Boolean(userId));
  const { data: participant } = useChallengeParticipantQuery(event?.id, userId);
  const joinChallengeMutation = useJoinChallengeMutation();
  const leaveChallengeMutation = useLeaveChallengeMutation();
  const deleteChallengeMutation = useDeleteChallengeMutation();
  const requestChallengeJoinMutation = useRequestChallengeJoinMutation();
  const approveJoinRequestMutation = useApproveChallengeJoinRequestMutation();
  const { data: ownJoinRequest } = useChallengeJoinRequestQuery(
    event?.id,
    userId
  );
  const { data: challengeJoinRequests = [] } = useChallengeJoinRequestsQuery(
    userId ? event?.id : undefined
  );
  const { data: remoteCheckins = [] } = useChallengeCheckinsQuery(
    event?.id,
    userId
  );
  const { data: remoteCheckedInTodayCount = 0 } =
    useChallengeTodayCheckinsCountQuery(userId ? event?.id : undefined);
  const checkInMutation = useCheckInChallengeMutation();
  const [localCompletedDays, setLocalCompletedDays] = useState<number[]>([]);
  const localDay = useLocalDay();
  useEffect(() => { setLocalCompletedDays([]); }, [challengeId, userId, localDay]);
  const [footerSliderWidth, setFooterSliderWidth] = useState(0);
  const [footerSliderOffset, setFooterSliderOffset] = useState(0);
  const [finalCelebration, setFinalCelebration] = useState(false);
  const reducedMotion = useReducedMotion();
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationTitle, setCelebrationTitle] = useState("Día completado");
  const [celebrationBody, setCelebrationBody] = useState(
    "Gracias por elegirte hoy"
  );
  const [isSharing, setIsSharing] = useState(false);
  const [isPreparingShare, setIsPreparingShare] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [descriptionVisible, setDescriptionVisible] = useState(false);
  const [descriptionOverflow, setDescriptionOverflow] = useState(false);
  const [restartConfirmVisible, setRestartConfirmVisible] = useState(false);
  const { t } = useI18n();
  const receivedInvitationsQuery = useReceivedChallengeInvitationsQuery(userId);
  const [participantsVisible, setParticipantsVisible] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  useEffect(() => { setInviteVisible(false); }, [event?.id, userId]);
  const pendingParticipants = useRef(false);
  const pendingShare = useRef(false);
  const pendingCompletionShare = useRef(false);
  const completionCardRef = useRef<View>(null);
  const completionImageUri = useRef<string | null>(null);
  const [completionImageReady, setCompletionImageReady] = useState(false);
  const [completionImageFailed, setCompletionImageFailed] = useState(false);
  const [completionImageAttempt, setCompletionImageAttempt] = useState(0);
  const [completionShareVisible, setCompletionShareVisible] = useState(false);
  const completionShareTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (completionShareTimer.current) clearTimeout(completionShareTimer.current);
    if (completionImageUri.current) releaseCapture(completionImageUri.current);
  }, []);
  const participantsQuery = useChallengeParticipantsQuery(
    userId ? event?.id : undefined,
  );

  const baseChallenge = useMemo(
    () => mapEventToChallengeData(event, remoteCheckins, participant),
    [event, participant, remoteCheckins, localDay]
  );
  const completedDays = useMemo(
    () =>
      Array.from(
        new Set([...baseChallenge.completedDays, ...localCompletedDays])
      )
        .filter((day) => day >= 1 && day <= baseChallenge.totalDays)
        .sort((left, right) => left - right),
    [baseChallenge.completedDays, baseChallenge.totalDays, localCompletedDays]
  );
  const status =
    getStatusFromData(
      baseChallenge.currentDay,
      completedDays
    );
  const challenge: ChallengeDetailData = {
    ...baseChallenge,
    participantsCount:
      participantsQuery.data?.length ??
      event?.participantCount ??
      (Number.parseInt(event?.attendees ?? "", 10) || 0),
    completedDays,
    checkInStatus: status,
    ...getChallengeStreaks(completedDays, getChallengeDay(event?.startsAt), baseChallenge.totalDays),
  };
  useEffect(() => {
    setDescriptionOverflow(false);
    setDescriptionVisible(false);
  }, [challenge.subtitle]);
  const isAdmin = Boolean(
    userId && event?.createdBy && userId === event.createdBy
  );
  const isJoined = Boolean(participant);
  const receivedInvitation = receivedInvitationsQuery.data?.find(
    (invitation) => invitation.challengeId === event?.id && invitation.status !== "accepted",
  );
  const legacyPreset = getChallengeMediaPreset(
    event?.imagePresetId ?? parseChallengeMediaPreset(event?.imageUrl)
  );
  const coverImageSource =
    typeof event?.imageUrl === "string" && event.imageUrl.trim()
      ? { uri: event.imageUrl.trim() }
      : typeof event?.image === "string" && event.image.trim()
      ? { uri: event.image.trim() }
      : event?.image ??
        legacyPreset?.image ??
        getChallengeMediaPreset("challenge")?.image ??
        null;
  const collapsedCoverImageSource =
    typeof coverImageSource === "string"
      ? { uri: coverImageSource }
      : coverImageSource;
  const pendingJoinRequests = challengeJoinRequests.filter(
    (request) => request.status === "pending"
  );
  const percent = getCompletionPercent(
    challenge.completedDays,
    challenge.totalDays
  );
  const daysLeft = getDaysLeft(challenge.totalDays, challenge.completedDays);
  const challengeTimeline = getChallengeTimeline(
    challenge.startsAt,
    challenge.totalDays
  );
  const isChallengeUpcoming = challengeTimeline.status === "upcoming";
  // Curated "Por Vibes" challenges can be restarted at any time (catalog).
  const canRestart = Boolean(userId && event && (challengeTimeline.status === "finished" || isCuratedChallenge(event)));
  const todayKey = localDay;
  const hasRemoteTodayCheckin =
    participant?.checkedInToday || remoteCheckins.includes(todayKey);
  const checkedInTodayCount = isChallengeUpcoming
    ? 0
    : remoteCheckedInTodayCount +
      (challenge.checkInStatus === "completed" && !hasRemoteTodayCheckin
        ? 1
        : 0);
  const contentMaxWidth = width >= 700 ? 620 : undefined;
  const isChallengeCompleted =
    challenge.checkInStatus === "completed" &&
    (challenge.currentDay >= challenge.totalDays ||
      challenge.completedDays.length >= challenge.totalDays);
  const footerSliderMaxOffset = Math.max(
    footerSliderWidth -
      FOOTER_SLIDER_HANDLE_SIZE -
      FOOTER_SLIDER_HORIZONTAL_PADDING * 2,
    0
  );
  const footerSliderFillWidth = Math.min(
    footerSliderOffset + FOOTER_SLIDER_TRACK_HEIGHT,
    Math.max(footerSliderWidth - FOOTER_SLIDER_FILL_LEFT, 0)
  );
  const celebrationProgress = useSharedValue(0);

  const resetFooterSlider = () => {
    setFooterSliderOffset(0);
  };

  const handleCheckIn = async () => {
    if (challenge.checkInStatus === "completed" || challenge.currentDay <= 0)
      return;

    if (event?.id && userId) {
      await checkInMutation.mutateAsync({
        challengeId: event.id,
        userId,
      });
    }

    const nextCompletedDays = Array.from(
      new Set([...completedDays, challenge.currentDay])
    );
    const reachedFinalCheckIn =
      challenge.currentDay >= challenge.totalDays ||
      nextCompletedDays.length >= challenge.totalDays;
    playAnimation(reachedFinalCheckIn ? "challenge_complete" : "encouraging");
    setLocalCompletedDays(nextCompletedDays);
    setFooterSliderOffset(footerSliderMaxOffset);
    setCelebrationTitle(
      reachedFinalCheckIn ? "Desafío completado" : "Día completado"
    );
    setCelebrationBody(
      reachedFinalCheckIn
        ? "Sostuviste el proceso hasta el final. Tu energía cambió."
        : "Gracias por volver a vos y sostener tu ritmo hoy."
    );
    setFinalCelebration(reachedFinalCheckIn);
    setCelebrationVisible(true);
    if (reachedFinalCheckIn) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Wait until the final celebration and confetti have finished.
      if (completionShareTimer.current) clearTimeout(completionShareTimer.current);
      completionShareTimer.current = setTimeout(() => {
        completionShareTimer.current = null;
        setCompletionImageReady(false);
        setCompletionImageFailed(false);
        setCompletionShareVisible(true);
      }, 3400);
    }
    triggerHaptic();
  };

  const handleShare = async () => {
    if (!event) return;

    setIsSharing(true);
    try {
      if (isJoined) {
        await shareChallengeProgress(event, {
          currentDay: challenge.currentDay,
          totalDays: challenge.totalDays,
          streak: challenge.streak,
        });
        return;
      }

      await shareChallengeInvite(event);
    } catch {
      Alert.alert("Compartir", "No pudimos compartir este desafío.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleCompletionShare = async () => {
    if (!event || isSharing || pendingCompletionShare.current || !completionImageReady) return;
    pendingCompletionShare.current = true;
    setIsSharing(true);
    try {
      completionImageUri.current = await captureRef(completionCardRef, {
        format: "png", result: "tmpfile", width: 1080, height: 1350,
      });
      setCompletionShareVisible(false);
    } catch {
      pendingCompletionShare.current = false;
      setIsSharing(false);
      Alert.alert(t("challengeShare.share"), t("challengeShare.error"));
    }
  };

  const handleCompletionShareClosed = async () => {
    if (!pendingCompletionShare.current) return;
    pendingCompletionShare.current = false;
    const imageUri = completionImageUri.current;
    completionImageUri.current = null;
    try {
      if (!event || !imageUri) return;
      await shareChallengeCompletion(
        event,
        t("challengeShare.message", { title: event.title ?? challenge.title }),
        imageUri,
      );
    } catch {
      Alert.alert(t("challengeShare.share"), t("challengeShare.error"));
    } finally {
      if (imageUri) releaseCapture(imageUri);
      setIsSharing(false);
    }
  };

  const handleDirectShare = () => {
    if (pendingShare.current || isPreparingShare || isSharing) return;
    setIsPreparingShare(true);
    setTimeout(() => {
      setIsPreparingShare(false);
      void handleShare();
    }, 100);
  };

  const handleLeaveChallenge = () => {
    if (!event?.id || !userId) return;

    setMenuVisible(false);
    Alert.alert(
      "Abandonar desafío",
      "¿Seguro que querés abandonar este desafío? Vas a dejar de participar y perder tu progreso asociado.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Abandonar",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveChallengeMutation.mutateAsync({
                challengeId: event.id,
                userId,
              });
              handleBack();
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.message ?? "No se pudo abandonar el desafío."
              );
            }
          },
        },
      ]
    );
  };

  const handleDeleteChallenge = () => {
    if (!event?.id || !isAdmin) return;

    setMenuVisible(false);
    Alert.alert(
      "Eliminar desafío",
      "¿Eliminar este desafío para todos? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteChallengeMutation.mutateAsync({
                challengeId: event.id,
              });
              handleBack();
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.message ?? "No se pudo eliminar el desafío."
              );
            }
          },
        },
      ]
    );
  };

  const handleJoinOrRequest = async () => {
    if (!event?.id) return;
    if (!userId) {
      promptForPublicContentAuth(navigation as any, "desafío");
      return;
    }

    if ((event.visibility ?? "public") === "public") {
      await joinChallengeMutation.mutateAsync({
        challengeId: event.id,
        userId,
      });
      playAnimation("challenge_active");
      return;
    }

    await requestChallengeJoinMutation.mutateAsync({
      challengeId: event.id,
      userId,
    });
    playAnimation("challenge_invite");
  };

  const handleApproveJoinRequest = async (
    requestId: string,
    requesterId: string
  ) => {
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
    }, finalCelebration ? 3000 : 2200);

    return () => clearTimeout(hideTimer);
  }, [celebrationProgress, celebrationVisible, finalCelebration]);

  const celebrationAnimatedStyle = useAnimatedStyle(() => ({
    opacity: celebrationProgress.value,
    transform: [
      {
        translateY: reducedMotion ? 0 : interpolate(celebrationProgress.value, [0, 1], [finalCelebration ? 70 : 20, 0]),
      },
      {
        scale: reducedMotion ? 1 : finalCelebration
          ? interpolate(celebrationProgress.value, [0, 0.7, 1], [0.65, 1.08, 1])
          : interpolate(celebrationProgress.value, [0, 1], [0.96, 1]),
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
    [
      challenge.checkInStatus,
      checkInMutation.isPending,
      footerSliderMaxOffset,
    ]
  );
  const renderFooterCheckIn = () => {
    if (isChallengeUpcoming) {
      return (
        <View style={[localStyles.chatLockedRow, localStyles.upcomingChallengeNotice]}>
          <Icon name="time-outline" size={18} color={palette.goldDeep} />
          <Text style={localStyles.chatLockedText}>
            {getChallengeStartsInLabel(challengeTimeline.startsInDays)}. El
            check-in se habilita cuando empiece el desafío.
          </Text>
        </View>
      );
    }

    if (challenge.checkInStatus === "completed") {
      return (
        <View
          style={[
            localStyles.footerSliderTrack,
            localStyles.footerSliderTrackCompleted,
          ]}
        >
          <View
            style={[
              localStyles.footerSliderHandle,
              localStyles.footerSliderHandleCompleted,
            ]}
          >
            <Icon name="checkmark" size={22} color={vibesTheme.colors.primaryText} />
          </View>
          <View style={localStyles.footerSliderCopy}>
            <Text style={localStyles.footerSliderTitle}>
              {isChallengeCompleted ? "Desafío completado" : "Día completado"}
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
          <View pointerEvents="none" style={localStyles.footerSliderTint} />
          <View
            style={[
              localStyles.footerSliderFill,
              { width: footerSliderFillWidth || FOOTER_SLIDER_TRACK_HEIGHT },
            ]}
            pointerEvents="none"
          />
          <View style={localStyles.footerSliderChevrons} pointerEvents="none">
            <Icon name="chevron-forward" size={19} color={vibesTheme.colors.accentBlue} />
            <Icon name="chevron-forward" size={19} color={vibesTheme.colors.accentBlue} />
          </View>
          <View style={localStyles.footerSliderCopy}>
            <Text style={[localStyles.footerSliderTitle, { textAlign: "center", fontSize: 14 }]}>
              {checkInMutation.isPending ? "Guardando…" : "Deslizá para completar tu día"}
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
            <VibesLoader />
          ) : (
            <Icon name="arrow-forward" size={27} color={vibesTheme.colors.surface} />
          )}
        </View>
      </View>
    );
  };

  if (!event && challengeId && linkedEventPending) {
    return (
      <DeepLinkLoadingState
        target="challenge"
        offline={linkedEventFetchStatus === "paused"}
        onRetry={() => void refetchLinkedEvent()}
        onExit={handleBack}
      />
    );
  }

  if (!event && challengeId && isRestrictedChallenge) {
    return (
      <ScreenContainer style={localStyles.loadingScreen}>
        <Icon name="lock-closed-outline" size={30} color={palette.gold} />
        <Text style={localStyles.loadingTitle}>Este desafío es privado</Text>
        <Text style={localStyles.privateBody}>
          {userId
            ? "No tenés acceso a este desafío. Si te suman o te aceptan, lo vas a poder ver."
            : "Si iniciás sesión y tenés acceso, lo vas a poder ver."}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={localStyles.loadingBackButton}
          onPress={() => handleBack()}
          activeOpacity={0.85}
        >
          <Text style={localStyles.loadingBackText}>Volver</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  if (!event && challengeId && linkedEventError) {
    return (
      <DeepLinkLoadingState
        target="challenge"
        state="error"
        onRetry={() => void refetchLinkedEvent()}
        onExit={handleBack}
      />
    );
  }

  if (!event && challengeId) {
    return (
      <ScreenContainer style={localStyles.loadingScreen}>
        <Text style={localStyles.loadingTitle}>
          No encontramos este desafío
        </Text>
        <TouchableOpacity
          style={localStyles.loadingBackButton}
          onPress={() => handleBack()}
          activeOpacity={0.85}
        >
          <Text style={localStyles.loadingBackText}>Volver</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={localStyles.screen} edges={["left", "right"]}>
      <View style={{ paddingTop: insets.top, backgroundColor: vibesTheme.colors.surface }}>
        <AppHeader title="Desafío" showBack onBack={handleBack}
          titleStyle={{ fontSize: 18, fontFamily: vibesTheme.fonts.semibold }}
          right={<View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Compartir desafío" onPress={handleDirectShare} disabled={isPreparingShare || isSharing} style={localStyles.referenceAction}>
              {isPreparingShare ? <VibesLoader /> : <Icon name="share-outline" size={25} color={vibesTheme.colors.primaryText} />}
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Opciones del desafío" onPress={() => setMenuVisible(true)} style={localStyles.referenceAction}><Icon name="ellipsis-horizontal" size={22} color={vibesTheme.colors.primaryText} /></TouchableOpacity>
          </View>} />
      </View>

      <NativeAnimated.ScrollView
        contentContainerStyle={[
          localStyles.scrollContent,
          {
            paddingBottom: insets.bottom + 188,
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}

      >
        {coverImageSource ? <MediaImage source={coverImageSource} resizeMode="cover" style={localStyles.referenceCover} /> : null}
        <View
          style={[
            localStyles.contentShell,
            {
              maxWidth: contentMaxWidth,
              alignSelf: "center",
              width: "100%",
            },
          ]}
        >
          <View style={localStyles.referenceBadges}>
            <Text style={localStyles.referenceBadge}>{challenge.totalDays} días</Text>
            {isChallengeUpcoming ? <Text style={localStyles.referenceBadge}>{getChallengeStartsInLabel(challengeTimeline.startsInDays)}</Text> : null}
          </View>
          <Text style={localStyles.referenceTitle}>{challenge.title}</Text>
          <View style={localStyles.challengeIntroBlock}>
            <ChallengeIntroMetaRow challenge={challenge} checkedInTodayCount={checkedInTodayCount} />
          </View>
          <View style={localStyles.content}>
            {challenge.subtitle ? <View style={localStyles.descriptionSection}>
              <Text style={localStyles.descriptionHeading}>Sobre el desafío</Text>
              <View style={descriptionOverflow ? localStyles.descriptionPreviewRow : undefined}>
                <Text
                  selectable
                  style={[localStyles.fullDescription, descriptionOverflow && localStyles.descriptionPreviewText]}
                  numberOfLines={descriptionOverflow ? 3 : undefined}
                  onTextLayout={(layoutEvent) => {
                    if (layoutEvent.nativeEvent.lines.length > 3) setDescriptionOverflow(true);
                  }}
                >
                  {challenge.subtitle}
                </Text>
                {descriptionOverflow ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Ver descripción completa"
                    activeOpacity={0.72}
                    onPress={() => setDescriptionVisible(true)}
                    style={localStyles.descriptionMoreButton}
                  >
                    <Text style={localStyles.descriptionMoreText}>Ver más</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View> : null}
            {event?.id && (!event.visibility || event.visibility === "public") ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Invitar personas al desafío" onPress={() => { if (!userId) { navigation.navigate("Login" as never); return; } setInviteVisible(true); }} style={localStyles.inviteAction}>
              <Icon name="person-add-outline" size={22} color={vibesTheme.colors.primaryText} />
              <Text style={{ color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.medium, fontSize: 16 }}>Invitar a alguien</Text>
            </TouchableOpacity> : null}
            <ChallengeJourneyCard challenge={challenge} percent={percent} />
            {event?.id && (isJoined || isAdmin) ? (
              <ChallengeDaysSection
                challengeId={event.id}
                totalDays={challenge.totalDays}
                currentDay={challenge.currentDay}
                isCreator={false}
                isJoined
                mode="completion"
              />
            ) : null}
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
                        fallbackBackgroundColor={"rgba(216, 140, 122, 0.25)"}
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
                        void handleApproveJoinRequest(
                          request.id,
                          request.requesterId
                        );
                      }}
                    >
                      <Text style={localStyles.requestApproveText}>
                        Aprobar
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}
            {challenge.streak >= 3 ? (
              <StreakCelebrationCard streak={challenge.streak} />
            ) : null}
            {isAdmin && event?.id && event.visibility === "private" ? (
              <ChallengeInviteesSection challengeId={event.id} />
            ) : null}
          </View>
        </View>
      </NativeAnimated.ScrollView>

      {event?.id && userId && (!event.visibility || event.visibility === "public") ? <EventInviteSheet event={event} visible={inviteVisible} onClose={() => setInviteVisible(false)} onDiscover={() => navigation.navigate("Tab" as never, { screen: "Discover" } as never)} /> : null}

      <View
        style={[
          localStyles.stickyFooter,
          {
            bottom: Math.max(insets.bottom + 4, 10),
            maxWidth: contentMaxWidth,
            alignSelf: "center",
          },
        ]}
      >
        <View style={localStyles.stickyFooterCard}>
          {isJoined ? (
            <>
              <ChatEntryRow
                onPress={() =>
                  event
                    ? navigation.navigate(
                        "EventChat" as never,
                        { event } as never
                      )
                    : undefined
                }
              />
              {renderFooterCheckIn()}
            </>
          ) : receivedInvitation && userId ? (
            <ChallengeInvitationActions invitation={receivedInvitation} userId={userId} />
          ) : isAdmin ? (
            <>
              <TouchableOpacity
                style={localStyles.joinRequestButton}
                disabled={joinChallengeMutation.isPending}
                onPress={() => {
                  if (!event?.id || !userId) return;
                  void handleJoinOrRequest();
                }}
              >
                {joinChallengeMutation.isPending ? (
                  <VibesLoader />
                ) : (
                  <>
                    <Text style={localStyles.joinRequestButtonTitle}>
                      Sumarme al desafío
                    </Text>
                    <Text style={localStyles.joinRequestButtonSubtitle}>
                      Activá tu propio espacio y entrá al chat del desafío
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
                {joinChallengeMutation.isPending ||
                requestChallengeJoinMutation.isPending ? (
                  <VibesLoader />
                ) : (
                  <>
                    <Text style={localStyles.joinRequestButtonTitle}>
                      {(event?.visibility ?? "public") === "public"
                        ? userId
                          ? "Sumarme al desafío"
                          : "Registrarme para sumarme"
                        : ownJoinRequest?.status === "pending"
                        ? "Solicitud enviada"
                        : userId
                          ? "Solicitar acceso"
                          : "Registrarme para solicitar acceso"}
                    </Text>
                    {(event?.visibility ?? "public") !== "public" ? (
                      <Text style={localStyles.joinRequestButtonSubtitle}>
                        El creador lo puede aprobar cuando quiera
                      </Text>
                    ) : null}
                  </>
                )}
              </TouchableOpacity>

            </>
          )}
        </View>
      </View>

      {celebrationVisible && finalCelebration ? <ChallengeCompletionConfetti /> : null}

      {celebrationVisible ? (
        <Reanimated.View
          pointerEvents="none"
          style={[
            localStyles.completionCelebration,
            { top: Math.max(insets.top + 110, 148) },
            celebrationAnimatedStyle,
          ]}
        >
          <View style={[localStyles.completionCelebrationBadge, finalCelebration && { width: 64, height: 64, borderRadius: 32 }]}>
            <Icon
              name={
                finalCelebration ? "trophy-outline" : "sparkles-outline"
              }
              size={finalCelebration ? 30 : 20}
              color={vibesTheme.colors.primaryText}
            />
          </View>
          <Text style={localStyles.completionCelebrationTitle}>
            {celebrationTitle}
          </Text>
          <Text style={localStyles.completionCelebrationBody}>
            {celebrationBody}
          </Text>
        </Reanimated.View>
      ) : null}

      <AnimatedSheetModal
        visible={completionShareVisible}
        onClose={() => { if (!isSharing) setCompletionShareVisible(false); }}
        closeOnBackdropPress={!isSharing}
        onClosed={() => void handleCompletionShareClosed()}
        sheetStyle={localStyles.menuSheet}
      >
        <View style={localStyles.menuHandle} />
        <View style={localStyles.completionShareBadge}>
          <Icon name="trophy-outline" size={26} color={vibesTheme.colors.background} />
        </View>
        <Text style={localStyles.completionShareTitle}>{t("challengeShare.title")}</Text>
        <Text style={localStyles.completionShareBody}>{t("challengeShare.body")}</Text>
        <ScrollView style={{ maxHeight: height * 0.42 }} contentContainerStyle={{ alignItems: "center", paddingVertical: 8 }}>
          {completionShareVisible ? (
            <ChallengeCompletionShareCard
              key={`${event?.id}-${completionImageAttempt}`}
              ref={completionCardRef}
              title={event?.title ?? challenge.title}
              source={collapsedCoverImageSource ?? require("../assets/images/challenges/challengetree.png")}
              label={t("challengeShare.cardLabel")}
              headline={t("challengeShare.cardHeadline")}
              caption={t("challengeShare.cardCaption")}
              onLoading={() => setCompletionImageReady(false)}
              onReady={() => setCompletionImageReady(true)}
              onError={() => setCompletionImageFailed(true)}
            />
          ) : null}
        </ScrollView>
        {completionImageFailed ? (
          <TouchableOpacity accessibilityRole="button" onPress={() => {
            setCompletionImageFailed(false);
            setCompletionImageReady(false);
            setCompletionImageAttempt(value => value + 1);
          }} style={localStyles.completionShareSecondary}>
            <Text style={localStyles.completionShareSecondaryText}>{t("challengeShare.retryImage")}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          accessibilityRole="button"
          style={localStyles.completionSharePrimary}
          onPress={() => void handleCompletionShare()}
          disabled={isSharing || !completionImageReady}
          accessibilityState={{ disabled: isSharing || !completionImageReady, busy: isSharing }}
        >
          <Icon name="share-outline" size={20} color={vibesTheme.colors.background} />
          <Text style={localStyles.completionSharePrimaryText}>{isSharing || (!completionImageReady && !completionImageFailed) ? t("challengeShare.preparingImage") : t("challengeShare.share")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={localStyles.completionShareSecondary}
          disabled={isSharing}
          onPress={() => setCompletionShareVisible(false)}
        >
          <Text style={localStyles.completionShareSecondaryText}>{t("challengeShare.notNow")}</Text>
        </TouchableOpacity>
      </AnimatedSheetModal>

      <AnimatedSheetModal
        visible={descriptionVisible}
        onClose={() => setDescriptionVisible(false)}
        sheetStyle={localStyles.descriptionSheet}
      >
        <View style={localStyles.menuHandle} />
        <Text style={localStyles.descriptionSheetTitle}>Sobre el desafío</Text>
        <ScrollView
          style={localStyles.descriptionSheetScroll}
          contentContainerStyle={localStyles.descriptionSheetContent}
          showsVerticalScrollIndicator={false}
        >
          <Text selectable style={localStyles.fullDescription}>
            {challenge.subtitle}
          </Text>
        </ScrollView>
      </AnimatedSheetModal>

      <AnimatedSheetModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onClosed={() => {
          if (pendingParticipants.current) {
            pendingParticipants.current = false;
            setParticipantsVisible(true);
          }
          if (pendingShare.current) {
            pendingShare.current = false;
            setTimeout(() => {
              setIsPreparingShare(false);
              void handleShare();
            }, 100);
          }
        }}
        offsetY={260}
        sheetStyle={localStyles.menuSheet}
      >
        <View style={localStyles.menuHandle} />
        <Text style={localStyles.menuTitle}>Opciones del desafío</Text>
        {isAdmin && event ? (
          <TouchableOpacity style={localStyles.menuItem} onPress={() => {
            setMenuVisible(false);
            navigation.dispatch(StackActions.push("CreateChallenge", { event }));
          }}>
            <Icon name="create-outline" size={20} color={palette.text} />
            <Text style={localStyles.menuItemText}>Editar desafío</Text>
          </TouchableOpacity>
        ) : null}
        {canRestart ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={localStyles.menuItem}
            onPress={() => {
              setMenuVisible(false);
              setTimeout(() => setRestartConfirmVisible(true), 320);
            }}
          >
            <Icon name="refresh-outline" size={20} color={palette.text} />
            <Text style={localStyles.menuItemText}>{t("challengeRestart.restart")}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={localStyles.menuItem}
          onPress={() => {
            pendingParticipants.current = true;
            setMenuVisible(false);
          }}
        >
          <Icon name="people-outline" size={20} color={palette.text} />
          <Text style={localStyles.menuItemText}>
            Participantes (
            {challenge.participantsCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={localStyles.menuItem}
          onPress={() => {
            if (pendingShare.current || isPreparingShare || isSharing) return;
            pendingShare.current = true;
            setIsPreparingShare(true);
            setMenuVisible(false);
          }}
          disabled={isPreparingShare || isSharing}
        >
          {isPreparingShare ? (
            <VibesLoader />
          ) : (
            <Icon name="share-social-outline" size={20} color={palette.text} />
          )}
          <Text style={localStyles.menuItemText}>
            {isPreparingShare
              ? "Preparando..."
              : isSharing
                ? "Compartiendo..."
                : "Compartir desafío"}
          </Text>
        </TouchableOpacity>
        {isAdmin ? (
          <TouchableOpacity
            style={[localStyles.menuItem, localStyles.menuItemDanger]}
            onPress={handleDeleteChallenge}
            disabled={deleteChallengeMutation.isPending}
          >
            <Icon name="trash-outline" size={20} color={palette.red} />
            <Text
              style={[localStyles.menuItemText, localStyles.menuItemTextDanger]}
            >
              {deleteChallengeMutation.isPending
                ? "Eliminando..."
                : "Eliminar desafío"}
            </Text>
          </TouchableOpacity>
        ) : null}
        {isJoined ? (
          <TouchableOpacity
            style={[localStyles.menuItem, localStyles.menuItemDanger]}
            onPress={handleLeaveChallenge}
            disabled={leaveChallengeMutation.isPending}
          >
            <Icon name="exit-outline" size={20} color={palette.red} />
            <Text
              style={[localStyles.menuItemText, localStyles.menuItemTextDanger]}
            >
              {leaveChallengeMutation.isPending
                ? "Abandonando..."
                : "Abandonar desafío"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </AnimatedSheetModal>
      <RestartChallengeConfirmSheet
        visible={restartConfirmVisible}
        onClose={() => setRestartConfirmVisible(false)}
        onConfirm={() => {
          setRestartConfirmVisible(false);
          if (event) navigation.navigate("RestartChallenge" as never, { source: event } as never);
        }}
      />
      <ParticipantsSheet
        visible={participantsVisible}
        onClose={() => setParticipantsVisible(false)}
        participants={participantsQuery.data ?? []}
        userId={userId}
        loading={participantsQuery.isLoading}
        error={participantsQuery.isError}
        retry={() => void participantsQuery.refetch()}
      />
      {isPreparingShare ? (
        <View
          style={localStyles.sharePreparingOverlay}
          accessibilityRole="progressbar"
          accessibilityLabel="Preparando opciones para compartir"
        >
          <View style={localStyles.sharePreparingCard}>
            <VibesLoader />
            <Text style={localStyles.sharePreparingText}>
              Preparando para compartir…
            </Text>
          </View>
        </View>
      ) : null}
    </ScreenContainer>
  );
};

const localStyles = StyleSheet.create({
  inviteAction: { minHeight: 50, marginBottom: 18, flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: `${vibesTheme.colors.secondaryText}0C` },
  referenceAction: { width: 40, height: 44, justifyContent: "center", alignItems: "center" },
  referenceCover: { width: "auto", height: 190, marginHorizontal: 18, marginTop: 6, marginBottom: 16, borderRadius: 16, backgroundColor: `${vibesTheme.colors.secondaryText}0C` },
  referenceBadges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  referenceBadge: { overflow: "hidden", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 5, color: vibesTheme.colors.accentBlue, backgroundColor: `${vibesTheme.colors.accentBlue}14`, fontSize: 13, fontFamily: vibesTheme.fonts.medium },
  referenceTitle: { fontSize: 32, lineHeight: 39, color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.extraBold, marginBottom: 12 },

  descriptionSection: { paddingVertical: 20, gap: 10 },
  descriptionHeading: { color: vibesTheme.colors.primaryText, fontFamily: vibesTheme.fonts.bold, fontSize: 20 },
  fullDescription: { color: vibesTheme.colors.secondaryText, fontFamily: vibesTheme.fonts.regular, fontSize: 17, lineHeight: 26 },
  descriptionPreviewRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  descriptionPreviewText: {
    flex: 1,
  },
  descriptionMoreButton: {
    paddingVertical: 2,
  },
  descriptionMoreText: {
    color: vibesTheme.colors.accentBlue,
    fontFamily: vibesTheme.fonts.semibold,
    fontSize: 16,
    lineHeight: 26,
    textDecorationLine: "underline",
  },
  descriptionSheet: {
    backgroundColor: vibesTheme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 28,
  },
  descriptionSheetTitle: {
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.semibold,
    fontSize: 24,
    lineHeight: 30,
    marginBottom: 14,
  },
  descriptionSheetScroll: {
    maxHeight: 420,
  },
  descriptionSheetContent: {
    paddingBottom: 12,
  },
  screen: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    backgroundColor: palette.bg,
    paddingHorizontal: 24,
  },
  loadingTitle: {
    color: palette.text,
    fontSize: 22,
    lineHeight: 27,
    textAlign: "center",
    fontFamily: vibesTheme.fonts.medium,
  },
  privateBody: {
    color: vibesTheme.colors.muted,
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    fontFamily: vibesTheme.fonts.regular,
    maxWidth: 320,
  },
  loadingBackButton: {
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: palette.gold,
  },
  loadingBackText: {
    color: vibesTheme.colors.surface,
    fontSize: 16,
    fontFamily: vibesTheme.fonts.bold,
  },
  scrollContent: {
    paddingBottom: 188,
  },
  contentShell: {
    marginTop: 2,
    paddingHorizontal: 20,
    zIndex: 2,
  },
  challengeIntroBlock: {
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 14,
  },
  challengeTypePill: {
    alignSelf: "flex-start",
  },
  challengeTypePillText: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontFamily: vibesTheme.fonts.bold,
  },
  challengeIntroTitle: {
    marginTop: 10,
    color: palette.text,
    fontSize: 34,
    lineHeight: 39,
    fontFamily: vibesTheme.fonts.medium,
  },
  challengeIntroMetaRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  challengeIntroMetaItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  challengeIntroMetaText: {
    flex: 1,
    color: palette.text,
    fontSize: 19,
    lineHeight: 24,
    fontFamily: vibesTheme.fonts.medium,
  },
  challengeParticipantText: {
    color: palette.text,
    fontSize: 19,
    lineHeight: 24,
    fontFamily: vibesTheme.fonts.medium,
  },
  challengeTodayText: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
  },
  challengeIntroDivider: {
    width: 1,
    height: 42,
    backgroundColor: "rgba(43, 43, 43, 0.12)",
  },
  heroInfoStack: {
    marginBottom: 16,
  },
  content: {
    paddingTop: 0,
    gap: 16,
  },
  stickyFooter: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 40,
    elevation: 16,
  },
  stickyFooterCard: {
    backgroundColor: "transparent",
    gap: 10,
  },
  expandedChallengeHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 63,
    elevation: 21,
    paddingLeft: 20,
    paddingRight: 20,
    flexDirection: "column",
    alignItems: "stretch",
    gap: 14,
  },
  expandedChallengeHeaderTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  expandedChallengeHeaderSpacer: {
    flex: 1,
  },
  expandedChallengeHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  expandedChallengeHeaderIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(43, 43, 43, 0.24)",
    borderWidth: 1,
    borderColor: "rgba(254, 254, 253, 0.28)",
  },
  expandedChallengeHeaderCopy: {
    width: "100%",
    paddingHorizontal: 10,
  },
  expandedChallengeHeaderTitle: {
    color: WHITE,
    fontSize: 28,
    lineHeight: 33,
    textAlign: "left",
    fontFamily: vibesTheme.fonts.bold,
    textShadowColor: "rgba(43, 43, 43, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  expandedChallengeHeaderSubtitle: {
    marginTop: 10,
    color: "rgba(254, 254, 253, 0.9)",
    fontSize: 17,
    lineHeight: 21,
    fontFamily: vibesTheme.fonts.medium,
    textShadowColor: "rgba(43, 43, 43, 0.42)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  collapsedChallengeHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    minHeight: 84,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(43, 43, 43, 0.08)",
    shadowColor: palette.text,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    zIndex: 61,
    elevation: 19,
  },
  collapsedChallengeHeaderBackButton: {
    width: 48,
    height: 48,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(254, 254, 253, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.06)",
  },
  collapsedChallengeHeaderThumbnail: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(244, 163, 64, 0.32)",
  },
  collapsedChallengeHeaderTitle: {
    flex: 1,
    color: palette.text,
    fontSize: 21,
    lineHeight: 24,
    textAlign: "left",
    fontFamily: vibesTheme.fonts.medium,
  },
  headerIconPlaceholder: {
    width: 40,
    height: 40,
  },
  joinRequestButton: {
    borderRadius: 20,
    backgroundColor: vibesTheme.colors.primaryText,
    borderWidth: 2,
    borderColor: "rgba(254, 254, 253, 0.18)",
    paddingHorizontal: 18,
    paddingVertical: 10,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.accentBlueDeep,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  joinRequestButtonDisabled: {
    opacity: 0.6,
  },
  joinRequestButtonTitle: {
    color: vibesTheme.colors.background,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.bold,
  },
  joinRequestButtonSubtitle: {
    marginTop: 4,
    color: vibesTheme.colors.surface,
    fontSize: 13,
    lineHeight: 16,
    fontFamily: vibesTheme.fonts.subtitle,
  },
  chatLockedRow: {
    borderRadius: 18,
    backgroundColor: "rgba(254, 254, 253, 0.82)",
    borderWidth: 2,
    borderColor: "rgba(254, 254, 253, 0.84)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  upcomingChallengeNotice: {
    backgroundColor: "rgba(244, 163, 64, 0.20)",
    borderWidth: 1,
    borderColor: "rgba(244, 163, 64, 0.48)",
  },
  chatLockedText: {
    flex: 1,
    color: palette.muted,
    fontSize: 14,
    lineHeight: 17,
    fontFamily: vibesTheme.fonts.medium,
  },
  completionCelebration: {
    position: "absolute",
    left: 24,
    right: 24,
    zIndex: 90,
    borderRadius: 24,
    backgroundColor: "rgba(254, 254, 253, 0.98)",
    borderWidth: 1,
    borderColor: "rgba(244, 163, 64, 0.22)",
    paddingHorizontal: 20,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: vibesTheme.colors.secondaryText,
    shadowOpacity: 0.18,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 30,
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
    fontFamily: vibesTheme.fonts.regular,
    textAlign: "center",
  },
  completionCelebrationBody: {
    marginTop: 6,
    color: palette.muted,
    fontSize: 16,
    lineHeight: 21,
    fontFamily: vibesTheme.fonts.medium,
    textAlign: "center",
  },
  heroMedia: {
    minHeight: 195,
    backgroundColor: "rgba(244, 163, 64, 0.32)",
    justifyContent: "flex-end",
  },
  heroImage: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(43, 43, 43, 0.62)",
  },
  heroTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  heroIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(43, 43, 43, 0.28)",
    borderWidth: 1,
    borderColor: "rgba(254, 254, 253, 0.16)",
  },
  heroMetaPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  heroMetaPill: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(254, 254, 253, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(254, 254, 253, 0.12)",
  },
  heroMetaPillText: {
    color: WHITE,
    fontSize: 13,
    fontFamily: vibesTheme.fonts.medium,
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
    borderColor: "rgba(43, 43, 43, 0.07)",
    padding: 14,
    justifyContent: "center",
  },
  infoValue: {
    color: palette.text,
    fontSize: 30,
    lineHeight: 32,
    fontFamily: vibesTheme.fonts.bold,
  },
  infoValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  infoValueSuffix: {
    color: palette.text,
    fontSize: 20,
    lineHeight: 24,
    fontFamily: vibesTheme.fonts.bold,
  },
  infoLabel: {
    marginTop: 4,
    color: palette.muted,
    fontSize: 14,
    fontFamily: vibesTheme.fonts.semibold,
  },
  requestCard: {
    borderRadius: 22,
    backgroundColor: "rgba(244, 163, 64, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(244, 163, 64, 0.18)",
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
    fontFamily: vibesTheme.fonts.regular,
  },
  requestCardCount: {
    color: palette.goldDeep,
    fontSize: 20,
    lineHeight: 22,
    fontFamily: vibesTheme.fonts.bold,
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
    backgroundColor: "rgba(244, 163, 64, 0.22)",
  },
  requestName: {
    flex: 1,
    color: palette.text,
    fontSize: 16,
    lineHeight: 18,
    fontFamily: vibesTheme.fonts.semibold,
  },
  requestApproveButton: {
    borderRadius: 999,
    backgroundColor: "rgba(57, 120, 184, 0.22)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  requestApproveText: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 16,
    fontFamily: vibesTheme.fonts.bold,
  },
  celebrationCard: {
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: "rgba(244, 163, 64, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(244, 163, 64, 0.18)",
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
    backgroundColor: "rgba(244, 163, 64, 0.24)",
  },
  celebrationBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244, 163, 64, 0.23)",
    borderWidth: 1,
    borderColor: "rgba(254, 254, 253, 0.82)",
  },
  celebrationCopy: {
    flex: 1,
  },
  celebrationTitle: {
    color: palette.text,
    fontSize: 22,
    lineHeight: 24,
    fontFamily: vibesTheme.fonts.regular,
  },
  celebrationBody: {
    marginTop: 4,
    color: palette.muted,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.medium,
  },
  streakCard: {
    borderRadius: 24,
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderColor: "rgba(244, 163, 64, 0.18)",
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  cardTitle: {
    color: palette.text,
    fontSize: 24,
    fontFamily: vibesTheme.fonts.regular,
  },
  cardSubtitle: {
    marginTop: 4,
    color: palette.muted,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.subtitle,
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
    fontFamily: vibesTheme.fonts.bold,
  },
  streakLabel: {
    color: palette.muted,
    fontSize: 13,
    textAlign: "center",
    fontFamily: vibesTheme.fonts.semibold,
  },
  metricDivider: {
    width: 1,
    height: 42,
    backgroundColor: "rgba(43, 43, 43, 0.1)",
  },
  progressCard: {
    borderRadius: 24,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.07)",
    paddingHorizontal: 18,
    paddingVertical: 20,
    shadowColor: vibesTheme.colors.secondaryText,
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  journeyCard: {
    borderRadius: 24,
    backgroundColor: "rgba(254, 254, 253, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 18,
    shadowColor: vibesTheme.colors.secondaryText,
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  journeyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  journeyHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  journeyTitle: {
    color: palette.text,
    fontSize: 32,
    lineHeight: 36,
    fontFamily: vibesTheme.fonts.bold,
  },
  journeySubtitle: {
    marginTop: 6,
    color: palette.muted,
    fontSize: 17,
    lineHeight: 22,
    fontFamily: vibesTheme.fonts.medium,
  },
  journeyPercent: {
    color: vibesTheme.colors.accentBlue,
    fontSize: 46,
    lineHeight: 50,
    fontFamily: vibesTheme.fonts.bold,
  },
  journeyTrack: {
    marginTop: 20,
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(110, 110, 110, 0.18)",
  },
  journeyTrackFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: vibesTheme.colors.accentBlue,
  },
  journeyDaysRow: {
    paddingTop: 26,
    paddingBottom: 22,
    paddingHorizontal: 2,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  journeyDayWrap: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "flex-start",
    position: "relative",
  },
  journeyTodayLabel: {
    position: "absolute",
    top: 44,
    left: -2,
    width: 44,
    color: vibesTheme.colors.secondaryText,
    fontSize: 15,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: vibesTheme.fonts.bold,
  },
  journeyConnector: {
    width: 26,
    height: 4,
    borderRadius: 2,
    marginTop: 18,
    marginHorizontal: -1,
    backgroundColor: "rgba(110, 110, 110, 0.16)",
  },
  journeyConnectorMissed: {
    backgroundColor: "rgba(216, 140, 122, 0.45)",
  },
  journeyConnectorDone: {
    backgroundColor: "rgba(57, 120, 184, 0.45)",
  },
  journeyStatsRow: {
    borderTopWidth: 1,
    borderTopColor: "rgba(43, 43, 43, 0.1)",
    paddingTop: 16,
    gap: 12,
  },
  journeyStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  journeyStatText: {
    flex: 1,
    color: palette.muted,
    fontSize: 16,
    lineHeight: 21,
    fontFamily: vibesTheme.fonts.medium,
  },
  journeyStatValue: {
    color: palette.text,
    fontFamily: vibesTheme.fonts.bold,
  },
  journeyStatDivider: {
    width: 1,
    height: 42,
    backgroundColor: "rgba(43, 43, 43, 0.12)",
  },
  pathHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pathIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(216, 140, 122, 0.12)",
  },
  pathHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 27,
    lineHeight: 32,
    fontFamily: vibesTheme.fonts.regular,
  },
  pathSubtitle: {
    marginTop: 2,
    color: "rgba(43, 43, 43, 0.58)",
    fontSize: 15,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.subtitle,
  },
  pathPill: {
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(254, 254, 253, 0.92)",
  },
  pathPillText: {
    color: vibesTheme.colors.accentBlue,
    fontSize: 13,
    fontFamily: vibesTheme.fonts.bold,
  },
  pathScrollContent: {
    paddingTop: 28,
    paddingBottom: 26,
    paddingHorizontal: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  pathNodeWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  pathConnector: {
    width: 20,
    height: 4,
    borderRadius: 2,
    marginHorizontal: -1,
    backgroundColor: "rgba(110, 110, 110, 0.16)",
  },
  pathConnectorDone: {
    backgroundColor: "rgba(57, 120, 184, 0.34)",
  },
  pathConnectorMissed: {
    backgroundColor: "rgba(216, 140, 122, 0.34)",
  },
  dayCircle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: palette.gold,
  },
  dayCompleted: {
    backgroundColor: "rgba(57, 120, 184, 0.32)",
    borderColor: vibesTheme.colors.accentBlue,
  },
  dayActive: {
    backgroundColor: vibesTheme.colors.accentMustard,
    borderColor: "rgba(244, 163, 64, 0.52)",
    shadowColor: vibesTheme.colors.accentMustard,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  dayFuture: {
    backgroundColor: "rgba(110, 110, 110, 0.12)",
    borderColor: "rgba(110, 110, 110, 0.20)",
  },
  dayMissed: {
    backgroundColor: "rgba(216, 140, 122, 0.22)",
    borderColor: vibesTheme.colors.accentCoral,
  },
  dayText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 16,
    lineHeight: 20,
    includeFontPadding: false,
    fontVariant: ["tabular-nums"],
    fontFamily: vibesTheme.fonts.bold,
  },
  dayTextActive: {
    color: vibesTheme.colors.primaryText,
  },
  dayTextFuture: {
    color: vibesTheme.colors.secondaryText,
  },
  dayTextMissed: {
    color: vibesTheme.colors.primaryText,
  },
  pathMantraRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  pathMantraIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(110, 110, 110, 0.12)",
  },
  pathMantraText: {
    flex: 1,
    color: "rgba(43, 43, 43, 0.68)",
    fontSize: 17,
    lineHeight: 22,
    fontFamily: vibesTheme.fonts.medium,
  },
  pathStatsCard: {
    minHeight: 76,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
    backgroundColor: "rgba(254, 254, 253, 0.72)",
    paddingHorizontal: 8,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  pathStatItem: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  pathStatItemIndented: {
    paddingLeft: 10,
  },
  pathStatTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 28,
  },
  pathStatDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  pathStatDotCompleted: {
    backgroundColor: "rgba(216, 140, 122, 0.24)",
  },
  pathStatDotCurrent: {
    backgroundColor: palette.accentBlue,
  },
  pathStatDotFuture: {
    backgroundColor: "rgba(254, 254, 253, 0.96)",
  },
  pathStatValue: {
    color: palette.text,
    fontSize: 18,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.bold,
  },
  pathStatLabel: {
    marginTop: 6,
    color: "rgba(43, 43, 43, 0.62)",
    fontSize: 11,
    lineHeight: 13,
    fontFamily: vibesTheme.fonts.medium,
  },
  pathStatDivider: {
    width: 1,
    height: 42,
    backgroundColor: "rgba(43, 43, 43, 0.08)",
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
    fontFamily: vibesTheme.fonts.semibold,
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
    borderColor: "rgba(43, 43, 43, 0.07)",
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
    fontFamily: vibesTheme.fonts.bold,
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
    fontFamily: vibesTheme.fonts.medium,
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
    backgroundColor: vibesTheme.colors.primaryText,
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
    backgroundColor: `${vibesTheme.colors.surface}D9`,
    borderWidth: 1.5,
    borderColor: `${vibesTheme.colors.accentBlue}A6`,
    overflow: "hidden",
    justifyContent: "center",
    paddingLeft: 70,
    paddingRight: 36,
  },
  footerSliderTrackCompleted: {
    backgroundColor: vibesTheme.colors.surface,
    borderColor: `${vibesTheme.colors.accentBlue}A6`,
  },
  footerSliderTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${vibesTheme.colors.accentBlue}24`,
  },
  footerSliderFill: {
    position: "absolute",
    left: FOOTER_SLIDER_FILL_LEFT,
    top: 0,
    bottom: 0,
    borderRadius: 34,
    backgroundColor: `${vibesTheme.colors.accentBlue}2E`,
  },
  footerSliderHandle: {
    position: "absolute",
    left: FOOTER_SLIDER_HORIZONTAL_PADDING + 2,
    top: 9,
    width: FOOTER_SLIDER_HANDLE_SIZE,
    height: FOOTER_SLIDER_HANDLE_SIZE,
    borderRadius: FOOTER_SLIDER_HANDLE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.accentBlue,
    borderWidth: 1,
    borderColor: "rgba(254, 254, 253, 0.82)",
    shadowColor: vibesTheme.colors.accentCoral,
    shadowOpacity: 0,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  footerSliderHandleCompleted: {
    backgroundColor: vibesTheme.colors.accentBlue,
    shadowOpacity: 0,
  },
  footerSliderCopy: {
    justifyContent: "center",
    gap: 2,
    zIndex: 1,
  },
  footerSliderTitle: {
    color: vibesTheme.colors.primaryText,
    fontSize: 17,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.bold,
  },
  footerSliderSubtitle: {
    color: vibesTheme.colors.primaryText,
    fontSize: 13,
    lineHeight: 16,
    fontFamily: vibesTheme.fonts.subtitle,
  },
  footerSliderChevrons: {
    position: "absolute",
    right: 20,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    opacity: 0.4,
  },
  checkInText: {
    color: vibesTheme.colors.surface,
    fontSize: 18,
    lineHeight: 22,
    fontFamily: vibesTheme.fonts.bold,
    textAlign: "center",
  },
  floatingChatButton: {
    alignSelf: "flex-end",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.primaryText,
    shadowColor: vibesTheme.colors.primaryText,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 5,
  },
  chatRow: {
    borderRadius: 22,
    backgroundColor: "rgba(110, 110, 110, 0.9)",
    borderWidth: 2,
    borderColor: "rgba(254, 254, 253, 0.18)",
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
    backgroundColor: "rgba(254, 254, 253, 0.16)",
  },
  chatCopy: {
    flex: 1,
  },
  chatTitle: {
    color: vibesTheme.colors.background,
    fontSize: 19,
    fontFamily: vibesTheme.fonts.bold,
  },
  chatSubtitle: {
    marginTop: 2,
    color: "rgba(254, 254, 253, 0.76)",
    fontSize: 14,
    fontFamily: vibesTheme.fonts.subtitle,
  },
  menuSheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 28,
  },
  completionShareBadge: {
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.accentMustard,
    marginBottom: 14,
  },
  completionShareTitle: {
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.semibold,
    fontSize: 24,
    lineHeight: 30,
    textAlign: "center",
  },
  completionShareBody: {
    color: vibesTheme.colors.secondaryText,
    fontFamily: vibesTheme.fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 22,
  },
  completionSharePrimary: {
    minHeight: 54,
    borderRadius: vibesTheme.radii.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: vibesTheme.colors.primaryText,
  },
  completionSharePrimaryText: {
    color: vibesTheme.colors.background,
    fontFamily: vibesTheme.fonts.semibold,
    fontSize: 16,
  },
  completionShareSecondary: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  completionShareSecondaryText: {
    color: vibesTheme.colors.secondaryText,
    fontFamily: vibesTheme.fonts.medium,
    fontSize: 16,
  },
  menuHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(43, 43, 43, 0.16)",
    marginBottom: 16,
  },
  menuTitle: {
    color: palette.text,
    fontSize: 22,
    lineHeight: 26,
    fontFamily: vibesTheme.fonts.regular,
    marginBottom: 10,
  },
  menuItem: {
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(254, 254, 253, 0.72)",
    marginTop: 10,
  },
  menuItemDanger: {
    backgroundColor: palette.redSoft,
  },
  menuItemText: {
    color: palette.text,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.medium,
  },
  menuItemTextDanger: {
    color: palette.red,
  },
  sharePreparingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(43, 43, 43, 0.08)",
  },
  sharePreparingCard: {
    minWidth: 230,
    minHeight: 78,
    borderRadius: 24,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
    shadowColor: vibesTheme.colors.primaryText,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  sharePreparingText: {
    color: vibesTheme.colors.primaryText,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.medium,
  },
});

export default ChallengeDetailScreen;
