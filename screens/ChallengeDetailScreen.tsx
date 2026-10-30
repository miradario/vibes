import EventInviteSheet from "../components/EventInviteSheet";
import AppHeader from "../components/AppHeader";
import Tag from "../components/ui/Tag";
import ChallengeCompletionShareCard from "../components/ChallengeCompletionShareCard";
import { captureRef, releaseCapture } from "react-native-view-shot";
import ChallengeCompletionConfetti from "../components/ChallengeCompletionConfetti";
import ChallengeJourneyPath from "../components/ChallengeJourneyPath";
import BackButton from "../components/BackButton";
import { useLocalDay } from "../src/hooks/useLocalDay";
import { usePublicContentBack } from "../src/hooks/usePublicContentBack";
import { resolvePublicContentRoute } from "../src/lib/publicContentRoute";
import { maybeRequestStoreReview } from "../src/lib/storeReview";
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
import { swipeToConfirmMetrics, swipeToConfirmTrackStyle } from "../components/ui/SwipeToConfirm";
import * as ds from "../src/theme/tokens";

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
  surfaceAlt: ds.colors.bg.selected,
  text: vibesTheme.colors.primaryText,
  muted: vibesTheme.colors.secondaryText,
  faint: ds.withAlpha(ds.colors.base.coral, ds.opacity.scrim),
  gold: vibesTheme.colors.accentMustard,
  goldDeep: vibesTheme.colors.accentMustard,
  accentBlue: vibesTheme.colors.accentBlue,
  accentBlueDeep: vibesTheme.colors.secondaryText,
  accentBlueSoft: ds.withAlpha(ds.colors.base.blue, ds.opacity.medium),
  red: vibesTheme.colors.accentCoral,
  redSoft: ds.colors.feedback.errorBg,
};

const FOOTER_SWIPE = swipeToConfirmMetrics("md");
const FOOTER_SLIDER_HANDLE_SIZE = FOOTER_SWIPE.thumb;
const FOOTER_SLIDER_HORIZONTAL_PADDING = FOOTER_SWIPE.inset;
const FOOTER_SLIDER_TRACK_HEIGHT = FOOTER_SWIPE.height;
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
        <Icon name="sparkles-outline" size={ds.iconSize.sm} color={palette.goldDeep} />
      </View>
      <View style={localStyles.celebrationCopy}>
        <Text style={localStyles.celebrationTitle}>{copy.title}</Text>
        <Text style={localStyles.celebrationBody}>{copy.body}</Text>
      </View>
    </View>
  );
});

const ChallengeIntroMetaRow = memo(({ challenge, checkedInTodayCount, curated = false }: { challenge: ChallengeDetailData; checkedInTodayCount: number; curated?: boolean }) => (
  <View style={{ gap: ds.spacing[4], paddingVertical: ds.spacing[2] }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: ds.spacing[4] }}>
      <Icon name="calendar-outline" size={ds.iconSize.lg} color={vibesTheme.colors.accentBlue} />
      <View style={{ flex: 1 }}><Text style={{ color: vibesTheme.colors.primaryText, ...ds.textStyles.subtitle }}>{!curated && challenge.currentDay > 0 ? `Día ${challenge.currentDay} de ${challenge.totalDays}` : `${challenge.totalDays} días de actividades`}</Text></View>
    </View>
    {curated ? null : (
    <View style={{ flexDirection: "row", alignItems: "center", gap: ds.spacing[4] }}>
      <Icon name="people-outline" size={ds.iconSize.lg} color={vibesTheme.colors.accentBlue} />
      <View style={{ flex: 1 }}><Text style={{ color: vibesTheme.colors.primaryText, ...ds.textStyles.subtitle }}>{challenge.participantsCount} participantes</Text><Text style={{ color: vibesTheme.colors.secondaryText, ...ds.textStyles.bodySmall }}>{checkedInTodayCount} {checkedInTodayCount === 1 ? "completó" : "completaron"} hoy</Text></View>
    </View>
    )}
  </View>
));

