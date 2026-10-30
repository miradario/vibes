import EventOccurrenceList from "../components/EventOccurrenceList";
import BackButton from "../components/BackButton";
import Tag from "../components/ui/Tag";
import { normalizeSchedule } from "../src/lib/eventSchedule";
import { useLocalDay } from "../src/hooks/useLocalDay";
import { usePublicContentBack } from "../src/hooks/usePublicContentBack";
import { resolvePublicContentRoute } from "../src/lib/publicContentRoute";
import { getChallengeDay, completedChallengeDays, getChallengeStreaks } from "../src/lib/challengeProgress";
import MediaImage from "../components/MediaImage";
import { getEventCategoryLabel, getEventParticipationLabel } from "../src/constants/eventClassification";
/** @format */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Modal,
  FlatList,
  Linking,
  Platform,
  Animated,
  PanResponder,
  useWindowDimensions,
} from "react-native";
import { Text, TextInput } from "../components/Typography";
import { StackActions, useNavigation, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ExpoLocation from "expo-location";
import styles, {
  TEXT_SECONDARY,
  PRIMARY_COLOR,
  WHITE,
  DARK_GRAY,
} from "../assets/styles";
import Icon from "../components/Icon";
import AppHeader from "../components/AppHeader";
import Avatar from "../components/Avatar";
import AvatarGroup from "../components/AvatarGroup";
import VibesLoader from "../components/VibesLoader";
import DeepLinkLoadingState from "../components/DeepLinkLoadingState";
import AnimatedSheetModal from "../components/AnimatedSheetModal";
import EventInviteSheet from "../components/EventInviteSheet";
import UserProfileSheet from "../components/UserProfileSheet";
import ChallengeTreeProgress from "../components/ChallengeTreeProgress";
import ScreenContainer from "../components/ScreenContainer";
import { useAuthSession } from "../src/auth/auth.queries";
import { useI18n } from "../src/i18n";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { mapCandidateToConnectionProfile } from "../src/lib/connectionProfiles";
import { useSwipeMutation } from "../src/queries/swipes.mutations";
import { useFindMatchQuery } from "../src/queries/matches.queries";
import { handleApiError } from "../src/utils/handleApiError";
import {
  useChallengeParticipantQuery,
  useChallengeCheckinsQuery,
  useJoinChallengeMutation,
  useCheckInChallengeMutation,
  useLeaveChallengeMutation,
  useDeleteChallengeMutation,
  useDeleteEventMutation,
  useIsEventParticipantQuery,
  useJoinEventMutation,
  useChallengeParticipantsQuery,
  useEventParticipantsQuery,
  fetchEventFeedItemById,
  type EventFeedItem,
} from "../src/queries/events.queries";
import {
  extractChallengePresetFromDescription,
  getChallengeMediaPreset,
  parseChallengeMediaPreset,
} from "../src/constants/challengeMediaPresets";
import { vibesTheme } from "../src/theme/vibesTheme";
import { getGoogleMapsClientConfig } from "../src/config/googleMaps";
import { getIosMapPreviewSource } from "../src/config/mapPreview";
import { shareEventInvite } from "../src/lib/socialShare";
import { promptForPublicContentAuth } from "../src/lib/publicContentAuth";
import { markFtuxAction } from "../src/ftux/ftuxStore";
import ProgressBar from "../components/ui/ProgressBar";
import { swipeToConfirmMetrics, swipeToConfirmTrackStyle } from "../components/ui/SwipeToConfirm";
import DayPill from "../components/ui/DayPill";
import OverlayBadge, { overlayBadgeContentColor } from "../components/ui/OverlayBadge";
import { cardStyles, iconButtonFloating, iconButtonFloatingIconColor } from "../components/ui/surfaceStyles";
import * as ds from "../src/theme/tokens";

const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 90];
const CHECKIN_SWIPE = swipeToConfirmMetrics("lg");
const FOOTER_CHECKIN_SWIPE = swipeToConfirmMetrics("md");
const CHECKIN_SLIDER_HANDLE_SIZE = CHECKIN_SWIPE.thumb;
const CHECKIN_SLIDER_HORIZONTAL_PADDING = CHECKIN_SWIPE.inset;
const FOOTER_CHECKIN_SLIDER_HANDLE_SIZE = FOOTER_CHECKIN_SWIPE.thumb;
const FOOTER_CHECKIN_SLIDER_HORIZONTAL_PADDING = FOOTER_CHECKIN_SWIPE.inset;

const getStreakEmoji = (streak: number) => {
  if (streak >= 30) return "🔥🔥🔥";
  if (streak >= 14) return "🔥🔥";
  if (streak >= 3) return "🔥";
  return "✨";
};

const getStreakMessage = (streak: number, totalCheckins: number) => {
  if (streak === 0 && totalCheckins > 0) {
    return "Tu práctica sigue viva. Cada presencia suma a tu proceso.";
  }
  if (streak === 0) return "¡Hacé tu primer check-in!";
  if (streak === 1) return "¡Arrancaste! Mantené la racha";
  if (streak < 3) return `${streak} días seguidos, ¡vas bien!`;
  if (streak < 7) return `${streak} días seguidos ¡Fuego!`;
  if (streak < 14) return `${streak} días 🔥 ¡Imparable!`;
  if (streak < 21) return `${streak} días 🔥🔥 ¡Leyenda!`;
  return `${streak} días 🔥🔥🔥 ¡MAESTRO!`;
};

const getChallengeFinishedMessage = () =>
  "Desafío terminó. Iniciá otro si lo deseás.";

const nextMilestone = (streak: number) => {
  return STREAK_MILESTONES.find((m) => m > streak) ?? null;
};

const getMilestoneMessage = (streak: number, milestone: number | null) => {
  if (!milestone) return "Ya alcanzaste todas las metas. 🏆";

  const remainingDays = Math.max(milestone - streak, 0);
  const dayLabel = remainingDays === 1 ? "día" : "días";

  if (streak === 0) {
    return `Primera meta: ${milestone} días seguidos.`;
  }

  return `Te faltan ${remainingDays} ${dayLabel} para llegar a ${milestone} días seguidos.`;
};

const getStreakHeadline = (
  streak: number,
  totalCheckins: number,
  startDate?: Date | null,
  referenceDate?: Date,
  isFinished?: boolean,
) => {
  if (isFinished) return "Desafío terminó";
  if (streak === 0 && totalCheckins > 0) return "Tu práctica sigue viva";
  if (streak === 0) {
    if (startDate && referenceDate && isAfterDay(startDate, referenceDate)) {
      return "Empieza pronto";
    }

    if (startDate && referenceDate && isBeforeDay(startDate, referenceDate)) {
      return "Todavía no arrancaste";
    }

    return "Hoy empieza";
  }
  if (streak === 1) return "1 día";
  return `${streak} días`;
};

const getTotalCheckinsLabel = (totalCheckins: number) => {
  if (totalCheckins === 1) return "check-in";
  return "check-ins";
};

const getCheckInModalMessage = (streak: number, totalCheckins: number) => {
  if (streak === 0 && totalCheckins > 0) {
    return "Tu práctica sigue viva. Cada vez que volvés, también cuenta.";
  }
  return `Racha actual: ${streak} días · si hacés el check-in de hoy, pasás a ${streak + 1}.`;
};