const ChallengeJourneyCard = memo(React.forwardRef<View, { challenge: ChallengeDetailData; percent: number; playPath?: boolean; onLayout?: () => void }>(({ challenge, playPath = true, onLayout }, ref) => {
  return (<View ref={ref} onLayout={onLayout} collapsable={false} style={localStyles.journeyCard}>
    <ChallengeJourneyPath totalDays={challenge.totalDays} currentDay={challenge.currentDay} completedDays={challenge.completedDays} play={playPath} />
        <View style={localStyles.journeyStatsRow}>
          <View style={localStyles.journeyStatItem}>
            <Icon name="flame-outline" size={ds.iconSize.lg} color={vibesTheme.colors.accentCoral} />
            <Text style={localStyles.journeyStatText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              Racha actual:{" "}
              <Text style={localStyles.journeyStatValue}>
                {challenge.streak} {challenge.streak === 1 ? "día" : "días"}
              </Text>
            </Text>
          </View>
          <View style={localStyles.journeyStatItem}>
            <Icon name="trophy-outline" size={ds.iconSize.lg} color={vibesTheme.colors.accentMustard} />
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
));

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
            size={Math.max(ds.iconSize.sm, size * 0.42)}
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
            <Icon name="flag-outline" size={ds.iconSize.lg} color={vibesTheme.colors.accentCoral} />
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
            <Icon name="trending-up-outline" size={ds.iconSize.sm} color={vibesTheme.colors.accentCoral} />
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
            <Icon name="leaf-outline" size={ds.iconSize.md} color={vibesTheme.colors.secondaryText} />
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
                <Icon name="checkmark" size={ds.iconSize.sm} color={vibesTheme.colors.primaryText} />
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
            <Icon name={icon} size={ds.iconSize.md} color={vibesTheme.colors.background} />
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
    <Icon name="chatbubble-outline" size={ds.iconSize.xl} color={vibesTheme.colors.surface} />
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
  // Path animation starts only once half the journey card (capped at 40% of the screen) is visible.
  const journeyCardRef = useRef<View>(null);
  const [journeyInView, setJourneyInView] = useState(false);
  const checkJourneyInView = React.useCallback(() => {
    if (journeyInView) return;
    journeyCardRef.current?.measureInWindow((_x, y, _w, h) => {
      if (h > 0 && y < height - Math.min(h * 0.5, height * 0.4) && y + h > 0) setJourneyInView(true);
    });
  }, [height, journeyInView]);
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
  const isCurated = Boolean(event && isCuratedChallenge(event));
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
    } else {
      // Positive moment: ask for a store rating once the celebration is gone.
      void maybeRequestStoreReview();
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
          <Icon name="time-outline" size={ds.iconSize.md} color={palette.goldDeep} />
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
            <Icon name="checkmark" size={ds.iconSize.lg} color={vibesTheme.colors.primaryText} />
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
            <Icon name="chevron-forward" size={ds.iconSize.md} color={vibesTheme.colors.accentBlue} />
            <Icon name="chevron-forward" size={ds.iconSize.md} color={vibesTheme.colors.accentBlue} />
          </View>
          <View style={localStyles.footerSliderCopy}>
            <Text style={[localStyles.footerSliderTitle, { textAlign: "center", ...ds.textStyles.bodySmall }]}>
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
            <Icon name="arrow-forward" size={ds.iconSize.lg} color={vibesTheme.colors.surface} />
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
        <Icon name="lock-closed-outline" size={ds.iconSize.xl} color={palette.gold} />
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
          titleStyle={{ ...ds.textStyles.heading }}
          right={<View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Compartir desafío" onPress={handleDirectShare} disabled={isPreparingShare || isSharing} style={localStyles.referenceAction}>
              {isPreparingShare ? <VibesLoader /> : <Icon name="share-outline" size={ds.iconSize.lg} color={vibesTheme.colors.primaryText} />}
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Opciones del desafío" onPress={() => setMenuVisible(true)} style={localStyles.referenceAction}><Icon name="ellipsis-horizontal" size={ds.iconSize.lg} color={vibesTheme.colors.primaryText} /></TouchableOpacity>
          </View>} />
      </View>

      <NativeAnimated.ScrollView
        contentContainerStyle={[
          localStyles.scrollContent,
          {
            paddingBottom: insets.bottom + /* ds-lint-allow layout: paddingBottom 188 (medida de layout fuera de la escala) */ 188,
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={journeyInView ? undefined : checkJourneyInView}
        onContentSizeChange={journeyInView ? undefined : checkJourneyInView}
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
            <Tag label={`${challenge.totalDays} días`} />
            {isChallengeUpcoming && !isCurated ? <Tag label={getChallengeStartsInLabel(challengeTimeline.startsInDays)} /> : null}
          </View>
          <Text style={localStyles.referenceTitle}>{challenge.title}</Text>
          <View style={localStyles.challengeIntroBlock}>
            <ChallengeIntroMetaRow challenge={challenge} checkedInTodayCount={checkedInTodayCount} curated={isCurated} />
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
              <Icon name="person-add-outline" size={ds.iconSize.lg} color={vibesTheme.colors.primaryText} />
              <Text style={{ color: vibesTheme.colors.primaryText, ...ds.textStyles.subtitleMedium }}>Invitar a alguien</Text>
            </TouchableOpacity> : null}
            <ChallengeJourneyCard ref={journeyCardRef} challenge={challenge} percent={percent} playPath={journeyInView} onLayout={checkJourneyInView} />
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
                        fallbackBackgroundColor={ds.withAlpha(ds.colors.base.coral, ds.opacity.medium)}
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
              <ChallengeInviteesSection challenge={event} inviteButtonStyle={[localStyles.inviteAction, { marginBottom: 0 }]} />
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
                <Icon name="trophy-outline" size={ds.iconSize.md} color={palette.muted} />
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
          <View style={[localStyles.completionCelebrationBadge, finalCelebration && { width: 64, height: 64, borderRadius: ds.radii.pill }]}>
            <Icon
              name={
                finalCelebration ? "trophy-outline" : "sparkles-outline"
              }
              size={finalCelebration ? ds.iconSize.xl : ds.iconSize.md}
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
          <Icon name="trophy-outline" size={ds.iconSize.lg} color={vibesTheme.colors.background} />
        </View>
        <Text style={localStyles.completionShareTitle}>{t("challengeShare.title")}</Text>
        <Text style={localStyles.completionShareBody}>{t("challengeShare.body")}</Text>
        <ScrollView style={{ maxHeight: height * 0.42 }} contentContainerStyle={{ alignItems: "center", paddingVertical: ds.spacing[2] }}>
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
          <Icon name="share-outline" size={ds.iconSize.md} color={vibesTheme.colors.background} />
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
            <Icon name="create-outline" size={ds.iconSize.md} color={palette.text} />
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
            <Icon name="refresh-outline" size={ds.iconSize.md} color={palette.text} />
            <Text style={localStyles.menuItemText}>{t(event && isCuratedChallenge(event) ? "challengeRestart.start" : "challengeRestart.restart")}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={localStyles.menuItem}
          onPress={() => {
            pendingParticipants.current = true;
            setMenuVisible(false);
          }}
        >
          <Icon name="people-outline" size={ds.iconSize.md} color={palette.text} />
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
            <Icon name="share-social-outline" size={ds.iconSize.md} color={palette.text} />
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
            <Icon name="trash-outline" size={ds.iconSize.md} color={palette.red} />
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
            <Icon name="exit-outline" size={ds.iconSize.md} color={palette.red} />
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
        curated={Boolean(event && isCuratedChallenge(event))}
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
  inviteAction: { minHeight: 50, marginBottom: ds.spacing[4], flexDirection: "row", gap: ds.spacing[3], alignItems: "center", justifyContent: "center", borderRadius: ds.radii.lg, backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle) },
  referenceAction: { width: 40, height: 44, justifyContent: "center", alignItems: "center" },
  referenceCover: { width: "auto", height: 190, marginHorizontal: ds.spacing[4], marginTop: ds.spacing[2], marginBottom: ds.spacing[4], borderRadius: ds.radii.lg, backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle) },
  referenceBadges: { flexDirection: "row", flexWrap: "wrap", gap: ds.spacing[2], marginBottom: ds.spacing[3] },
  referenceTitle: { ...ds.textStyles.display, color: vibesTheme.colors.primaryText, marginBottom: ds.spacing[3] },

  descriptionSection: { paddingVertical: ds.spacing[5], gap: ds.spacing[3] },
  descriptionHeading: { color: vibesTheme.colors.primaryText, ...ds.textStyles.heading },
  fullDescription: { color: vibesTheme.colors.secondaryText, ...ds.textStyles.body },
  descriptionPreviewRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: ds.spacing[1],
  },
  descriptionPreviewText: {
    flex: 1,
  },
  descriptionMoreButton: {
    paddingVertical: ds.spacing[1],
  },
  descriptionMoreText: {
    color: vibesTheme.colors.accentBlue,
    ...ds.textStyles.subtitle,
    textDecorationLine: "underline",
  },
  descriptionSheet: {
    backgroundColor: vibesTheme.colors.surface,
    borderTopLeftRadius: ds.radii.xl,
    borderTopRightRadius: ds.radii.xl,
    paddingHorizontal: ds.spacing[6],
    paddingTop: ds.spacing[3],
    paddingBottom: ds.spacing[8],
  },
  descriptionSheetTitle: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.title,
    marginBottom: ds.spacing[4],
  },
  descriptionSheetScroll: {
    maxHeight: 420,
  },
  descriptionSheetContent: {
    paddingBottom: ds.spacing[3],
  },
  screen: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: ds.spacing[4],
    backgroundColor: palette.bg,
    paddingHorizontal: ds.spacing[6],
  },
  loadingTitle: {
    color: palette.text,
    ...ds.textStyles.title,
    textAlign: "center",
  },
  privateBody: {
    color: vibesTheme.colors.muted,
    ...ds.textStyles.body,
    textAlign: "center",
    maxWidth: 320,
  },
  loadingBackButton: {
    borderRadius: ds.radii.xl,
    paddingHorizontal: ds.spacing[5],
    paddingVertical: ds.spacing[3],
    backgroundColor: palette.gold,
  },
  loadingBackText: {
    color: vibesTheme.colors.surface,
    ...ds.textStyles.subtitle,
  },
  scrollContent: {
    paddingBottom: /* ds-lint-allow layout: paddingBottom 188 (medida de layout fuera de la escala) */ 188,
  },
  contentShell: {
    marginTop: ds.spacing[1],
    paddingHorizontal: ds.spacing[5],
    zIndex: 2,
  },
  challengeIntroBlock: {
    paddingHorizontal: ds.spacing[1],
    paddingTop: ds.spacing[3],
    paddingBottom: ds.spacing[4],
  },
  challengeTypePill: {
    alignSelf: "flex-start",
  },
  challengeTypePillText: {
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.label,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  challengeIntroTitle: {
    marginTop: ds.spacing[3],
    color: palette.text,
    ...ds.textStyles.display,
  },
  challengeIntroMetaRow: {
    marginTop: ds.spacing[4],
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
  },
  challengeIntroMetaItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[2],
  },
  challengeIntroMetaText: {
    flex: 1,
    color: palette.text,
    ...ds.textStyles.heading,
  },
  challengeParticipantText: {
    color: palette.text,
    ...ds.textStyles.heading,
  },
  challengeTodayText: {
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.bodySmall,
  },
  challengeIntroDivider: {
    width: 1,
    height: 42,
    backgroundColor: ds.colors.border.default,
  },
  heroInfoStack: {
    marginBottom: ds.spacing[4],
  },
  content: {
    paddingTop: 0,
    gap: ds.spacing[4],
  },
  stickyFooter: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 40,
    elevation: ds.shadows.lg.elevation,
  },
  stickyFooterCard: {
    backgroundColor: "transparent",
    gap: ds.spacing[3],
  },
  expandedChallengeHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 63,
    elevation: ds.shadows.lg.elevation,
    paddingLeft: ds.spacing[5],
    paddingRight: ds.spacing[5],
    flexDirection: "column",
    alignItems: "stretch",
    gap: ds.spacing[4],
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
    gap: ds.spacing[3],
  },
  expandedChallengeHeaderIconButton: {
    width: 42,
    height: 42,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.withAlpha(ds.colors.base.ink, ds.opacity.medium),
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.paper, ds.opacity.scrim),
  },
  expandedChallengeHeaderCopy: {
    width: "100%",
    paddingHorizontal: ds.spacing[3],
  },
  expandedChallengeHeaderTitle: {
    color: WHITE,
    ...ds.textStyles.title,
    textAlign: "left",
    textShadowColor: ds.withAlpha(ds.colors.base.ink, ds.opacity.strong),
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  expandedChallengeHeaderSubtitle: {
    marginTop: ds.spacing[3],
    color: ds.colors.bg.surfaceTranslucent,
    ...ds.textStyles.subtitleMedium,
    textShadowColor: ds.withAlpha(ds.colors.base.ink, ds.opacity.strong),
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  collapsedChallengeHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    minHeight: 84,
    paddingHorizontal: ds.spacing[5],
    paddingBottom: ds.spacing[3],
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: ds.colors.border.subtle,
    shadowColor: palette.text,
    shadowOpacity: ds.shadows.md.shadowOpacity,
    shadowRadius: ds.shadows.md.shadowRadius,
    shadowOffset: ds.shadows.md.shadowOffset,
    zIndex: 61,
    elevation: ds.shadows.md.elevation,
  },
  collapsedChallengeHeaderBackButton: {
    width: 48,
    height: 48,
    borderRadius: ds.radii.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.colors.bg.surfaceTranslucent,
    borderWidth: 1,
    borderColor: ds.colors.border.subtle,
  },
  collapsedChallengeHeaderThumbnail: {
    width: 38,
    height: 38,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.scrim),
  },
  collapsedChallengeHeaderTitle: {
    flex: 1,
    color: palette.text,
    ...ds.textStyles.heading,
    textAlign: "left",
  },
  headerIconPlaceholder: {
    width: 40,
    height: 40,
  },
  joinRequestButton: {
    borderRadius: ds.radii.xl,
    backgroundColor: vibesTheme.colors.primaryText,
    borderWidth: 2,
    borderColor: ds.withAlpha(ds.colors.base.paper, ds.opacity.medium),
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.accentBlueDeep,
    shadowOpacity: ds.shadows.md.shadowOpacity,
    shadowRadius: ds.shadows.md.shadowRadius,
    shadowOffset: ds.shadows.md.shadowOffset,
  },
  joinRequestButtonDisabled: {
    opacity: 0.6,
  },
  joinRequestButtonTitle: {
    color: vibesTheme.colors.background,
    ...ds.textStyles.subtitle,
  },
  joinRequestButtonSubtitle: {
    marginTop: ds.spacing[1],
    color: vibesTheme.colors.surface,
    ...ds.textStyles.labelMedium,
  },
  chatLockedRow: {
    borderRadius: ds.radii.lg,
    backgroundColor: ds.colors.bg.surfaceTranslucent,
    borderWidth: 2,
    borderColor: ds.colors.bg.surfaceTranslucent,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
  },
  upcomingChallengeNotice: {
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.medium),
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.strong),
  },
  chatLockedText: {
    flex: 1,
    color: palette.muted,
    ...ds.textStyles.labelMedium,
  },
  completionCelebration: {
    position: "absolute",
    left: 24,
    right: 24,
    zIndex: 90,
    borderRadius: ds.radii.xl,
    backgroundColor: ds.colors.bg.surface,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.medium),
    paddingHorizontal: ds.spacing[5],
    paddingVertical: ds.spacing[4],
    alignItems: "center",
    ...ds.shadows.lg,
  },
  completionCelebrationBadge: {
    width: 44,
    height: 44,
    borderRadius: ds.radii.pill,
    backgroundColor: palette.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  completionCelebrationTitle: {
    marginTop: ds.spacing[3],
    color: palette.text,
    ...ds.textStyles.title,
    textAlign: "center",
  },
  completionCelebrationBody: {
    marginTop: ds.spacing[2],
    color: palette.muted,
    ...ds.textStyles.subtitleMedium,
    textAlign: "center",
  },
  heroMedia: {
    minHeight: 195,
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.scrim),
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
    backgroundColor: ds.withAlpha(ds.colors.base.ink, ds.opacity.high),
  },
  heroTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: ds.spacing[5],
  },
  heroIconButton: {
    width: 42,
    height: 42,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.colors.scrim,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.paper, ds.opacity.soft),
  },
  heroMetaPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ds.spacing[2],
    marginTop: ds.spacing[4],
  },
  heroMetaPill: {
    minHeight: 34,
    borderRadius: ds.radii.pill,
    paddingHorizontal: ds.spacing[3],
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[2],
    backgroundColor: ds.withAlpha(ds.colors.base.paper, ds.opacity.soft),
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.paper, ds.opacity.soft),
  },
  heroMetaPillText: {
    color: WHITE,
    ...ds.textStyles.labelMedium,
  },
  infoRow: {
    flexDirection: "row",
    gap: ds.spacing[3],
  },
  infoCard: {
    flex: 1,
    minHeight: 92,
    borderRadius: ds.radii.xl,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: ds.colors.border.subtle,
    padding: ds.spacing[4],
    justifyContent: "center",
  },
  infoValue: {
    color: palette.text,
    ...ds.textStyles.display,
  },
  infoValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: ds.spacing[1],
  },
  infoValueSuffix: {
    color: palette.text,
    ...ds.textStyles.heading,
  },
  infoLabel: {
    marginTop: ds.spacing[1],
    color: palette.muted,
    ...ds.textStyles.label,
  },
  requestCard: {
    borderRadius: ds.radii.xl,
    backgroundColor: ds.colors.bg.selected,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.medium),
    padding: ds.spacing[4],
    gap: ds.spacing[3],
  },
  requestCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  requestCardTitle: {
    color: palette.text,
    ...ds.textStyles.heading,
  },
  requestCardCount: {
    color: palette.goldDeep,
    ...ds.textStyles.heading,
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: ds.spacing[3],
  },
  requestProfile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
  },
  requestAvatar: {
    width: 38,
    height: 38,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.medium),
  },
  requestName: {
    flex: 1,
    color: palette.text,
    ...ds.textStyles.subtitle,
  },
  requestApproveButton: {
    borderRadius: ds.radii.pill,
    backgroundColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.medium),
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[2],
  },
  requestApproveText: {
    color: palette.text,
    ...ds.textStyles.label,
  },
  celebrationCard: {
    overflow: "hidden",
    borderRadius: ds.radii.xl,
    backgroundColor: ds.colors.bg.selected,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.medium),
    padding: ds.spacing[4],
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[4],
  },
  celebrationGlow: {
    position: "absolute",
    left: -12,
    top: -20,
    width: 180,
    height: 180,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.medium),
  },
  celebrationBadge: {
    width: 48,
    height: 48,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.medium),
    borderWidth: 1,
    borderColor: ds.colors.bg.surfaceTranslucent,
  },
  celebrationCopy: {
    flex: 1,
  },
  celebrationTitle: {
    color: palette.text,
    ...ds.textStyles.title,
  },
  celebrationBody: {
    marginTop: ds.spacing[1],
    color: palette.muted,
    ...ds.textStyles.subtitleMedium,
  },
  streakCard: {
    borderRadius: ds.radii.xl,
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.medium),
    padding: ds.spacing[4],
    flexDirection: "row",
    justifyContent: "space-between",
    gap: ds.spacing[4],
  },
  cardTitle: {
    color: palette.text,
    ...ds.textStyles.title,
  },
  cardSubtitle: {
    marginTop: ds.spacing[1],
    color: palette.muted,
    ...ds.textStyles.subtitleMedium,
  },
  streakMetrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[4],
  },
  streakValue: {
    color: palette.goldDeep,
    ...ds.textStyles.display,
    textAlign: "center",
  },
  streakLabel: {
    color: palette.muted,
    ...ds.textStyles.label,
    textAlign: "center",
  },
  metricDivider: {
    width: 1,
    height: 42,
    backgroundColor: ds.colors.border.default,
  },
  progressCard: {
    borderRadius: ds.radii.xl,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: ds.colors.border.subtle,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[5],
    ...ds.shadows.md,
  },
  journeyCard: {
    borderRadius: ds.radii.xl,
    backgroundColor: ds.colors.bg.surface,
    borderWidth: 1,
    borderColor: ds.colors.border.subtle,
    paddingHorizontal: ds.spacing[4],
    paddingTop: ds.spacing[6],
    paddingBottom: ds.spacing[4],
    ...ds.shadows.md,
  },
  journeyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: ds.spacing[4],
  },
  journeyHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  journeyTitle: {
    color: palette.text,
    ...ds.textStyles.display,
  },
  journeySubtitle: {
    marginTop: ds.spacing[2],
    color: palette.muted,
    ...ds.textStyles.subtitleMedium,
  },
  journeyPercent: {
    color: vibesTheme.colors.accentBlue,
    ...ds.textStyles.display,
  },
  journeyTrack: {
    marginTop: ds.spacing[5],
    height: ds.componentSize.progressBar.md,
    borderRadius: ds.radii.pill,
    overflow: "hidden",
    backgroundColor: ds.colors.border.default,
  },
  journeyTrackFill: {
    height: "100%",
    borderRadius: ds.radii.pill,
    backgroundColor: ds.colors.action.secondaryBlueText,
  },
  journeyDaysRow: {
    paddingTop: ds.spacing[6],
    paddingBottom: ds.spacing[6],
    paddingHorizontal: ds.spacing[1],
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
    ...ds.textStyles.subtitle,
    textAlign: "center",
  },
  journeyConnector: {
    width: 26,
    height: 4,
    borderRadius: ds.radii.pill,
    marginTop: ds.spacing[4],
    marginHorizontal: -ds.spacing[0],
    backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.soft),
  },
  journeyConnectorMissed: {
    backgroundColor: ds.withAlpha(ds.colors.base.coral, ds.opacity.strong),
  },
  journeyConnectorDone: {
    backgroundColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.strong),
  },
  journeyStatsRow: {
    borderTopWidth: 1,
    borderTopColor: ds.colors.border.default,
    paddingTop: ds.spacing[4],
    gap: ds.spacing[3],
  },
  journeyStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
  },
  journeyStatText: {
    flex: 1,
    color: palette.muted,
    ...ds.textStyles.subtitleMedium,
  },
  journeyStatValue: {
    color: palette.text,
    fontFamily: vibesTheme.fonts.bold,
  },
  journeyStatDivider: {
    width: 1,
    height: 42,
    backgroundColor: ds.colors.border.default,
  },
  pathHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
  },
  pathIconWrap: {
    width: 56,
    height: 56,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.colors.feedback.errorBg,
  },
  pathHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    color: palette.text,
    ...ds.textStyles.title,
  },
  pathSubtitle: {
    marginTop: ds.spacing[1],
    color: ds.withAlpha(ds.colors.base.ink, ds.opacity.high),
    ...ds.textStyles.subtitleMedium,
  },
  pathPill: {
    minHeight: 36,
    borderRadius: ds.radii.lg,
    paddingHorizontal: ds.spacing[3],
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[2],
    backgroundColor: ds.colors.bg.surfaceTranslucent,
  },
  pathPillText: {
    color: vibesTheme.colors.accentBlue,
    ...ds.textStyles.label,
  },
  pathScrollContent: {
    paddingTop: ds.spacing[8],
    paddingBottom: ds.spacing[6],
    paddingHorizontal: ds.spacing[1],
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
    borderRadius: ds.radii.pill,
    marginHorizontal: -ds.spacing[0],
    backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.soft),
  },
  pathConnectorDone: {
    backgroundColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.scrim),
  },
  pathConnectorMissed: {
    backgroundColor: ds.withAlpha(ds.colors.base.coral, ds.opacity.scrim),
  },
  dayCircle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: palette.gold,
  },
  dayCompleted: {
    backgroundColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.scrim),
    borderColor: vibesTheme.colors.accentBlue,
  },
  dayActive: {
    backgroundColor: vibesTheme.colors.accentMustard,
    borderColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.strong),
    ...ds.glow.accent,
  },
  dayFuture: {
    backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.soft),
    borderColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.medium),
  },
  dayMissed: {
    backgroundColor: ds.withAlpha(ds.colors.base.coral, ds.opacity.medium),
    borderColor: vibesTheme.colors.accentCoral,
  },
  dayText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.subtitle,
    includeFontPadding: false,
    fontVariant: ["tabular-nums"],
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
    gap: ds.spacing[3],
    marginBottom: ds.spacing[5],
  },
  pathMantraIcon: {
    width: 38,
    height: 38,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.soft),
  },
  pathMantraText: {
    flex: 1,
    color: ds.withAlpha(ds.colors.base.ink, ds.opacity.high),
    ...ds.textStyles.subtitleMedium,
  },
  pathStatsCard: {
    minHeight: 76,
    borderRadius: ds.radii.lg,
    borderWidth: 1,
    borderColor: ds.colors.border.subtle,
    backgroundColor: ds.withAlpha(ds.colors.base.paper, ds.opacity.higher),
    paddingHorizontal: ds.spacing[2],
    paddingVertical: ds.spacing[3],
    flexDirection: "row",
    alignItems: "center",
  },
  pathStatItem: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  pathStatItemIndented: {
    paddingLeft: ds.spacing[3],
  },
  pathStatTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[2],
    minHeight: 28,
  },
  pathStatDot: {
    width: 28,
    height: 28,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pathStatDotCompleted: {
    backgroundColor: ds.withAlpha(ds.colors.base.coral, ds.opacity.medium),
  },
  pathStatDotCurrent: {
    backgroundColor: palette.accentBlue,
  },
  pathStatDotFuture: {
    backgroundColor: ds.colors.bg.surface,
  },
  pathStatValue: {
    color: palette.text,
    ...ds.textStyles.heading,
  },
  pathStatLabel: {
    marginTop: ds.spacing[2],
    color: ds.withAlpha(ds.colors.base.ink, ds.opacity.high),
    ...ds.textStyles.micro,
  },
  pathStatDivider: {
    width: 1,
    height: 42,
    backgroundColor: ds.colors.bg.subtle,
  },
  compactTrack: {
    height: ds.componentSize.progressBar.md,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.colors.border.default,
    overflow: "hidden",
  },
  compactFill: {
    height: "100%",
    borderRadius: ds.radii.pill,
    backgroundColor: ds.colors.action.accent,
  },
  milestonesRow: {
    marginTop: ds.spacing[4],
    flexDirection: "row",
    justifyContent: "space-between",
    gap: ds.spacing[2],
  },
  milestoneItem: {
    alignItems: "center",
    flex: 1,
    gap: ds.spacing[2],
  },
  milestoneText: {
    color: palette.muted,
    ...ds.textStyles.caption,
    textAlign: "center",
  },
  calendarRow: {
    justifyContent: "space-between",
    marginBottom: ds.spacing[3],
  },
  calendarCell: {
    width: `${100 / 7}%`,
    alignItems: "center",
  },
  summaryCard: {
    borderRadius: ds.radii.xl,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: ds.colors.border.subtle,
    padding: ds.spacing[4],
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  percentText: {
    color: palette.goldDeep,
    ...ds.textStyles.title,
  },
  summaryTrack: {
    marginTop: ds.spacing[4],
    height: ds.componentSize.progressBar.md,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.colors.border.default,
    overflow: "hidden",
  },
  summaryFill: {
    height: "100%",
    borderRadius: ds.radii.pill,
    backgroundColor: ds.colors.action.secondaryBlueText,
  },
  summaryCopy: {
    marginTop: ds.spacing[3],
    color: palette.muted,
    ...ds.textStyles.subtitleMedium,
  },
  checkInButton: {
    minHeight: 58,
    borderRadius: ds.radii.xl,
    backgroundColor: palette.gold,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ds.spacing[2],
    paddingHorizontal: ds.spacing[4],
    ...ds.glow.accent,
  },
  checkInCompleted: {
    backgroundColor: vibesTheme.colors.primaryText,
    ...ds.shadows.none,
  },
  checkInBroken: {
    backgroundColor: palette.red,
  },
  footerSliderWrap: {
    minHeight: FOOTER_SWIPE.height,
    justifyContent: "center",
  },
  // Chevrons a la derecha: el copy arranca después del thumb.
  footerSliderTrack: { ...swipeToConfirmTrackStyle("md", "info"), paddingLeft: FOOTER_SWIPE.chevronsLeft, paddingRight: ds.spacing[8] },
  footerSliderTrackCompleted: {
    backgroundColor: vibesTheme.colors.surface,
    borderColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.high),
  },
  footerSliderTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ds.colors.feedback.infoBg,
  },
  footerSliderFill: {
    position: "absolute",
    left: FOOTER_SLIDER_FILL_LEFT,
    top: 0,
    bottom: 0,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.medium),
  },
  footerSliderHandle: {
    position: "absolute",
    left: FOOTER_SLIDER_HORIZONTAL_PADDING,
    top: FOOTER_SLIDER_HORIZONTAL_PADDING,
    width: FOOTER_SLIDER_HANDLE_SIZE,
    height: FOOTER_SLIDER_HANDLE_SIZE,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.accentBlue,
    borderWidth: 1,
    borderColor: ds.colors.bg.surfaceTranslucent,
    ...ds.shadows.none,
  },
  footerSliderHandleCompleted: {
    backgroundColor: vibesTheme.colors.accentBlue,
    shadowOpacity: ds.shadows.none.shadowOpacity,
  },
  footerSliderCopy: {
    justifyContent: "center",
    gap: ds.spacing[1],
    zIndex: 1,
  },
  footerSliderTitle: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.subtitle,
  },
  footerSliderSubtitle: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.labelMedium,
  },
  footerSliderChevrons: {
    position: "absolute",
    right: 20,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[1],
    opacity: 0.4,
  },
  checkInText: {
    color: vibesTheme.colors.surface,
    ...ds.textStyles.heading,
    textAlign: "center",
  },
  floatingChatButton: {
    alignSelf: "flex-end",
    width: 60,
    height: 60,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.primaryText,
    ...ds.shadows.sm,
  },
  chatRow: {
    borderRadius: ds.radii.xl,
    backgroundColor: ds.colors.base.inkSoft,
    borderWidth: 2,
    borderColor: ds.withAlpha(ds.colors.base.paper, ds.opacity.medium),
    padding: ds.spacing[4],
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
  },
  chatIconWrap: {
    width: 44,
    height: 44,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.withAlpha(ds.colors.base.paper, ds.opacity.soft),
  },
  chatCopy: {
    flex: 1,
  },
  chatTitle: {
    color: vibesTheme.colors.background,
    ...ds.textStyles.heading,
  },
  chatSubtitle: {
    marginTop: ds.spacing[1],
    color: ds.withAlpha(ds.colors.base.paper, ds.opacity.higher),
    ...ds.textStyles.labelMedium,
  },
  menuSheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: ds.radii.xl,
    borderTopRightRadius: ds.radii.xl,
    paddingHorizontal: ds.spacing[6],
    paddingTop: ds.spacing[3],
    paddingBottom: ds.spacing[8],
  },
  completionShareBadge: {
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.accentMustard,
    marginBottom: ds.spacing[4],
  },
  completionShareTitle: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.title,
    textAlign: "center",
  },
  completionShareBody: {
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.body,
    textAlign: "center",
    marginTop: ds.spacing[2],
    marginBottom: ds.spacing[6],
  },
  completionSharePrimary: {
    minHeight: 54,
    borderRadius: vibesTheme.radii.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ds.spacing[3],
    backgroundColor: vibesTheme.colors.primaryText,
  },
  completionSharePrimaryText: {
    color: vibesTheme.colors.background,
    ...ds.textStyles.subtitle,
  },
  completionShareSecondary: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: ds.spacing[2],
  },
  completionShareSecondaryText: {
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.subtitleMedium,
  },
  menuHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.colors.border.default,
    marginBottom: ds.spacing[4],
  },
  menuTitle: {
    color: palette.text,
    ...ds.textStyles.title,
    marginBottom: ds.spacing[3],
  },
  menuItem: {
    minHeight: 54,
    borderRadius: ds.radii.lg,
    paddingHorizontal: ds.spacing[4],
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
    backgroundColor: ds.withAlpha(ds.colors.base.paper, ds.opacity.higher),
    marginTop: ds.spacing[3],
  },
  menuItemDanger: {
    backgroundColor: palette.redSoft,
  },
  menuItemText: {
    color: palette.text,
    ...ds.textStyles.subtitleMedium,
  },
  menuItemTextDanger: {
    color: palette.red,
  },
  sharePreparingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: ds.shadows.lg.elevation,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.colors.bg.subtle,
  },
  sharePreparingCard: {
    minWidth: 230,
    minHeight: 78,
    borderRadius: ds.radii.xl,
    paddingHorizontal: ds.spacing[5],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ds.spacing[3],
    backgroundColor: vibesTheme.colors.background,
    borderWidth: 1,
    borderColor: ds.colors.border.subtle,
    ...ds.shadows.md,
  },
  sharePreparingText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.subtitleMedium,
  },
});

export default ChallengeDetailScreen;