const formatStartDate = (iso?: string | null) => {
  if (!iso) return "Sin fecha de inicio";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Sin fecha de inicio";
  return date.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatDayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isBeforeDay = (left: Date, right: Date) => formatDayKey(left) < formatDayKey(right);
const isAfterDay = (left: Date, right: Date) => formatDayKey(left) > formatDayKey(right);

const getStaticMapPreviewUrl = (location: string, apiKey: string) =>
  `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(location)}&zoom=15&size=900x320&scale=2&maptype=roadmap&markers=color:red%7C${encodeURIComponent(location)}&key=${apiKey}`;

const isVideoMedia = (value: unknown) => {
  if (typeof value !== "string") return false;
  const normalized = value.split("?")[0].toLowerCase();
  return [".mp4", ".mov", ".m4v", ".webm"].some((ext) =>
    normalized.endsWith(ext),
  );
};

const EventDetail = () => {
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const route = useRoute<any>();
  useLocalDay();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const routeEvent = route.params?.event as EventFeedItem | undefined;
  const { id: eventId, inlineEvent } = resolvePublicContentRoute(route.params?.eventId, routeEvent);
  const {
    data: linkedEvent,
    isPending: linkedEventPending,
    isError: linkedEventError,
    fetchStatus: linkedEventFetchStatus,
    refetch: refetchLinkedEvent,
  } = useQuery({
    queryKey: ["event_deep_link", eventId],
    queryFn: () => fetchEventFeedItemById(eventId as string, "event"),
    enabled: Boolean(eventId),
    staleTime: 60_000,
  });
  const event = linkedEvent ?? inlineEvent;
  const isChallenge = event?.type === "challenge";

  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const handleBack = usePublicContentBack(Boolean(userId));
  const { data: currentUserProfile } = useProfileQuery(userId);
  const swipeMutation = useSwipeMutation();

  const { data: participant, isLoading: participantLoading } =
    useChallengeParticipantQuery(isChallenge ? event?.id : undefined, userId);
  const { data: challengeCheckins = [] } = useChallengeCheckinsQuery(
    isChallenge ? event?.id : undefined,
    userId,
  );
  useEffect(() => {
    // Ticks "Mirar los próximos eventos" in Vibi's first steps checklist.
    if (event?.id && !isChallenge) void markFtuxAction(userId, "openedEvent");
  }, [event?.id, isChallenge, userId]);
  const joinMutation = useJoinChallengeMutation();
  const checkInMutation = useCheckInChallengeMutation();
  const leaveMutation = useLeaveChallengeMutation();
  const deleteMutation = useDeleteChallengeMutation();
  const deleteEventMutation = useDeleteEventMutation();

  const { data: isEventParticipant } = useIsEventParticipantQuery(
    !isChallenge ? event?.id : undefined,
    userId,
  );
  const joinEventMutation = useJoinEventMutation();

  const { data: challengeParticipants = [] } = useChallengeParticipantsQuery(
    userId && isChallenge ? event?.id : undefined,
  );
  const { data: eventParticipants = [] } = useEventParticipantsQuery(
    userId ? event?.id : undefined,
  );

  const isAdmin = Boolean(
    userId && event?.createdBy && userId === event.createdBy,
  );
  const challengeParticipantsMerged = Array.from(
    new Map(
      [...challengeParticipants, ...eventParticipants].map((item) => [
        item.userId,
        item,
      ]),
    ).values(),
  );
  const hasAdminInParticipants = Boolean(
    event?.createdBy &&
      eventParticipants.some((item) => item.userId === event.createdBy),
  );
  const eventParticipantsWithAdmin =
    !isChallenge && event?.createdBy && !hasAdminInParticipants
      ? [
          {
            id: `admin-${event.createdBy}`,
            userId: event.createdBy,
            joinedAt: event?.createdAt ?? event?.startsAt ?? new Date().toISOString(),
            displayName: event?.hostName ?? "Organizador",
            avatarUrl: typeof event?.hostImage === "string" ? event.hostImage : null,
          },
          ...eventParticipants,
        ]
      : eventParticipants;
  const isEventJoined = Boolean(isEventParticipant || isAdmin);
  const currentUserAvatarUrl = Array.isArray(currentUserProfile?.photos)
    ? (currentUserProfile.photos.find((photo: any) => {
        if (typeof photo === "string") return photo.trim().length > 0;
        return typeof photo?.url === "string" && photo.url.trim().length > 0;
      }) as any)
    : null;
  const currentUserAvatarUri =
    typeof currentUserAvatarUrl === "string"
      ? currentUserAvatarUrl
      : typeof currentUserAvatarUrl?.url === "string"
        ? currentUserAvatarUrl.url
        : null;
  const currentUserDisplayName =
    typeof currentUserProfile?.displayName === "string"
      ? currentUserProfile.displayName
      : null;
  const hasCurrentUserInEventParticipants = Boolean(
    userId && eventParticipantsWithAdmin.some((item) => item.userId === userId),
  );
  const currentUserEventParticipant =
    !isChallenge && isEventJoined && userId && !hasCurrentUserInEventParticipants
      ? {
          id: `current-${userId}`,
          userId,
          joinedAt: new Date().toISOString(),
          displayName: currentUserDisplayName,
          avatarUrl: currentUserAvatarUri,
        }
      : null;
  const eventParticipantsWithCurrentUser = (
    currentUserEventParticipant
      ? [currentUserEventParticipant, ...eventParticipantsWithAdmin]
      : eventParticipantsWithAdmin
  )
    .map((item) =>
      userId && item.userId === userId
        ? {
            ...item,
            displayName: item.displayName ?? currentUserDisplayName,
            avatarUrl: item.avatarUrl ?? currentUserAvatarUri,
          }
        : item,
    )
    .sort((a, b) => {
      if (!userId) return 0;
      if (a.userId === userId) return -1;
      if (b.userId === userId) return 1;
      return 0;
    });

  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [checkInNote, setCheckInNote] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [participantsVisible, setParticipantsVisible] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  useEffect(() => {
    setMenuVisible(false);
    setParticipantsVisible(false);
    setInviteVisible(false);
    setCheckInModalVisible(false);
  }, [eventId]);
  const [eventMapPreviewFailed, setEventMapPreviewFailed] = useState(false);
  const [geocodedMapPreview, setGeocodedMapPreview] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedProgressDay, setSelectedProgressDay] = useState<string | null>(
    null,
  );
  const [pendingParticipant, setPendingParticipant] = useState<{
    userId: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<{
    userId: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null>(null);
  const { data: selectedParticipantProfile } = useProfileQuery(
    selectedParticipant?.userId,
  );
  const { data: selectedParticipantPreferences } = useUserPreferencesQuery(
    selectedParticipant?.userId,
  );
  const selectedParticipantMatchQuery = useFindMatchQuery(
    selectedParticipant?.userId,
  );

  const isJoined = Boolean(participant);
  const durationDays =
    typeof event?.durationDays === "number" && event.durationDays > 0
      ? event.durationDays
      : 21;
  const challengeStartDate = formatStartDate(
    event?.startsAt ?? event?.createdAt,
  );
  const normalizedPresetId =
    getChallengeMediaPreset(event?.imagePresetId ?? null)?.id ??
    parseChallengeMediaPreset(event?.imageUrl) ??
    extractChallengePresetFromDescription(event?.description);
  const defaultEventPreset = getChallengeMediaPreset("events");
  const selectedEventPreset = getChallengeMediaPreset(
    normalizedPresetId ?? (!isChallenge ? "events" : null),
  );
  const todayDate = new Date();
  const todayKey = formatDayKey(todayDate);
  const startDate = event?.startsAt ?? event?.createdAt;
  const parsedStartDate = startDate ? new Date(startDate) : null;
  const validStartDate =
    parsedStartDate && !Number.isNaN(parsedStartDate.getTime())
      ? parsedStartDate
      : null;
  const challengeEndDate = validStartDate
    ? new Date(
        validStartDate.getFullYear(),
        validStartDate.getMonth(),
        validStartDate.getDate() + Math.max(durationDays - 1, 0),
      )
    : null;
  const isChallengeFinished = Boolean(
    isChallenge &&
      challengeEndDate &&
      isBeforeDay(challengeEndDate, todayDate),
  );
  const checkinSet = new Set(challengeCheckins);
  const participantCount = challengeParticipantsMerged.length;
  const visibleParticipants = isChallenge
    ? challengeParticipantsMerged
    : eventParticipantsWithCurrentUser;
  const publicParticipantCount =
    (event?.participantCount ?? Number.parseInt(event?.attendees ?? "", 10)) || 0;
  const visibleParticipantCount = userId
    ? visibleParticipants.length
    : publicParticipantCount;
  const totalCheckins = Math.max(
    participant?.totalCheckins ?? 0,
    challengeCheckins.length,
  );
  const checkedInToday =
    Boolean(participant?.checkedInToday) || checkinSet.has(todayKey);
  const { streak } = getChallengeStreaks(
    completedChallengeDays(challengeCheckins, event?.startsAt, durationDays),
    getChallengeDay(event?.startsAt), durationDays,
  );
  const milestone = nextMilestone(streak);
  const treeProgress = Math.min(streak / durationDays, 1);
  const showTreeProgress = streak > 0;
  const customEventImageSource =
    typeof event?.imageUrl === "string" &&
    event.imageUrl.trim() &&
    !parseChallengeMediaPreset(event.imageUrl) &&
    !isVideoMedia(event.imageUrl)
      ? { uri: event.imageUrl.trim() }
      : typeof event?.image === "string" &&
          event.image.trim() &&
          !parseChallengeMediaPreset(event.image) &&
          !isVideoMedia(event.image)
        ? { uri: event.image.trim() }
        : null;
  const eventHeroImageSource =
    customEventImageSource ||
    selectedEventPreset?.image ||
    defaultEventPreset?.image ||
    null;
  const selectedParticipantCard = selectedParticipant
    ? mapCandidateToConnectionProfile({
        id: selectedParticipant.userId,
        displayName:
          selectedParticipantProfile?.displayName ??
          selectedParticipant.displayName ??
          "Participante",
        ...(selectedParticipantProfile ?? {}),
        ...(selectedParticipantPreferences ?? {}),
        photos:
          selectedParticipantProfile?.photos ??
          (selectedParticipant.avatarUrl ? [selectedParticipant.avatarUrl] : []),
      })
    : null;
  const canConnectSelectedParticipant = Boolean(
    selectedParticipant &&
      selectedParticipant.userId !== userId &&
      selectedParticipantMatchQuery.isFetched &&
      !selectedParticipantMatchQuery.data
  );
  const handleConnectParticipant = () => {
    if (!selectedParticipant || !selectedParticipantCard) return;
    if (selectedParticipant.userId === userId) {
      setSelectedParticipant(null);
      return;
    }
    const participantCard = selectedParticipantCard;
    setSelectedParticipant(null);

    swipeMutation.mutate(
      {
        targetUserId: String(selectedParticipant.userId),
        direction: "like",
      },
      {
        onSuccess: (response) => {
          if (response?.match) {
            navigation.navigate(
              "Match" as never,
              { profile: participantCard } as never,
            );
          }
        },
        onError: (error) =>
          handleApiError(error, { toastTitle: "Error de conexión" }),
      },
    );
  };

  const handleParticipantsSheetClosed = () => {
    if (!pendingParticipant) return;
    setSelectedParticipant(pendingParticipant);
    setPendingParticipant(null);
  };

  const progressDays = Array.from(
    { length: durationDays },
    (_, index) => index + 1,
  );
  const sliderTranslateX = useRef(new Animated.Value(0)).current;
  const [sliderWidth, setSliderWidth] = useState(0);
  const sliderMaxTranslate = Math.max(
    sliderWidth - CHECKIN_SLIDER_HANDLE_SIZE - CHECKIN_SLIDER_HORIZONTAL_PADDING * 2,
    0,
  );
  const footerSliderTranslateX = useRef(new Animated.Value(0)).current;
  const [footerSliderWidth, setFooterSliderWidth] = useState(0);
  const footerSliderMaxTranslate = Math.max(
    footerSliderWidth -
      FOOTER_CHECKIN_SLIDER_HANDLE_SIZE -
      FOOTER_CHECKIN_SLIDER_HORIZONTAL_PADDING * 2,
    0,
  );

  const resetCheckInSlider = () => {
    sliderTranslateX.stopAnimation();
    sliderTranslateX.setValue(0);
    footerSliderTranslateX.stopAnimation();
    footerSliderTranslateX.setValue(0);
  };

  useEffect(() => {
    if (!checkInModalVisible) {
      resetCheckInSlider();
    }
  }, [checkInModalVisible]);

  const submitCheckInFromSlider = async () => {
    if (checkInMutation.isPending) return;
    try {
      await handleCheckIn();
    } finally {
      resetCheckInSlider();
    }
  };

  const checkInPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !checkInMutation.isPending &&
          !checkedInToday &&
          Math.abs(gestureState.dx) > 6,
        onPanResponderMove: (_, gestureState) => {
          const next = Math.max(0, Math.min(gestureState.dx, sliderMaxTranslate));
          sliderTranslateX.setValue(next);
        },
        onPanResponderRelease: (_, gestureState) => {
          const next = Math.max(0, Math.min(gestureState.dx, sliderMaxTranslate));
          const shouldComplete =
            sliderMaxTranslate > 0 && next >= sliderMaxTranslate * 0.72;

          Animated.spring(sliderTranslateX, {
            toValue: shouldComplete ? sliderMaxTranslate : 0,
            useNativeDriver: true,
            bounciness: shouldComplete ? 0 : 8,
            speed: 16,
          }).start(({ finished }) => {
            if (finished && shouldComplete) {
              void submitCheckInFromSlider();
            }
          });
        },
        onPanResponderTerminate: () => {
          Animated.spring(sliderTranslateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
            speed: 16,
          }).start();
        },
      }),
    [checkInMutation.isPending, checkedInToday, sliderMaxTranslate],
  );
  const footerCheckInPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !checkInMutation.isPending &&
          !checkedInToday &&
          Math.abs(gestureState.dx) > 6,
        onPanResponderMove: (_, gestureState) => {
          const next = Math.max(
            0,
            Math.min(gestureState.dx, footerSliderMaxTranslate),
          );
          footerSliderTranslateX.setValue(next);
        },
        onPanResponderRelease: (_, gestureState) => {
          const next = Math.max(
            0,
            Math.min(gestureState.dx, footerSliderMaxTranslate),
          );
          const shouldComplete =
            footerSliderMaxTranslate > 0 &&
            next >= footerSliderMaxTranslate * 0.72;

          Animated.spring(footerSliderTranslateX, {
            toValue: shouldComplete ? footerSliderMaxTranslate : 0,
            useNativeDriver: true,
            bounciness: shouldComplete ? 0 : 8,
            speed: 16,
          }).start(({ finished }) => {
            if (finished && shouldComplete) {
              void submitCheckInFromSlider();
            }
          });
        },
        onPanResponderTerminate: () => {
          Animated.spring(footerSliderTranslateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
            speed: 16,
          }).start();
        },
      }),
    [checkInMutation.isPending, checkedInToday, footerSliderMaxTranslate],
  );

  const renderInlineCheckInSlider = () => (
    <View
      style={localStyles.footerCheckInSliderWrap}
      onLayout={(event) => {
        setFooterSliderWidth(event.nativeEvent.layout.width);
      }}
    >
      <View style={localStyles.footerCheckInSliderTrack}>
        <View
          style={localStyles.footerCheckInSliderGlow}
          pointerEvents="none"
        />
        <View style={localStyles.footerCheckInSliderCopy}>
          <Text style={localStyles.footerCheckInSliderTitle}>
            Marcar desafío como hecho
          </Text>
          <Text style={localStyles.footerCheckInSliderSubtitle}>
            Deslizá para completar tu día
          </Text>
        </View>
        <View
          style={localStyles.footerCheckInSliderChevrons}
          pointerEvents="none"
        >
          <Icon name="chevron-forward" size={ds.iconSize.sm} color={vibesTheme.colors.accentMustard} />
          <Icon name="chevron-forward" size={ds.iconSize.sm} color={vibesTheme.colors.accentMustard} />
          <Icon name="chevron-forward" size={ds.iconSize.sm} color={vibesTheme.colors.accentMustard} />
        </View>
      </View>

      <Animated.View
        style={[
          localStyles.footerCheckInSliderHandle,
          {
            transform: [{ translateX: footerSliderTranslateX }],
          },
        ]}
        {...(!checkedInToday && !checkInMutation.isPending
          ? footerCheckInPanResponder.panHandlers
          : {})}
      >
        {checkInMutation.isPending ? (
          <VibesLoader />
        ) : (
          <Icon name="sunny-outline" size={ds.iconSize.lg} color={vibesTheme.colors.accentCoral} />
        )}
      </Animated.View>
    </View>
  );

  const renderBottomActions = () => {
    if (isChallenge) {
      if (isChallengeFinished) {
        if (isJoined) {
          return (
            <View style={localStyles.fixedFooterContent}>
              <View style={localStyles.challengeFooterButtonGroup}>
                <TouchableOpacity
                  style={localStyles.challengeChatButton}
                  onPress={() =>
                    navigation.navigate("EventChat" as never, { event } as never)
                  }
                >
                  <Icon name="chatbubbles-outline" size={ds.iconSize.md} color={DARK_GRAY} />
                  <Text style={localStyles.challengeChatButtonText}>
                    Entrar al chat del desafío
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[localStyles.checkInButton, localStyles.checkInButtonDisabled]}
                  disabled
                >
                  <Icon name="checkmark-circle" size={ds.iconSize.md} color={WHITE} />
                  <Text style={localStyles.checkInButtonText}>
                    Desafío finalizado
                  </Text>
                </TouchableOpacity>
              </View>
              <Text
                style={[styles.eventDetailJoinNote, localStyles.fixedFooterNote]}
              >
                {getChallengeFinishedMessage()}
              </Text>
            </View>
          );
        }

        return (
          <View style={localStyles.fixedFooterContent}>
            <View style={localStyles.challengeFooterButtonGroup}>
              <TouchableOpacity
                style={[
                  localStyles.challengeChatButton,
                  localStyles.challengeChatButtonDisabled,
                ]}
                disabled
              >
                <Icon name="chatbubbles-outline" size={ds.iconSize.md} color={vibesTheme.colors.secondaryText} />
                <Text
                  style={[
                    localStyles.challengeChatButtonText,
                    localStyles.challengeChatButtonTextDisabled,
                  ]}
                >
                  Chat del desafío
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[localStyles.checkInButton, localStyles.checkInButtonDisabled]}
                disabled
              >
                <Icon name="checkmark-circle" size={ds.iconSize.md} color={WHITE} />
                <Text style={localStyles.checkInButtonText}>
                  Desafío finalizado
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.eventDetailJoinNote, localStyles.fixedFooterNote]}>
              {getChallengeFinishedMessage()}
            </Text>
          </View>
        );
      }

      if (participantLoading) {
        return (
          <View style={localStyles.fixedFooterContent}>
            <View style={localStyles.challengeFooterButtonGroup}>
              <TouchableOpacity
                style={[
                  localStyles.challengeChatButton,
                  localStyles.challengeChatButtonDisabled,
                ]}
                disabled
              >
                <VibesLoader accessibilityLabel="Cargando chat" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[localStyles.checkInButton, localStyles.checkInButtonDisabled]}
                disabled
              >
                <VibesLoader />
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      if (isJoined) {
        return (
          <View style={localStyles.fixedFooterContent}>
            <View style={localStyles.challengeFooterButtonGroup}>
              <TouchableOpacity
                style={localStyles.challengeChatButton}
                onPress={() =>
                  navigation.navigate("EventChat" as never, { event } as never)
                }
              >
                <Icon name="chatbubbles-outline" size={ds.iconSize.md} color={DARK_GRAY} />
                <Text style={localStyles.challengeChatButtonText}>
                  Entrar al chat del desafío
                </Text>
              </TouchableOpacity>
              {checkedInToday ? (
                <TouchableOpacity
                  style={[
                    localStyles.checkInButton,
                    localStyles.checkInButtonDone,
                  ]}
                  disabled
                >
                  <Icon name="checkmark-circle" size={ds.iconSize.md} color={WHITE} />
                  <Text style={localStyles.checkInButtonText}>
                    Desafío hecho hoy
                  </Text>
                </TouchableOpacity>
              ) : (
                renderInlineCheckInSlider()
              )}
            </View>
          </View>
        );
      }

      return (
        <View style={localStyles.fixedFooterContent}>
          <View style={localStyles.challengeFooterButtonGroup}>
            <TouchableOpacity
              style={[
                localStyles.challengeChatButton,
                localStyles.challengeChatButtonDisabled,
              ]}
              disabled
            >
              <Icon name="chatbubbles-outline" size={ds.iconSize.md} color={vibesTheme.colors.secondaryText} />
              <Text
                style={[
                  localStyles.challengeChatButtonText,
                  localStyles.challengeChatButtonTextDisabled,
                ]}
              >
                Uníte para entrar al chat
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[localStyles.checkInButton, styles.eventDetailJoinButton]}
              onPress={handleJoin}
              disabled={joinMutation.isPending}
            >
              {joinMutation.isPending ? (
                <VibesLoader />
              ) : (
                <Text style={styles.eventDetailJoinButtonText}>
                  {userId ? "Sumarme al desafío" : "Registrarme para sumarme"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
          <Text
            style={[styles.eventDetailJoinNote, localStyles.fixedFooterNote]}
          >
            Al sumarte, empezás a trackear tu racha diaria.
          </Text>
        </View>
      );
    }

    if (isEventJoined) {
      return (
        <View style={localStyles.eventChatFooterContent}>
          <TouchableOpacity
            style={localStyles.eventFloatingChatButton}
            accessibilityRole="button"
            accessibilityLabel="Entrar al chat del evento"
            onPress={() =>
              navigation.navigate("EventChat" as never, { event } as never)
            }
            activeOpacity={ds.opacity.pressed}
          >
            <Icon name="chatbubble-outline" size={ds.iconSize.lg} color={iconButtonFloatingIconColor} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View
        style={[
          localStyles.fixedFooterContent,
          localStyles.eventFixedFooterContent,
        ]}
      >
        <TouchableOpacity
          style={[styles.eventDetailJoinButton, localStyles.footerActionButton]}
          onPress={async () => {
            if (!event) return;
            if (!userId) {
              promptForPublicContentAuth(navigation as any, "evento");
              return;
            }
            try {
              await joinEventMutation.mutateAsync({
                eventId: event.id,
                eventType: "event",
                userId,
              });
              navigation.navigate("EventChat" as never, { event } as never);
            } catch (error: any) {
              const message = error?.message?.includes("unique")
                ? "Ya estás en este evento."
                : error?.message ?? "No se pudo unir al evento.";
              Alert.alert("Error", message);
            }
          }}
          disabled={joinEventMutation.isPending}
        >
          {joinEventMutation.isPending ? (
            <VibesLoader />
          ) : (
            <>
              <Text
                style={[styles.eventDetailJoinButtonText, localStyles.footerActionText, localStyles.joinEventText]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {userId ? "Unirse al evento" : "Registrarme para unirme"}
              </Text>
              <Icon name="arrow-forward" size={ds.iconSize.lg} color={WHITE} />
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const eventDescription =
    typeof event?.description === "string" && event.description.trim()
      ? event.description.trim()
      : typeof event?.subtitle === "string" && event.subtitle.trim()
      ? event.subtitle.trim()
      : null;
  const eventLocation =
    typeof event?.location === "string" && event.location.trim()
      ? event.location.trim()
      : null;
  const eventLocationLatitude =
    typeof event?.locationLatitude === "number" ? event.locationLatitude : null;
  const eventLocationLongitude =
    typeof event?.locationLongitude === "number" ? event.locationLongitude : null;
  const eventPreviewLatitude = eventLocationLatitude ?? geocodedMapPreview?.latitude ?? null;
  const eventPreviewLongitude = eventLocationLongitude ?? geocodedMapPreview?.longitude ?? null;
  const eventMapQuery =
    eventLocationLatitude !== null && eventLocationLongitude !== null
      ? `${eventLocationLatitude},${eventLocationLongitude}`
      : eventLocation;
  const eventLink =
    typeof event?.eventLink === "string" && event.eventLink.trim()
      ? event.eventLink.trim()
      : null;
  const pricingType = event?.pricingType === "paid" ? "paid" : "free";
  const paymentLink =
    typeof event?.paymentLink === "string" && event.paymentLink.trim()
      ? event.paymentLink.trim()
      : null;
  const modality = event?.modality === "online" ? "online" : "in_person";
  const onlineLink =
    typeof event?.onlineLink === "string" && event.onlineLink.trim()
      ? event.onlineLink.trim()
      : null;
  const eventTags = Array.isArray(event?.tags)
    ? event.tags.filter(
        (tag: unknown): tag is string =>
          typeof tag === "string" && tag.trim().length > 0,
      )
    : [];
  const eventSubtitle =
    typeof event?.subtitle === "string" && event.subtitle.trim()
      ? event.subtitle.trim()
      : "Entrá a un espacio sereno para compartir presencia y conexión.";
  const modalityLabel = modality === "online" ? "Online" : "Presencial";
  const pricingLabel = pricingType === "paid" ? "Pago" : "Gratis";
  const googleMapsConfig = getGoogleMapsClientConfig();
  const googleMapsApiKey = googleMapsConfig.apiKey;
  const hasEventPreviewCoordinates =
    eventPreviewLatitude !== null && eventPreviewLongitude !== null;
  const eventMapPreviewUri = googleMapsApiKey && eventMapQuery
    ? getStaticMapPreviewUrl(
        hasEventPreviewCoordinates
          ? `${eventPreviewLatitude},${eventPreviewLongitude}`
          : eventMapQuery,
        googleMapsApiKey,
      )
    : null;
  // iOS: preview vía la función map-preview (Android sigue igual).
  const iosEventMapPreviewSource = eventMapQuery
    ? getIosMapPreviewSource(
        hasEventPreviewCoordinates
          ? { latitude: eventPreviewLatitude, longitude: eventPreviewLongitude }
          : { query: eventMapQuery },
        session?.access_token,
        { width: 640, height: 320 },
      )
    : null;
  const eventMapPreviewSource =
    iosEventMapPreviewSource ??
    (eventMapPreviewUri
      ? { uri: eventMapPreviewUri, headers: googleMapsConfig.headers }
      : null);

  useEffect(() => {
    let isMounted = true;

    if (
      isChallenge ||
      !eventLocation ||
      eventLocationLatitude !== null ||
      eventLocationLongitude !== null
    ) {
      setGeocodedMapPreview(null);
      return;
    }

    const geocodeWithExpo = () =>
      ExpoLocation.geocodeAsync(eventLocation)
        .then((matches) => {
          const firstMatch = matches[0];
          if (!isMounted || !firstMatch) return;
          setGeocodedMapPreview({
            latitude: firstMatch.latitude,
            longitude: firstMatch.longitude,
          });
          setEventMapPreviewFailed(false);
        })
        .catch((error) => {
          console.log("eventDetail:mapPreviewGeocode:error", error);
        });

    if (googleMapsApiKey) {
      fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(eventLocation)}&key=${googleMapsApiKey}`,
        { headers: googleMapsConfig.headers },
      )
        .then((response) => response.json())
        .then((data) => {
          const location = data?.results?.[0]?.geometry?.location;
          if (
            !isMounted ||
            typeof location?.lat !== "number" ||
            typeof location?.lng !== "number"
          ) {
            void geocodeWithExpo();
            return;
          }
          setGeocodedMapPreview({
            latitude: location.lat,
            longitude: location.lng,
          });
          setEventMapPreviewFailed(false);
        })
        .catch(() => {
          void geocodeWithExpo();
        });
    } else {
      void geocodeWithExpo();
    }

    return () => {
      isMounted = false;
    };
  }, [
    eventLocation,
    eventLocationLatitude,
    eventLocationLongitude,
    isChallenge,
  ]);

  if (!event) return null;

  const getExternalUrl = (value: string) =>
    /^https?:\/\//i.test(value) ? value : `https://${value}`;

  const getExternalUrlLabel = (value: string, fallback: string) => {
    try {
      const parsed = new URL(getExternalUrl(value));
      return parsed.hostname.replace(/^www\./i, "") || fallback;
    } catch {
      return fallback;
    }
  };

  const handleOpenExternalLink = async (
    url: string | null,
    errorTitle: string,
    errorMessage: string,
  ) => {
    if (!url) {
      Alert.alert(errorTitle, errorMessage);
      return;
    }

    const target = getExternalUrl(url);

    try {
      const supported = await Linking.canOpenURL(target);
      if (!supported) {
        Alert.alert(errorTitle, errorMessage);
        return;
      }
      await Linking.openURL(target);
    } catch {
      Alert.alert(errorTitle, errorMessage);
    }
  };

  const handleOpenCalendar = async (sessionStart?: string) => {
    const baseDate = sessionStart ? new Date(sessionStart) : validStartDate ?? todayDate;
    const start = new Date(baseDate);
    const occurrence = !isChallenge ? normalizeSchedule(event.schedule, event.startsAt).find(entry => Date.parse(entry.startsAt) === start.getTime()) : null;
    const end = new Date(occurrence?.endsAt ?? baseDate);
    const isAllDayChallenge = isChallenge;

    if (isAllDayChallenge) {
      end.setDate(end.getDate() + Math.max(durationDays, 1));
    } else if (!occurrence?.endsAt) {
      end.setHours(end.getHours() + 1);
    }

    const formatCalendarDate = (value: Date, allDay: boolean) => {
      if (allDay) {
        const year = value.getFullYear();
        const month = `${value.getMonth() + 1}`.padStart(2, "0");
        const day = `${value.getDate()}`.padStart(2, "0");
        return `${year}${month}${day}`;
      }

      return value.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const title = event?.title ?? (isChallenge ? "Desafío" : "Evento");
    const details = eventDescription ?? eventSubtitle ?? "";
    const location = isChallenge ? "" : eventLocation ?? "";
    const calendarPath =
      `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(title)}` +
      `&dates=${formatCalendarDate(start, isAllDayChallenge)}/${formatCalendarDate(end, isAllDayChallenge)}` +
      `&details=${encodeURIComponent(details)}` +
      `&location=${encodeURIComponent(location)}`;
    const fallbackCalendarPath = calendarPath.replace(
      "https://calendar.google.com/calendar/render",
      "https://www.google.com/calendar/render",
    );

    try {
      // Android can report false for valid HTTPS URLs when the target app is not
      // declared in manifest queries. Opening the universal URL directly lets the
      // system choose Google Calendar or the browser.
      await Linking.openURL(calendarPath);
    } catch {
      try {
        await Linking.openURL(fallbackCalendarPath);
      } catch {
        Alert.alert("Calendario", "No se pudo abrir el calendario.");
      }
    }
  };

  const handleOpenMap = async () => {
    const location = eventLocation;

    if (!location) {
      Alert.alert("Mapa", "Este evento no tiene una ubicación definida.");
      return;
    }

    const encodedLocation = encodeURIComponent(eventMapQuery ?? location);
    const candidateUrls =
      Platform.OS === "ios"
        ? [
            `comgooglemaps://?q=${encodedLocation}`,
            `maps://?q=${encodedLocation}`,
            `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`,
          ]
        : [
            `geo:0,0?q=${encodedLocation}`,
            `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`,
          ];

    for (const url of candidateUrls) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        continue;
      }
    }

    Alert.alert("Mapa", "No se pudo abrir el mapa.");
  };

  const handleJoin = async () => {
    if (!userId) {
      promptForPublicContentAuth(navigation as any, "desafío");
      return;
    }
    try {
      await joinMutation.mutateAsync({ challengeId: event.id, userId });
    } catch (error: any) {
      const message = error?.message?.includes("unique")
        ? "Ya estás en este desafío."
        : error?.message ?? "No se pudo unir al desafío.";
      Alert.alert("Error", message);
    }
  };

  const handleLeave = () => {
    if (!userId) return;
    Alert.alert(
      "Salir del desafío",
      "¿Seguro que querés salir? Perdés tu racha y progreso.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Salir",
          style: "destructive",
          onPress: async () => {
            setMenuVisible(false);
            try {
              await leaveMutation.mutateAsync({
                challengeId: event.id,
                userId,
              });
              handleBack();
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.message ?? "No se pudo salir del desafío.",
              );
            }
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Eliminar desafío",
      "¿Eliminar este desafío para todos? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setMenuVisible(false);
            try {
              await deleteMutation.mutateAsync({ challengeId: event.id });
              handleBack();
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.message ?? "No se pudo eliminar el desafío.",
              );
            }
          },
        },
      ],
    );
  };

  const handleDeleteEvent = () => {
    Alert.alert(
      "Eliminar evento",
      "¿Eliminar este evento para todos? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setMenuVisible(false);
            try {
              await deleteEventMutation.mutateAsync({ eventId: event.id });
              navigation.navigate(
                "Tab" as never,
                { screen: "Events", params: { section: "event" } } as never,
              );
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.message ?? "No se pudo eliminar el evento.",
              );
            }
          },
        },
      ],
    );
  };

  const handleEditEvent = () => {
    setMenuVisible(false);
    navigation.dispatch(StackActions.push("CreateEvent", { event }));
  };

  const handleCheckIn = async () => {
    if (!userId) return;
    try {
      await checkInMutation.mutateAsync({
        challengeId: event.id,
        userId,
        note: checkInNote.trim() || undefined,
      });
      setCheckInNote("");
      setCheckInModalVisible(false);
    } catch (error: any) {
      const message = error?.message?.includes("unique")
        ? "Ya hiciste check-in hoy. ¡Volvé mañana!"
        : error?.message ?? "No se pudo registrar el check-in.";
      Alert.alert("Error", message);
    }
  };

  const handleShareEvent = async () => {
    if (!event || event.type !== "event") return;
    try {
      await shareEventInvite(event);
    } catch {
      Alert.alert("Compartir", "No pudimos compartir este evento.");
    }
  };

  if (!event && eventId && linkedEventPending) {
    return (
      <DeepLinkLoadingState
        target="event"
        offline={linkedEventFetchStatus === "paused"}
        onRetry={() => void refetchLinkedEvent()}
        onExit={handleBack}
      />
    );
  }

  if (!event && eventId && linkedEventError) {
    return (
      <DeepLinkLoadingState
        target="event"
        state="error"
        onRetry={() => void refetchLinkedEvent()}
        onExit={handleBack}
      />
    );
  }

  if (!event) {
    return (
      <ScreenContainer style={localStyles.publicStateScreen}>
        <Text style={localStyles.publicStateTitle}>
          No encontramos este evento
        </Text>
        <TouchableOpacity
          style={localStyles.publicStateButton}
          onPress={() => handleBack()}
        >
          <Text style={localStyles.publicStateButtonText}>Volver</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  return (
    <View
      style={[
        styles.eventDetailContainer,
        !isChallenge && localStyles.eventDetailWarmBackground,
        isChallenge && localStyles.challengeWhiteBackground,
      ]}
    >
      {!isChallenge ? (
        <View style={{ paddingTop: insets.top, backgroundColor: vibesTheme.colors.surface }}>
          <AppHeader title="Evento" showBack onBack={handleBack}
            titleStyle={{ ...ds.textStyles.heading }}
            right={<View style={localStyles.headerActions}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Compartir evento" onPress={() => void handleShareEvent()} style={localStyles.referenceHeaderAction}>
                <Icon name="share-outline" size={ds.iconSize.lg} color={vibesTheme.colors.primaryText} />
              </TouchableOpacity>
              {isAdmin ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Opciones del evento" onPress={() => setMenuVisible(true)} style={localStyles.referenceHeaderAction}><Icon name="ellipsis-horizontal" size={ds.iconSize.lg} color={vibesTheme.colors.primaryText} /></TouchableOpacity> : null}
            </View>} />
        </View>
      ) : (
        <AppHeader
          title={undefined}
          showBack
          onBack={() => handleBack()}
          style={[
            styles.eventDetailHeader,
            localStyles.persistentHeader,
            { top: Math.max(insets.top + 10, 24) },
          ]}
          right={isJoined || isAdmin ? (
            <View style={localStyles.headerActions}>
              <TouchableOpacity
                style={styles.eventDetailMenuButton}
                onPress={() => setMenuVisible(true)}
              >
                <Icon name="ellipsis-horizontal" size={ds.iconSize.lg} color={DARK_GRAY} />
              </TouchableOpacity>
            </View>
          ) : undefined}
        />
      )}

      <Animated.ScrollView
        style={[
          styles.eventDetailContent,
          !isChallenge && localStyles.eventDetailContentFullBleed,
        ]}
        contentContainerStyle={[
          localStyles.scrollContent,
          !isChallenge && localStyles.eventScrollContent,
          isChallenge && localStyles.scrollContentChallenge,

        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}

      >
        {!isChallenge ? (
          <>
            {eventHeroImageSource ? <MediaImage source={eventHeroImageSource} style={localStyles.referenceCover} resizeMode="cover" /> : null}
            <View style={localStyles.referenceIntro}>
              <View style={localStyles.referenceBadges}>
                {[getEventCategoryLabel(event.category), getEventParticipationLabel(event.participationType)].filter(Boolean).map(label => <Tag key={label} label={label} />)}
              </View>
              <Text style={localStyles.referenceTitle}>{event.title}</Text>
              <EventOccurrenceList key={event.id} schedule={event.schedule} startsAt={event.startsAt} onCalendar={handleOpenCalendar} />
              <TouchableOpacity accessibilityRole="button" disabled={modality !== "in_person" || !eventLocation} onPress={handleOpenMap} style={localStyles.referenceMetaRow}>
                <Icon name={modality === "online" ? "videocam-outline" : "location-outline"} size={ds.iconSize.lg} color={vibesTheme.colors.accentBlue} />
                <View style={{ flex: 1 }}><Text style={localStyles.referenceMetaTitle}>{eventLocation || modalityLabel}</Text><Text style={localStyles.referenceMetaHint}>{modalityLabel}</Text></View>
              </TouchableOpacity>
              <View style={localStyles.referenceMetaRow}>
                <Icon name="ticket-outline" size={ds.iconSize.lg} color={vibesTheme.colors.accentBlue} />
                <View style={{ flex: 1 }}><Text style={localStyles.referenceMetaTitle}>{pricingLabel}</Text><Text style={localStyles.referenceMetaHint}>{event.capacity && event.capacity > 0 ? `Cupos: ${event.capacity}` : "Cupos ilimitados"}</Text></View>
              </View>
            </View>
            <View style={localStyles.eventDetailPanel}>
              {eventDescription ? <View style={{ paddingTop: ds.spacing[5], gap: ds.spacing[3] }}>
                <Text style={{ color: vibesTheme.colors.primaryText, ...ds.textStyles.heading }}>Sobre el evento</Text>
                <Text selectable style={localStyles.eventPanelDescription}>{eventDescription}</Text>
              </View> : null}
              <View style={localStyles.eventMetaDivider} />
              <View style={styles.eventDetailInfoSection}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Ver participantes" activeOpacity={0.85} onPress={() => setParticipantsVisible(true)} style={[localStyles.referenceMetaRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.medium), paddingVertical: ds.spacing[4] }]}>
                  {visibleParticipants.length ? <AvatarGroup size={38} max={3} overlap={7} items={visibleParticipants.map(item => ({ id: item.id, uri: item.avatarUrl }))} /> : <Icon name="people-outline" size={ds.iconSize.lg} color={vibesTheme.colors.secondaryText} />}
                  <Text style={[localStyles.referenceMetaTitle, { flex: 1 }]}>{visibleParticipantCount} {visibleParticipantCount === 1 ? "participante" : "participantes"}</Text>
                  <Icon name="chevron-forward" size={ds.iconSize.lg} color={vibesTheme.colors.secondaryText} />
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Invitar personas al evento"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: ds.spacing[3],
                    padding: ds.spacing[4],
                    borderRadius: ds.radii.lg,
                    minHeight: 56,
                    marginBottom: ds.spacing[4],
                    backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle),
                  }}
                  onPress={() => {
                    if (!userId) {
                      navigation.navigate("Login" as never);
                      return;
                    }
                    setInviteVisible(true);
                  }}
                >
                  <Icon
                    name="person-add-outline"
                    size={ds.iconSize.lg}
                    color={vibesTheme.colors.primaryText}
                  />
                  <Text
                    style={{
                      flex: 1,
                      color: vibesTheme.colors.primaryText,
                      ...ds.textStyles.subtitleMedium,
                    }}
                  >
                    Invitar a alguien
                  </Text>
                  <Icon
                    name="chevron-forward"
                    size={ds.iconSize.md}
                    color={vibesTheme.colors.primaryText}
                  />
                </TouchableOpacity>
                {modality === "in_person" && eventLocation ? (
                  <>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Abrir ubicación del evento en el mapa"
                    activeOpacity={0.9}
                    style={localStyles.eventMiniMapCard}
                    onPress={handleOpenMap}
                  >
                    {!eventMapPreviewFailed && eventMapPreviewSource ? (
                      <Image
                        source={eventMapPreviewSource}
                        style={localStyles.eventMiniMapImage}
                        onError={() => setEventMapPreviewFailed(true)}
                      />
                    ) : (
                      <View style={localStyles.eventMiniMapFallback}>
                        <View style={localStyles.eventMiniMapPin}>
                          <Icon name="location" size={ds.iconSize.lg} color={PRIMARY_COLOR} />
                        </View>
                        <View style={localStyles.eventMiniMapCopy}>
                          <Text style={localStyles.eventMiniMapTitle}>Ver ubicación</Text>
                          <Text style={localStyles.eventMiniMapText} numberOfLines={2}>{eventLocation}</Text>
                        </View>
                      </View>
                    )}
                    <OverlayBadge
                      tone="light"
                      position="bottom-right"
                      icon={<Icon name="navigate" size={ds.iconSize.sm} color={overlayBadgeContentColor("light")} />}
                      label="Abrir mapa"
                    />
                  </TouchableOpacity>
                  {eventLink || (pricingType === "paid" && paymentLink) ? (
                    <View style={localStyles.mapLinkDivider} />
                  ) : null}
                  </>
                ) : null}

                {eventLink ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.eventDetailInfoRow}
                    onPress={() =>
                      handleOpenExternalLink(
                        eventLink,
                        "Evento",
                        "No se pudo abrir el link del evento.",
                      )
                    }
                  >
                    <View style={[styles.eventDetailInfoIconWrap, { backgroundColor: "transparent" }]}>
                      <Icon
                        name="open-outline"
                        size={ds.iconSize.md}
                        color={PRIMARY_COLOR}
                      />
                    </View>
                    <View style={styles.eventDetailInfoCopy}>
                      <Text style={styles.eventDetailInfoText}>
                        {getExternalUrlLabel(eventLink, "Link del evento")}
                      </Text>
                      <Text style={styles.eventDetailInfoLabel}>
                        Abrir link del evento
                      </Text>
                    </View>
                    <Icon name="chevron-forward" size={ds.iconSize.lg} color={TEXT_SECONDARY} />
                  </TouchableOpacity>
                ) : null}

                {modality === "online" && onlineLink ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.eventDetailInfoRow}
                    onPress={() =>
                      handleOpenExternalLink(
                        onlineLink,
                        "Evento online",
                        "No se pudo abrir el link online.",
                      )
                    }
                  >
                    <View style={[styles.eventDetailInfoIconWrap, { backgroundColor: "transparent" }]}>
                      <Icon
                        name="videocam-outline"
                        size={ds.iconSize.md}
                        color={PRIMARY_COLOR}
                      />
                    </View>
                    <View style={styles.eventDetailInfoCopy}>
                      <Text style={styles.eventDetailInfoText}>
                        {getExternalUrlLabel(onlineLink, "Evento online")}
                      </Text>
                      <Text style={styles.eventDetailInfoLabel}>
                        Entrar al evento online
                      </Text>
                    </View>
                    <Icon name="chevron-forward" size={ds.iconSize.lg} color={TEXT_SECONDARY} />
                  </TouchableOpacity>
                ) : null}

                {pricingType === "paid" && paymentLink ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.eventDetailInfoRow}
                    onPress={() =>
                      handleOpenExternalLink(
                        paymentLink,
                        "Pago",
                        "No se pudo abrir el link de pago.",
                      )
                    }
                  >
                    <View style={[styles.eventDetailInfoIconWrap, { backgroundColor: "transparent" }]}>
                      <Icon
                        name="card-outline"
                        size={ds.iconSize.md}
                        color={PRIMARY_COLOR}
                      />
                    </View>
                    <View style={styles.eventDetailInfoCopy}>
                      <Text style={styles.eventDetailInfoText}>
                        {getExternalUrlLabel(paymentLink, "Evento pago")}
                      </Text>
                    </View>
                    <Icon name="chevron-forward" size={ds.iconSize.lg} color={TEXT_SECONDARY} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.eventDetailTitle}>{event.title}</Text>
            {eventDescription ? (
              <Text style={styles.eventDetailDescription}>{eventDescription}</Text>
            ) : null}

            <View style={styles.eventDetailInfoSection}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.eventDetailInfoRow}
                onPress={() => handleOpenCalendar()}
              >
                <View style={[styles.eventDetailInfoIconWrap, { backgroundColor: "transparent" }]}>
                  <Icon name="calendar" size={ds.iconSize.md} color={PRIMARY_COLOR} />
                </View>
                <View style={styles.eventDetailInfoCopy}>
                  <Text style={styles.eventDetailInfoText}>{challengeStartDate}</Text>
                  <Text style={styles.eventDetailInfoLabel}>
                    Agregar a mi calendario
                  </Text>
                </View>
                <Icon name="chevron-forward" size={ds.iconSize.lg} color={TEXT_SECONDARY} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.eventDetailInfoRow}
                onPress={() => setParticipantsVisible(true)}
              >
                <View style={[styles.eventDetailInfoIconWrap, { backgroundColor: "transparent" }]}>
                  <Icon name="people" size={ds.iconSize.md} color={PRIMARY_COLOR} />
                </View>
                <View style={styles.eventDetailInfoCopy}>
                  <Text style={styles.eventDetailInfoText}>
                    {participantCount} participantes
                  </Text>
                  <Text style={styles.eventDetailInfoLabel}>Ver participantes</Text>
                  {visibleParticipants.length > 0 ? (
                    <View style={localStyles.participantsPreviewRow}>
                      <AvatarGroup
                        size={28}
                        max={4}
                        overlap={8}
                        items={visibleParticipants.map((item) => ({
                          id: item.id,
                          uri: item.avatarUrl,
                        }))}
                      />
                      {visibleParticipantCount > 4 ? (
                        <View
                          style={[
                            localStyles.participantPreviewAvatar,
                            localStyles.participantPreviewMore,
                            localStyles.participantPreviewAvatarOverlap,
                          ]}
                        >
                          <Text style={localStyles.participantPreviewMoreText}>
                            +{visibleParticipantCount - 4}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
                <Icon name="chevron-forward" size={ds.iconSize.lg} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Tracking section (solo desafíos) ── */}
        {isChallenge ? (
          <>
            {participantLoading ? (
              <VibesLoader  style={{ marginVertical: ds.spacing[6] }} />
            ) : isJoined ? (
              <View style={localStyles.trackingCard}>
                <View style={localStyles.daysPanel}>
                  <View style={localStyles.daysWrap}>
                    {progressDays.map((day) => {
                      const dayDate = validStartDate
                        ? new Date(
                            validStartDate.getFullYear(),
                            validStartDate.getMonth(),
                            validStartDate.getDate() + day - 1,
                          )
                        : null;
                      const dayKey = dayDate ? formatDayKey(dayDate) : null;
                      const isDone = dayKey
                        ? checkinSet.has(dayKey)
                        : day <= streak;
                      const isPast = dayKey ? dayKey < todayKey : false;
                      const isMissed = Boolean(dayKey && isPast && !isDone);
                      const isCurrent = Boolean(
                        dayKey && dayKey === todayKey && !isDone,
                      );
                      const selectionKey = dayKey ?? `day-${day}`;
                      const isSelected = selectedProgressDay === selectionKey;

                      return (
                        <DayPill
                          key={`day-${day}`}
                          label={day}
                          state={isDone ? "done" : isMissed ? "missed" : isCurrent ? "current" : "future"}
                          selected={isSelected}
                          onPress={() => setSelectedProgressDay(selectionKey)}
                        />
                      );
                    })}
                  </View>
                </View>

                <View style={localStyles.streakRow}>
                  <Text style={localStyles.streakEmoji}>
                    {getStreakEmoji(streak)}
                  </Text>
                  <View style={localStyles.streakTextWrap}>
                    <Text style={localStyles.streakCount}>
                      {getStreakHeadline(
                        streak,
                        totalCheckins,
                        validStartDate,
                        todayDate,
                        isChallengeFinished,
                      )}
                    </Text>
                    <Text style={localStyles.streakLabel}>
                      {isChallengeFinished
                        ? getChallengeFinishedMessage()
                        : getStreakMessage(streak, totalCheckins)}
                    </Text>
                  </View>
                  <View style={localStyles.totalBadge}>
                    <Text style={localStyles.totalBadgeNumber}>
                      {totalCheckins}
                    </Text>
                    <Text style={localStyles.totalBadgeLabel}>
                      {getTotalCheckinsLabel(totalCheckins)}
                    </Text>
                  </View>
                </View>

                {!isChallengeFinished && milestone ? (
                  <View style={localStyles.milestoneWrap}>
                    <ProgressBar value={Math.min(streak / milestone, 1)} size="md" tone="accent" />
                    <Text style={localStyles.milestoneLabel}>
                      {getMilestoneMessage(streak, milestone)}
                    </Text>
                  </View>
                ) : !isChallengeFinished ? (
                  <Text style={localStyles.milestoneLabel}>
                    {getMilestoneMessage(streak, milestone)}
                  </Text>
                ) : null}

                {showTreeProgress ? (
                  <ChallengeTreeProgress progress={treeProgress} size={200} />
                ) : null}
              </View>
            ) : (
              <View style={localStyles.joinSpacer} />
            )}
          </>
        ) : isEventJoined ? (
          <View style={localStyles.joinSpacer} />
        ) : (
          <View style={localStyles.joinSpacer} />
        )}
      </Animated.ScrollView>

      {renderBottomActions() ? (
        <View
          style={[
            localStyles.fixedFooter,
            localStyles.persistentFooter,
            { bottom: Math.max(insets.bottom + 12, 22) },
          ]}
        >
          {renderBottomActions()}
        </View>
      ) : null}

      {/* Modal check-in con nota opcional */}
      <Modal
        visible={checkInModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCheckInModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={localStyles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Math.max(insets.top, 0)}
        >
          <View
            style={[
              localStyles.modalCard,
              { paddingBottom: Math.max(insets.bottom + ds.spacing[4], ds.spacing[6]) },
            ]}
          >
            <Text style={localStyles.modalTitle}>
              {getStreakEmoji(streak + 1)} Check-in del día
            </Text>
            <Text style={localStyles.modalSubtitle}>
              {getCheckInModalMessage(streak, totalCheckins)}
            </Text>
            <TextInput
              style={localStyles.noteInput}
              placeholder="¿Cómo te fue hoy? (opcional)"
              placeholderTextColor={TEXT_SECONDARY}
              value={checkInNote}
              onChangeText={setCheckInNote}
              multiline
              maxLength={200}
            />
            <View
              style={localStyles.checkInSliderWrap}
              onLayout={(event) => {
                setSliderWidth(event.nativeEvent.layout.width);
              }}
            >
              <View style={localStyles.checkInSliderTrack}>
                <View style={localStyles.checkInSliderGlow} pointerEvents="none" />
                <View style={localStyles.checkInSliderCopy}>
                  <Text style={localStyles.checkInSliderTitle}>
                    Check-in diario
                  </Text>
                  <Text style={localStyles.checkInSliderSubtitle}>
                    Deslizá para completar tu día
                  </Text>
                </View>
                <View style={localStyles.checkInSliderChevrons} pointerEvents="none">
                  <Icon name="chevron-forward" size={ds.iconSize.md} color={vibesTheme.colors.accentMustard} />
                  <Icon name="chevron-forward" size={ds.iconSize.md} color={vibesTheme.colors.accentMustard} />
                  <Icon name="chevron-forward" size={ds.iconSize.md} color={vibesTheme.colors.accentMustard} />
                </View>
              </View>

              <Animated.View
                style={[
                  localStyles.checkInSliderHandle,
                  {
                    transform: [{ translateX: sliderTranslateX }],
                  },
                ]}
                {...(!checkedInToday && !checkInMutation.isPending
                  ? checkInPanResponder.panHandlers
                  : {})}
              >
                {checkInMutation.isPending ? (
                  <VibesLoader />
                ) : (
                  <Icon
                    name={checkedInToday ? "checkmark" : "sunny-outline"}
                    size={ds.iconSize.xl}
                    color={vibesTheme.colors.accentCoral}
                  />
                )}
              </Animated.View>
            </View>
            <TouchableOpacity
              style={localStyles.modalCancelButton}
              onPress={() => setCheckInModalVisible(false)}
            >
              <Text style={localStyles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Menú hamburguesa ── */}
      {!isChallenge && userId && event.id ? (
        <EventInviteSheet
          event={event}
          visible={inviteVisible}
          onClose={() => setInviteVisible(false)}
          onDiscover={() =>
            navigation.navigate("Tab" as never, { screen: "Discover" } as never)
          }
        />
      ) : null}

      <AnimatedSheetModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        offsetY={320}
        sheetStyle={localStyles.menuSheet}
      >
        <>
          <View style={localStyles.menuHandle} />
          <Text style={localStyles.menuTitle}>{event.title}</Text>

          <TouchableOpacity
            style={localStyles.menuItem}
            onPress={() => {
              setMenuVisible(false);
              setParticipantsVisible(true);
            }}
          >
            <Icon name="people" size={ds.iconSize.md} color={DARK_GRAY} />
            <Text style={localStyles.menuItemText}>
              Participantes ({visibleParticipantCount})
            </Text>
            <Icon name="chevron-forward" size={ds.iconSize.sm} color={TEXT_SECONDARY} />
          </TouchableOpacity>

          {isChallenge && isJoined ? (
            <TouchableOpacity
              style={localStyles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate("EventChat" as never, { event } as never);
              }}
            >
              <Icon name="chatbubbles" size={ds.iconSize.md} color={DARK_GRAY} />
              <Text style={localStyles.menuItemText}>Chat del desafío</Text>
              <Icon name="chevron-forward" size={ds.iconSize.sm} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          ) : null}

          {!isChallenge && isAdmin ? (
            <>
              <View style={localStyles.menuDivider} />
              <Text style={localStyles.menuSectionLabel}>Admin</Text>
              <TouchableOpacity
                style={localStyles.menuItem}
                onPress={handleEditEvent}
              >
                <Icon name="create-outline" size={ds.iconSize.md} color={DARK_GRAY} />
                <Text style={localStyles.menuItemText}>Editar evento</Text>
                <Icon name="chevron-forward" size={ds.iconSize.sm} color={TEXT_SECONDARY} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[localStyles.menuItem, localStyles.menuItemDanger]}
                onPress={handleDeleteEvent}
                disabled={deleteEventMutation.isPending}
              >
                <Icon name="trash" size={ds.iconSize.md} color={vibesTheme.colors.accentCoral} />
                <Text style={[localStyles.menuItemText, { color: vibesTheme.colors.accentBlue }]}>
                  Eliminar evento
                </Text>
              </TouchableOpacity>
            </>
          ) : null}

          {isJoined && !isAdmin ? (
            <TouchableOpacity
              style={[localStyles.menuItem, localStyles.menuItemDanger]}
              onPress={handleLeave}
            >
              <Icon name="exit" size={ds.iconSize.md} color={vibesTheme.colors.accentCoral} />
              <Text style={[localStyles.menuItemText, { color: vibesTheme.colors.accentBlue }]}>
                Salir del desafío
              </Text>
            </TouchableOpacity>
          ) : null}

          {isAdmin && isChallenge ? (
            <>
              <View style={localStyles.menuDivider} />
              <Text style={localStyles.menuSectionLabel}>Admin</Text>
              <TouchableOpacity
                style={[localStyles.menuItem, localStyles.menuItemDanger]}
                onPress={handleLeave}
              >
                <Icon name="exit" size={ds.iconSize.md} color={vibesTheme.colors.accentCoral} />
                <Text style={[localStyles.menuItemText, { color: vibesTheme.colors.accentBlue }]}>
                  Abandonar desafío
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[localStyles.menuItem, localStyles.menuItemDanger]}
                onPress={handleDelete}
              >
                <Icon name="trash" size={ds.iconSize.md} color={vibesTheme.colors.accentCoral} />
                <Text style={[localStyles.menuItemText, { color: vibesTheme.colors.accentBlue }]}>
                  Eliminar desafío
                </Text>
              </TouchableOpacity>
            </>
          ) : null}

          <TouchableOpacity
            style={localStyles.menuCancel}
            onPress={() => setMenuVisible(false)}
          >
            <Text style={localStyles.menuCancelText}>Cancelar</Text>
          </TouchableOpacity>
        </>
      </AnimatedSheetModal>

      {/* ── Modal participantes ── */}
      <AnimatedSheetModal
        visible={participantsVisible}
        onClose={() => setParticipantsVisible(false)}
        onClosed={handleParticipantsSheetClosed}
        offsetY={320}
        sheetStyle={localStyles.participantsModalCard}
      >
        <View style={localStyles.participantsModalHeader}>
          <Text style={localStyles.participantsModalTitle}>Participantes</Text>
          <TouchableOpacity onPress={() => setParticipantsVisible(false)}>
            <Icon name="close" size={ds.iconSize.lg} color={DARK_GRAY} />
          </TouchableOpacity>
        </View>
          <FlatList
            data={visibleParticipants}
            keyExtractor={(item) => item.id}
            style={{ maxHeight: 380 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={localStyles.memberRow}
                activeOpacity={0.85}
                onPress={() => {
                  if (item.userId === userId) return;
                  setPendingParticipant({
                    userId: item.userId,
                    displayName: item.displayName,
                    avatarUrl: item.avatarUrl,
                  });
                  setParticipantsVisible(false);
                }}
              >
                <Avatar uri={item.avatarUrl} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={localStyles.memberName}>
                    {item.displayName || "Participante"}
                    {item.userId === event.createdBy ? " 👑" : ""}
                    {item.userId === userId ? " (vos)" : ""}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={localStyles.emptyParticipants}>
                Nadie se sumó todavía
              </Text>
            }
          />
      </AnimatedSheetModal>

      <UserProfileSheet
        visible={Boolean(selectedParticipant && selectedParticipantCard)}
        profile={selectedParticipantCard}
        onClose={() => {
          setSelectedParticipant(null);
          setPendingParticipant(null);
        }}
        onContactPress={
          canConnectSelectedParticipant ? handleConnectParticipant : undefined
        }
        showPhotoCounter={false}
      />
    </View>
  );
};

const localStyles = StyleSheet.create({
  referenceHeaderAction: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
  referenceCover: { width: "auto", height: 190, borderRadius: ds.radii.lg, marginHorizontal: ds.spacing[4], marginTop: ds.spacing[2], marginBottom: ds.spacing[4], backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle) },
  referenceIntro: { paddingHorizontal: ds.spacing[6] },
  referenceBadges: { flexDirection: "row", flexWrap: "wrap", gap: ds.spacing[2], marginBottom: ds.spacing[3] },
  referenceTitle: { color: vibesTheme.colors.primaryText, ...ds.textStyles.display, marginBottom: ds.spacing[4] },
  referenceMetaRow: { flexDirection: "row", alignItems: "center", gap: ds.spacing[4], minHeight: 60, paddingVertical: ds.spacing[3] },
  referenceMetaTitle: { color: vibesTheme.colors.primaryText, ...ds.textStyles.subtitle },
  referenceMetaHint: { color: vibesTheme.colors.secondaryText, ...ds.textStyles.bodySmall },

  publicStateScreen: {
    alignItems: "center",
    justifyContent: "center",
    gap: ds.spacing[5],
    paddingHorizontal: ds.spacing[8],
    backgroundColor: vibesTheme.colors.background,
  },
  publicStateTitle: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.title,
    textAlign: "center",
  },
  publicStateButton: {
    borderRadius: ds.radii.xl,
    backgroundColor: vibesTheme.colors.accentMustard,
    paddingHorizontal: ds.spacing[6],
    paddingVertical: ds.spacing[3],
  },
  publicStateButtonText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.subtitle,
  },
  challengeWhiteBackground: {
    backgroundColor: WHITE,
  },
  trackingCard: {
    backgroundColor: ds.colors.bg.surfaceTranslucent,
    borderRadius: ds.radii.xl,
    padding: ds.spacing[4],
    ...ds.glow.accent,
    elevation: ds.shadows.md.elevation,
    alignItems: "stretch",
    gap: ds.spacing[4],
  },
  daysPanel: {
    backgroundColor: ds.colors.bg.selected,
    borderRadius: ds.radii.lg,
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.scrim),
  },
  eventHeroMedia: {
    borderRadius: 0,
    overflow: "hidden",
    marginBottom: 0,
    justifyContent: "flex-end",
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.scrim),
  },
  eventHeroImage: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  eventHeroScrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: ds.colors.scrim,
  },
  eventHeroContent: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingHorizontal: ds.spacing[8],
  },
  eventHeroTitle: {
    color: WHITE,
    ...ds.textStyles.title,
    textShadowColor: ds.withAlpha(ds.colors.base.ink, ds.opacity.strong),
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  eventHeroSubtitle: {
    marginTop: ds.spacing[3],
    color: ds.colors.bg.surfaceTranslucent,
    ...ds.textStyles.subtitleMedium,
  },
  eventIntroMetaRow: {
    marginTop: ds.spacing[4],
    marginHorizontal: ds.spacing[6],
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
  },
  eventIntroMetaItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[2],
  },
  eventIntroMetaText: {
    flex: 1,
    color: DARK_GRAY,
    ...ds.textStyles.heading,
  },
  eventDetailWarmBackground: {
    backgroundColor: vibesTheme.colors.background,
  },
  eventDetailContentFullBleed: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  eventDetailScrollablePanel: {
    marginTop: -ds.spacing[8],
    zIndex: 3,
  },
  eventScrollContent: {
    paddingTop: 0,
    paddingBottom: /* ds-lint-allow layout: paddingBottom 178 (medida de layout fuera de la escala) */ 178,
  },
  eventDetailPanel: {
    marginTop: 0,
    width: "100%",
    minHeight: 0,
    paddingTop: 0,
    paddingHorizontal: ds.spacing[6],
    paddingBottom: ds.spacing[8],
    backgroundColor: vibesTheme.colors.background,
  },
  eventPanelTitle: {
    color: DARK_GRAY,
    ...ds.textStyles.display,
    textAlign: "left",
    marginBottom: ds.spacing[2],
  },
  eventPanelDescription: {
    color: TEXT_SECONDARY,
    ...ds.textStyles.subtitleMedium,
    marginBottom: ds.spacing[4],
  },
  eventMetaDivider: {
    height: ds.componentSize.divider,
    marginTop: ds.spacing[3],
    backgroundColor: ds.colors.border.subtle,
  },
  mapLinkDivider: {
    height: ds.componentSize.divider,
    marginTop: ds.spacing[3],
    backgroundColor: ds.colors.border.subtle,
  },
  eventMiniMapCard: {
    ...cardStyles.mapPreview,
    marginTop: ds.spacing[3],
    marginBottom: ds.spacing[2],
  },
  eventMiniMapImage: {
    width: "100%",
    height: "100%",
  },
  eventMiniMapTiles: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  eventMiniMapTile: {
    position: "absolute",
    width: "33.334%",
    height: "33.334%",
  },
  eventMiniMapFallback: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
    paddingHorizontal: ds.spacing[4],
    backgroundColor: ds.colors.bg.selected,
  },
  eventMiniMapPin: {
    width: 42,
    height: 42,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.colors.bg.selected,
  },
  eventMiniMapCopy: {
    flex: 1,
  },
  eventMiniMapTitle: {
    color: DARK_GRAY,
    ...ds.textStyles.body,
  },
  eventMiniMapText: {
    color: TEXT_SECONDARY,
    ...ds.textStyles.labelMedium,
    marginTop: ds.spacing[1],
  },
  daysWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ds.spacing[3],
    alignSelf: "flex-start",
  },
  scrollContent: {
    paddingTop: ds.spacing[3],
    paddingBottom: /* ds-lint-allow layout: paddingBottom 186 (medida de layout fuera de la escala) */ 186,
  },
  scrollContentChallenge: {
    paddingTop: /* ds-lint-allow layout: paddingTop 84 (medida de layout fuera de la escala) */ 84,
  },
  joinSpacer: {
    height: 12,
  },
  fixedFooter: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 22,
    zIndex: 40,
    elevation: ds.shadows.lg.elevation,
  },
  persistentHeader: {
    zIndex: 60,
    elevation: ds.shadows.lg.elevation,
  },
  expandedEventHeader: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 63,
    elevation: ds.shadows.lg.elevation,
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[4],
  },
  eventHeaderIconButton: {
    width: 42,
    height: 42,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.withAlpha(ds.colors.base.ink, ds.opacity.medium),
    borderWidth: 1,
    borderColor: ds.withAlpha(ds.colors.base.paper, ds.opacity.scrim),
  },
  expandedEventHeaderTitle: {
    flex: 1,
    color: WHITE,
    ...ds.textStyles.title,
    textAlign: "left",
    textShadowColor: ds.withAlpha(ds.colors.base.ink, ds.opacity.strong),
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  expandedEventHeaderSpacer: {
    flex: 1,
  },
  headerIconPlaceholder: {
    width: 40,
    height: 40,
  },
  collapsedEventHeader: {
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
    shadowColor: DARK_GRAY,
    shadowOpacity: ds.shadows.md.shadowOpacity,
    shadowRadius: ds.shadows.md.shadowRadius,
    shadowOffset: ds.shadows.md.shadowOffset,
    zIndex: 61,
    elevation: ds.shadows.md.elevation,
  },
  collapsedHeaderBackButton: {
    width: 40,
    height: 40,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.colors.bg.surfaceTranslucent,
    borderWidth: 1,
    borderColor: ds.colors.border.subtle,
  },
  collapsedEventHeaderThumbnail: {
    width: 38,
    height: 38,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.scrim),
  },
  collapsedEventHeaderTitle: {
    flex: 1,
    color: DARK_GRAY,
    ...ds.textStyles.heading,
    textAlign: "left",
  },
  persistentFooter: {
    zIndex: 60,
    elevation: ds.shadows.lg.elevation,
  },
  fixedFooterContent: {
    backgroundColor: ds.colors.bg.surface,
    borderRadius: ds.radii.xl,
    paddingTop: ds.spacing[4],
    paddingHorizontal: ds.spacing[4],
    paddingBottom: ds.spacing[2],
    ...ds.glow.accent,
    elevation: ds.shadows.md.elevation,
  },
  eventFixedFooterContent: {
    backgroundColor: ds.colors.bg.surface,
    borderRadius: ds.radii.xl,
    paddingTop: ds.spacing[4],
    paddingHorizontal: ds.spacing[4],
    paddingBottom: ds.spacing[3],
    ...ds.glow.accent,
    elevation: ds.shadows.lg.elevation,
  },
  eventChatFooterContent: {
    alignItems: "flex-end",
  },
  eventFloatingChatButton: {
    ...iconButtonFloating,
    alignSelf: "flex-end",
  },
  challengeFooterButtonGroup: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: ds.spacing[3],
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
  },
  fixedFooterNote: {
    marginBottom: ds.spacing[2],
  },
  footerActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ds.spacing[3],
    paddingHorizontal: ds.spacing[4],
  },
  joinEventText: {
    color: vibesTheme.colors.background,
    ...ds.textStyles.body,
  },
  footerActionText: {
    flexShrink: 1,
    textAlign: "center",
  },
  participantsPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: ds.spacing[3],
    paddingLeft: ds.spacing[1],
  },
  participantPreviewAvatar: {
    width: 28,
    height: 28,
    borderRadius: ds.radii.pill,
    borderWidth: 2,
    borderColor: WHITE,
    backgroundColor: vibesTheme.colors.background,
  },
  participantPreviewAvatarOverlap: {
    marginLeft: -ds.spacing[2],
  },
  participantPreviewMore: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY_COLOR,
  },
  participantPreviewMoreText: {
    color: WHITE,
    ...ds.textStyles.caption,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
  },
  streakEmoji: {
    ...ds.textStyles.display,
  },
  streakTextWrap: {
    flex: 1,
  },
  streakCount: {
    ...ds.textStyles.title,
    color: DARK_GRAY,
  },
  streakLabel: {
    ...ds.textStyles.labelMedium,
    color: TEXT_SECONDARY,
    marginTop: ds.spacing[1],
  },
  totalBadge: {
    ...cardStyles.accent,
    alignItems: "center",
    minWidth: 76,
    paddingHorizontal: ds.spacing[3],
    paddingVertical: ds.spacing[2],
  },
  totalBadgeNumber: {
    ...ds.textStyles.heading,
    color: vibesTheme.colors.accentBlue,
  },
  totalBadgeLabel: {
    ...ds.textStyles.micro,
    color: TEXT_SECONDARY,
  },
  milestoneWrap: {
    gap: ds.spacing[2],
  },
  milestoneLabel: {
    ...ds.textStyles.caption,
    color: TEXT_SECONDARY,
  },
  checkedInBadge: {
    ...cardStyles.accent,
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[2],
    paddingHorizontal: ds.spacing[4],
    paddingVertical: ds.spacing[3],
  },
  checkedInText: {
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.label,
  },
  footerCheckInSliderWrap: {
    flex: 1,
    minHeight: FOOTER_CHECKIN_SWIPE.height,
    justifyContent: "center",
  },
  footerCheckInSliderTrack: swipeToConfirmTrackStyle("md", "accent"),
  footerCheckInSliderGlow: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "42%",
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.strong),
  },
  footerCheckInSliderCopy: {
    gap: ds.spacing[0],
  },
  footerCheckInSliderTitle: {
    color: DARK_GRAY,
    ...ds.textStyles.bodySmall,
  },
  footerCheckInSliderSubtitle: {
    color: TEXT_SECONDARY,
    ...ds.textStyles.micro,
  },
  footerCheckInSliderChevrons: {
    position: "absolute",
    left: FOOTER_CHECKIN_SWIPE.chevronsLeft,
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  footerCheckInSliderHandle: {
    position: "absolute",
    left: FOOTER_CHECKIN_SLIDER_HORIZONTAL_PADDING,
    top: FOOTER_CHECKIN_SLIDER_HORIZONTAL_PADDING,
    width: FOOTER_CHECKIN_SLIDER_HANDLE_SIZE,
    height: FOOTER_CHECKIN_SLIDER_HANDLE_SIZE,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.colors.bg.selected,
    borderWidth: 2,
    borderColor: ds.colors.bg.surfaceTranslucent,
    ...ds.glow.accent,
    elevation: ds.shadows.md.elevation,
  },
  checkInButton: {
    flex: 1,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ds.spacing[2],
    backgroundColor: PRIMARY_COLOR,
    borderRadius: ds.radii.xl,
    paddingVertical: ds.spacing[4],
    ...ds.glow.accent,
    elevation: ds.shadows.md.elevation,
    paddingHorizontal: ds.spacing[3],
  },
  checkInButtonDone: {
    backgroundColor: vibesTheme.colors.primaryText,
  },
  checkInButtonDisabled: {
    backgroundColor: ds.withAlpha(ds.colors.base.coral, ds.opacity.strong),
  },
  challengeChatButton: {
    flex: 1,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ds.spacing[2],
    backgroundColor: WHITE,
    borderRadius: ds.radii.xl,
    borderWidth: 1,
    borderColor: ds.colors.border.default,
    paddingVertical: ds.spacing[3],
    paddingHorizontal: ds.spacing[3],
  },
  challengeChatButtonDisabled: {
    backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.soft),
    borderColor: ds.colors.border.subtle,
  },
  challengeChatButtonText: {
    color: DARK_GRAY,
    ...ds.textStyles.label,
    textAlign: "center",
    flexShrink: 1,
  },
  challengeChatButtonTextDisabled: {
    color: vibesTheme.colors.secondaryText,
  },
  checkInButtonText: {
    color: vibesTheme.colors.surface,
    ...ds.textStyles.label,
    textAlign: "center",
    flexShrink: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: ds.withAlpha(ds.colors.base.ink, ds.opacity.strong),
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: WHITE,
    borderTopLeftRadius: ds.radii.xl,
    borderTopRightRadius: ds.radii.xl,
    padding: ds.spacing[6],
    gap: ds.spacing[3],
  },
  modalTitle: {
    ...ds.textStyles.title,
    color: DARK_GRAY,
    textAlign: "center",
  },
  modalSubtitle: {
    ...ds.textStyles.labelMedium,
    color: TEXT_SECONDARY,
    textAlign: "center",
  },
  noteInput: {
    backgroundColor: vibesTheme.colors.background,
    borderRadius: ds.radii.md,
    padding: ds.spacing[4],
    color: DARK_GRAY,
    ...ds.textStyles.subtitleMedium,
    minHeight: 72,
    textAlignVertical: "top",
  },
  checkInSliderWrap: {
    marginTop: ds.spacing[1],
    minHeight: CHECKIN_SWIPE.height,
    justifyContent: "center",
  },
  checkInSliderTrack: swipeToConfirmTrackStyle("lg", "accent"),
  checkInSliderGlow: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "54%",
    backgroundColor: ds.withAlpha(ds.colors.base.mustard, ds.opacity.high),
  },
  checkInSliderCopy: {
    gap: ds.spacing[1],
  },
  checkInSliderTitle: {
    color: DARK_GRAY,
    ...ds.textStyles.body,
  },
  checkInSliderSubtitle: {
    color: TEXT_SECONDARY,
    ...ds.textStyles.labelMedium,
  },
  checkInSliderChevrons: {
    position: "absolute",
    left: CHECKIN_SWIPE.chevronsLeft,
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[1],
  },
  checkInSliderHandle: {
    position: "absolute",
    left: CHECKIN_SLIDER_HORIZONTAL_PADDING,
    top: CHECKIN_SLIDER_HORIZONTAL_PADDING,
    width: CHECKIN_SLIDER_HANDLE_SIZE,
    height: CHECKIN_SLIDER_HANDLE_SIZE,
    borderRadius: ds.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ds.colors.bg.selected,
    borderWidth: 2,
    borderColor: ds.colors.bg.surfaceTranslucent,
    ...ds.glow.accent,
    elevation: ds.shadows.lg.elevation,
  },
  modalConfirmButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: ds.radii.xl,
    paddingVertical: ds.spacing[4],
    alignItems: "center",
    ...ds.glow.accent,
    elevation: ds.shadows.md.elevation,
  },
  modalConfirmText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.subtitle,
  },
  modalCancelButton: {
    alignItems: "center",
    paddingVertical: ds.spacing[2],
  },
  modalCancelText: {
    color: TEXT_SECONDARY,
    ...ds.textStyles.label,
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ds.spacing[2],
    borderWidth: 1.5,
    borderColor: PRIMARY_COLOR,
    borderRadius: ds.radii.xl,
    paddingVertical: ds.spacing[3],
    marginTop: ds.spacing[1],
  },
  chatButtonText: {
    color: vibesTheme.colors.accentBlue,
    ...ds.textStyles.subtitle,
  },
  // ── Menú hamburguesa ──
  menuSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: WHITE,
    borderTopLeftRadius: ds.radii.xl,
    borderTopRightRadius: ds.radii.xl,
    paddingHorizontal: ds.spacing[5],
    paddingTop: ds.spacing[3],
    paddingBottom: ds.spacing[12],
    gap: ds.spacing[1],
  },
  menuHandle: {
    width: 40,
    height: 4,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.medium),
    alignSelf: "center",
    marginBottom: ds.spacing[3],
  },
  menuTitle: {
    ...ds.textStyles.body,
    color: DARK_GRAY,
    marginBottom: ds.spacing[2],
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
    paddingVertical: ds.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.scrim),
  },
  menuItemDanger: {
    borderBottomColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.scrim),
  },
  menuItemText: {
    flex: 1,
    ...ds.textStyles.subtitle,
    color: DARK_GRAY,
  },
  menuDivider: {
    height: ds.componentSize.divider,
    backgroundColor: ds.colors.border.subtle,
    marginVertical: ds.spacing[2],
  },
  menuSectionLabel: {
    ...ds.textStyles.caption,
    color: TEXT_SECONDARY,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: ds.spacing[1],
  },
  menuCancel: {
    alignItems: "center",
    paddingVertical: ds.spacing[4],
    marginTop: ds.spacing[1],
  },
  menuCancelText: {
    ...ds.textStyles.subtitle,
    color: TEXT_SECONDARY,
  },
  // ── Participantes ──
  participantsModalCard: {
    backgroundColor: WHITE,
    borderTopLeftRadius: ds.radii.xl,
    borderTopRightRadius: ds.radii.xl,
    padding: ds.spacing[5],
    paddingBottom: ds.spacing[12],
  },
  participantsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ds.spacing[4],
  },
  participantsModalTitle: {
    ...ds.textStyles.heading,
    color: DARK_GRAY,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
    paddingVertical: ds.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.scrim),
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: ds.radii.pill,
  },
  memberName: {
    ...ds.textStyles.subtitle,
    color: DARK_GRAY,
  },
  emptyParticipants: {
    textAlign: "center",
    paddingVertical: ds.spacing[6],
    color: TEXT_SECONDARY,
    ...ds.textStyles.subtitleMedium,
  },
});

export default EventDetail;
