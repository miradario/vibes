/** @format */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  Linking,
  Platform,
} from "react-native";
import { ResizeMode, Video } from "expo-av";
import { useNavigation, useRoute } from "@react-navigation/native";
import styles, {
  TEXT_SECONDARY,
  PRIMARY_COLOR,
  WHITE,
  DARK_GRAY,
} from "../assets/styles";
import Icon from "../components/Icon";
import CardItem from "../components/CardItem";
import ChallengeTreeProgress from "../components/ChallengeTreeProgress";
import { useAuthSession } from "../src/auth/auth.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { mapCandidateToConnectionProfile } from "../src/lib/connectionProfiles";
import { useSwipeMutation } from "../src/queries/swipes.mutations";
import { handleApiError } from "../src/utils/handleApiError";
import {
  useChallengeParticipantQuery,
  useChallengeCheckinsQuery,
  useJoinChallengeMutation,
  useCheckInChallengeMutation,
  useLeaveChallengeMutation,
  useDeleteChallengeMutation,
  useIsEventParticipantQuery,
  useJoinEventMutation,
  useChallengeParticipantsQuery,
} from "../src/queries/events.queries";
import {
  getChallengeMediaPreset,
  parseChallengeMediaPreset,
} from "../src/constants/challengeMediaPresets";

const LOGO = require("../assets/images/logo.png");
const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 90];

const getStreakEmoji = (streak: number) => {
  if (streak >= 30) return "🔥🔥🔥";
  if (streak >= 14) return "🔥🔥";
  if (streak >= 3) return "🔥";
  return "✨";
};

const getStreakMessage = (streak: number, totalCheckins: number) => {
  if (streak === 0 && totalCheckins > 0) {
    return "Ya tenés avances. Hacé el check-in de hoy para retomar la racha.";
  }
  if (streak === 0) return "¡Hacé tu primer check-in!";
  if (streak === 1) return "¡Arrancaste! Mantené la racha";
  if (streak < 3) return `${streak} días seguidos, ¡vas bien!`;
  if (streak < 7) return `${streak} días seguidos ¡Fuego!`;
  if (streak < 14) return `${streak} días 🔥 ¡Imparable!`;
  if (streak < 21) return `${streak} días 🔥🔥 ¡Leyenda!`;
  return `${streak} días 🔥🔥🔥 ¡MAESTRO!`;
};

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

const getStreakHeadline = (streak: number, totalCheckins: number) => {
  if (streak === 0 && totalCheckins > 0) return "Racha en pausa";
  if (streak === 0) return "Hoy empieza";
  if (streak === 1) return "1 día";
  return `${streak} días`;
};

const getTotalCheckinsLabel = (totalCheckins: number) => {
  if (totalCheckins === 1) return "check-in";
  return "check-ins";
};

const getParticipantCountFallback = (attendees: unknown) => {
  if (typeof attendees !== "string") return 0;
  const match = attendees.match(/\d+/);
  return match ? Number(match[0]) || 0 : 0;
};

const getCheckInModalMessage = (streak: number, totalCheckins: number) => {
  if (streak === 0 && totalCheckins > 0) {
    return "Tu racha está en pausa. Si hacés el check-in de hoy, volvés a 1 día.";
  }
  return `Racha actual: ${streak} días · si hacés el check-in de hoy, pasás a ${streak + 1}.`;
};

const getCurrentStreakFromCheckins = (
  checkins: string[],
  referenceDate: Date,
) => {
  if (!checkins.length) return 0;

  const checkinSet = new Set(checkins);
  const cursor = new Date(referenceDate);
  let streak = 0;

  while (true) {
    const key = formatDayKey(cursor);
    if (!checkinSet.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
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
  const navigation = useNavigation();
  const route = useRoute();
  const event = (route.params as any)?.event;
  const isChallenge = event?.type === "challenge";

  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const swipeMutation = useSwipeMutation();

  const { data: participant, isLoading: participantLoading } =
    useChallengeParticipantQuery(isChallenge ? event?.id : undefined, userId);
  const { data: challengeCheckins = [] } = useChallengeCheckinsQuery(
    isChallenge ? event?.id : undefined,
    userId,
  );
  const joinMutation = useJoinChallengeMutation();
  const checkInMutation = useCheckInChallengeMutation();
  const leaveMutation = useLeaveChallengeMutation();
  const deleteMutation = useDeleteChallengeMutation();

  const { data: isEventParticipant, isLoading: eventParticipantLoading } =
    useIsEventParticipantQuery(!isChallenge ? event?.id : undefined, userId);
  const joinEventMutation = useJoinEventMutation();

  const { data: challengeParticipants = [] } = useChallengeParticipantsQuery(
    isChallenge ? event?.id : undefined,
  );

  const isAdmin = Boolean(
    userId && event?.createdBy && userId === event.createdBy,
  );

  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [checkInNote, setCheckInNote] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [participantsVisible, setParticipantsVisible] = useState(false);
  const [eventMapPreviewFailed, setEventMapPreviewFailed] = useState(false);
  const [selectedProgressDay, setSelectedProgressDay] = useState<string | null>(
    null,
  );
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

  const isJoined = Boolean(participant);
  const durationDays =
    typeof event?.durationDays === "number" && event.durationDays > 0
      ? event.durationDays
      : 21;
  const challengeStartDate = formatStartDate(
    event?.startsAt ?? event?.createdAt,
  );
  const selectedChallengePreset = getChallengeMediaPreset(
    event?.imagePresetId ?? parseChallengeMediaPreset(event?.imageUrl),
  );
  const selectedEventPreset = getChallengeMediaPreset(
    event?.imagePresetId ?? parseChallengeMediaPreset(event?.imageUrl),
  );
  const challengeVideoSource =
    selectedChallengePreset?.video ||
    require("../assets/videos/challenge.mp4");
  const todayDate = new Date();
  const todayKey = formatDayKey(todayDate);
  const startDate = event?.startsAt ?? event?.createdAt;
  const parsedStartDate = startDate ? new Date(startDate) : null;
  const validStartDate =
    parsedStartDate && !Number.isNaN(parsedStartDate.getTime())
      ? parsedStartDate
      : null;
  const checkinSet = new Set(challengeCheckins);
  const participantCount = Math.max(
    challengeParticipants.length,
    getParticipantCountFallback(event?.attendees),
  );
  const totalCheckins = Math.max(
    participant?.totalCheckins ?? 0,
    challengeCheckins.length,
  );
  const checkedInToday =
    Boolean(participant?.checkedInToday) || checkinSet.has(todayKey);
  const streak =
    challengeCheckins.length > 0
      ? getCurrentStreakFromCheckins(challengeCheckins, todayDate)
      : participant?.streak ?? 0;
  const milestone = nextMilestone(streak);
  const treeProgress = Math.min(streak / durationDays, 1);
  const showTreeProgress = streak > 0;
  const eventVideoSource = selectedEventPreset?.video
    ? selectedEventPreset.video
    : isVideoMedia(event?.imageUrl)
    ? { uri: event.imageUrl }
    : isVideoMedia(event?.image)
    ? { uri: event.image }
    : null;
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
  const handleConnectParticipant = () => {
    if (!selectedParticipant || !selectedParticipantCard) return;
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
              { profile: selectedParticipantCard } as never,
            );
          }
          setSelectedParticipant(null);
        },
        onError: (error) =>
          handleApiError(error, { toastTitle: "Connect Error" }),
      },
    );
  };

  const progressDays = Array.from(
    { length: durationDays },
    (_, index) => index + 1,
  );

  const renderBottomActions = () => {
    if (isChallenge) {
      if (participantLoading) return null;

      if (isJoined) {
        return (
          <View style={localStyles.fixedFooterContent}>
            <TouchableOpacity
              style={styles.eventDetailJoinButton}
              onPress={() =>
                navigation.navigate("EventChat" as never, { event } as never)
              }
            >
              <Text style={styles.eventDetailJoinButtonText}>
                Entrar al chat del challenge
              </Text>
            </TouchableOpacity>

            {checkedInToday ? (
              <View style={localStyles.checkedInBadge}>
                <Icon name="checkmark-circle" size={18} color="#4CAF50" />
                <Text style={localStyles.checkedInText}>
                  Check-in de hoy completo
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={localStyles.checkInButton}
                onPress={() => setCheckInModalVisible(true)}
                disabled={checkInMutation.isPending}
              >
                {checkInMutation.isPending ? (
                  <ActivityIndicator color={WHITE} size="small" />
                ) : (
                  <>
                    <Icon name="flame" size={18} color={WHITE} />
                    <Text style={localStyles.checkInButtonText}>
                      Hacer check-in de hoy
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        );
      }

      return (
        <View style={localStyles.fixedFooterContent}>
          <TouchableOpacity
            style={styles.eventDetailJoinButton}
            onPress={handleJoin}
            disabled={joinMutation.isPending}
          >
            {joinMutation.isPending ? (
              <ActivityIndicator color={WHITE} size="small" />
            ) : (
              <Text style={styles.eventDetailJoinButtonText}>
                Sumarme al challenge
              </Text>
            )}
          </TouchableOpacity>
          <Text
            style={[styles.eventDetailJoinNote, localStyles.fixedFooterNote]}
          >
            Al sumarte, empezás a trackear tu racha diaria.
          </Text>
        </View>
      );
    }

    if (eventParticipantLoading) return null;

    if (isEventParticipant) {
      return (
        <View style={localStyles.fixedFooterContent}>
          <TouchableOpacity
            style={styles.eventDetailJoinButton}
            onPress={() =>
              navigation.navigate("EventChat" as never, { event } as never)
            }
          >
            <Text style={styles.eventDetailJoinButtonText}>Ir al chat del evento</Text>
            <Icon name="arrow-forward" size={24} color={WHITE} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={localStyles.fixedFooterContent}>
        <TouchableOpacity
          style={styles.eventDetailJoinButton}
          onPress={async () => {
            if (!userId) {
              Alert.alert("Sesión requerida", "Necesitás iniciar sesión.");
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
            <ActivityIndicator color={WHITE} size="small" />
          ) : (
            <>
              <Text style={styles.eventDetailJoinButtonText}>
                Unirse al evento
              </Text>
              <Icon name="arrow-forward" size={24} color={WHITE} />
            </>
          )}
        </TouchableOpacity>
        <Text style={[styles.eventDetailJoinNote, localStyles.fixedFooterNote]}>
          Al sumarte, entrás al grupo del evento.
        </Text>
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
  const challengeLocation =
    typeof event?.location === "string" && event.location.trim()
      ? event.location.trim()
      : "Ubicación a confirmar";
  const eventHostName =
    typeof event?.hostName === "string" && event.hostName.trim()
      ? event.hostName.trim()
      : null;
  const eventHostImage =
    typeof event?.hostImage === "string" && event.hostImage.trim()
      ? { uri: event.hostImage.trim() }
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
  const eventLeadText = eventDescription || eventSubtitle;
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

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

  const handleOpenCalendar = async () => {
    const baseDate = validStartDate ?? todayDate;
    const start = new Date(baseDate);
    const end = new Date(baseDate);
    const isAllDayChallenge = isChallenge;

    if (isAllDayChallenge) {
      end.setDate(end.getDate() + Math.max(durationDays, 1));
    } else {
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

    const title = event?.title ?? (isChallenge ? "Challenge" : "Evento");
    const details = eventDescription ?? eventSubtitle ?? "";
    const location = isChallenge ? challengeLocation : eventLocation ?? "";
    const calendarUrl =
      `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(title)}` +
      `&dates=${formatCalendarDate(start, isAllDayChallenge)}/${formatCalendarDate(end, isAllDayChallenge)}` +
      `&details=${encodeURIComponent(details)}` +
      `&location=${encodeURIComponent(location)}`;

    try {
      const supported = await Linking.canOpenURL(calendarUrl);
      if (!supported) {
        Alert.alert("Calendario", "No se pudo abrir el calendario.");
        return;
      }
      await Linking.openURL(calendarUrl);
    } catch {
      Alert.alert("Calendario", "No se pudo abrir el calendario.");
    }
  };

  const handleOpenMap = async () => {
    const location = isChallenge ? challengeLocation : eventLocation;

    if (!location || location === "Ubicación a confirmar") {
      Alert.alert("Mapa", "Este challenge todavía no tiene una ubicación definida.");
      return;
    }

    const encodedLocation = encodeURIComponent(location);
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

    try {
      for (const url of candidateUrls) {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          return;
        }
      }

      Alert.alert("Mapa", "No se pudo abrir el mapa.");
    } catch {
      Alert.alert("Mapa", "No se pudo abrir el mapa.");
    }
  };

  const handleJoin = async () => {
    if (!userId) {
      Alert.alert("Sesión requerida", "Necesitás iniciar sesión.");
      return;
    }
    try {
      await joinMutation.mutateAsync({ challengeId: event.id, userId });
    } catch (error: any) {
      const message = error?.message?.includes("unique")
        ? "Ya estás en este challenge."
        : error?.message ?? "No se pudo unir al challenge.";
      Alert.alert("Error", message);
    }
  };

  const handleLeave = () => {
    if (!userId) return;
    Alert.alert(
      "Salir del challenge",
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
              navigation.goBack();
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.message ?? "No se pudo salir del challenge.",
              );
            }
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Eliminar challenge",
      "¿Eliminar este challenge para todos? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setMenuVisible(false);
            try {
              await deleteMutation.mutateAsync({ challengeId: event.id });
              navigation.goBack();
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.message ?? "No se pudo eliminar el challenge.",
              );
            }
          },
        },
      ],
    );
  };

  const handleEditEvent = () => {
    setMenuVisible(false);
    navigation.navigate(
      "CreateEvent" as never,
      { event } as never,
    );
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

  return (
    <View
      style={[
        styles.eventDetailContainer,
        isChallenge && localStyles.challengeWhiteBackground,
      ]}
    >
      {!isChallenge ? (
        <>
          <View style={styles.eventDetailAmbientGlow} pointerEvents="none" />
          <View style={styles.eventDetailAmbientSparkleCluster} pointerEvents="none">
            <View style={styles.eventDetailSparkleDotLarge} />
            <View style={styles.eventDetailSparkleDotMedium} />
            <View style={styles.eventDetailSparkleDotSmall} />
            <Icon
              name="sparkles"
              size={16}
              color="rgba(228, 183, 110, 0.72)"
              style={styles.eventDetailSparkleIcon}
            />
            <Icon
              name="sparkles-outline"
              size={12}
              color="rgba(228, 183, 110, 0.52)"
              style={styles.eventDetailSparkleIconSmall}
            />
          </View>
        </>
      ) : null}

      <View style={styles.eventDetailHeader}>
        <TouchableOpacity
          style={styles.eventDetailBackButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={24} color={DARK_GRAY} />
        </TouchableOpacity>
        {isJoined || isAdmin ? (
          <TouchableOpacity
            style={styles.eventDetailMenuButton}
            onPress={() => setMenuVisible(true)}
          >
            <Icon name="ellipsis-horizontal" size={24} color={DARK_GRAY} />
          </TouchableOpacity>
        ) : (
          <View style={localStyles.headerSpacer} />
        )}
      </View>

      <ScrollView
        style={styles.eventDetailContent}
        contentContainerStyle={[
          localStyles.scrollContent,
          isChallenge && localStyles.scrollContentChallenge,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {!isChallenge ? (
          <>
            {eventVideoSource ? (
              <View style={localStyles.eventHeroMedia}>
                <Video
                  source={eventVideoSource}
                  style={localStyles.eventHeroVideo}
                  resizeMode={ResizeMode.COVER}
                  isMuted
                  shouldPlay
                  isLooping
                />
                <View style={localStyles.eventHeroScrim} />
                <View style={localStyles.eventHeroContent}>
                  <Text style={localStyles.eventHeroTitle}>{event.title}</Text>
                  <Text style={localStyles.eventHeroSubtitle}>
                    {eventLeadText}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.eventDetailTitleBlock}>
                <Text style={styles.eventDetailTitle}>{event.title}</Text>
                <Text style={styles.eventDetailSubtitle}>{eventLeadText}</Text>
              </View>
            )}

            <View style={styles.eventDetailInfoCard}>
              <View
                style={[
                  styles.eventDetailOrganizerRow,
                  localStyles.eventOrganizerStack,
                ]}
              >
                <View
                  style={[
                    styles.eventDetailOrganizerAvatarWrap,
                    localStyles.eventOrganizerAvatarStack,
                  ]}
                >
                  {eventHostImage ? (
                    <Image
                      source={eventHostImage}
                      style={styles.eventDetailHostAvatar}
                    />
                  ) : (
                    <View style={styles.eventDetailHostAvatarFallback}>
                      <Icon name="person" size={24} color={WHITE} />
                    </View>
                  )}
                </View>
                <View
                  style={[
                    styles.eventDetailOrganizerLabelWrap,
                    localStyles.eventOrganizerLabelStack,
                  ]}
                >
                  <Text style={styles.eventDetailOrganizerLabel}>Organizador</Text>
                  <Text style={styles.eventDetailHostName}>
                    {eventHostName || "Comunidad Vibes"}
                  </Text>
                </View>
              </View>

              <View style={styles.eventDetailInfoSection}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.eventDetailInfoRow}
                  onPress={handleOpenCalendar}
                >
                  <View style={styles.eventDetailInfoIconWrap}>
                    <Icon name="calendar" size={18} color={PRIMARY_COLOR} />
                  </View>
                  <View style={styles.eventDetailInfoCopy}>
                    <Text style={styles.eventDetailInfoText}>{event.date}</Text>
                    <Text style={styles.eventDetailInfoLabel}>
                      Agregar a mi calendario
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={24} color={TEXT_SECONDARY} />
                </TouchableOpacity>

                {modality === "in_person" && eventLocation ? (
                  <>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={styles.eventDetailInfoRow}
                      onPress={handleOpenMap}
                    >
                      <View style={styles.eventDetailInfoIconWrap}>
                        <Icon name="location" size={18} color={PRIMARY_COLOR} />
                      </View>
                      <View style={styles.eventDetailInfoCopy}>
                        <Text style={styles.eventDetailInfoText}>{eventLocation}</Text>
                        <Text style={styles.eventDetailInfoLabel}>Ver en el mapa</Text>
                      </View>
                      <Icon name="chevron-forward" size={24} color={TEXT_SECONDARY} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={localStyles.eventMiniMapCard}
                      onPress={handleOpenMap}
                    >
                      {googleMapsApiKey && !eventMapPreviewFailed ? (
                        <Image
                          source={{
                            uri: getStaticMapPreviewUrl(
                              eventLocation,
                              googleMapsApiKey,
                            ),
                          }}
                          style={localStyles.eventMiniMapImage}
                          onError={() => setEventMapPreviewFailed(true)}
                        />
                      ) : (
                        <View style={localStyles.eventMiniMapFallback}>
                          <View style={localStyles.eventMiniMapPin}>
                            <Icon name="location" size={22} color={PRIMARY_COLOR} />
                          </View>
                          <View style={localStyles.eventMiniMapCopy}>
                            <Text style={localStyles.eventMiniMapTitle}>
                              Ver ubicación
                            </Text>
                            <Text
                              style={localStyles.eventMiniMapText}
                              numberOfLines={2}
                            >
                              {eventLocation}
                            </Text>
                          </View>
                        </View>
                      )}
                      <View style={localStyles.eventMiniMapBadge}>
                        <Icon name="navigate" size={12} color={WHITE} />
                        <Text style={localStyles.eventMiniMapBadgeText}>
                          Abrir mapa
                        </Text>
                      </View>
                    </TouchableOpacity>
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
                    <View style={styles.eventDetailInfoIconWrap}>
                      <Icon
                        name="open-outline"
                        size={18}
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
                    <Icon name="chevron-forward" size={24} color={TEXT_SECONDARY} />
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
                    <View style={styles.eventDetailInfoIconWrap}>
                      <Icon
                        name="videocam-outline"
                        size={18}
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
                    <Icon name="chevron-forward" size={24} color={TEXT_SECONDARY} />
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
                    <View style={styles.eventDetailInfoIconWrap}>
                      <Icon
                        name="card-outline"
                        size={18}
                        color={PRIMARY_COLOR}
                      />
                    </View>
                    <View style={styles.eventDetailInfoCopy}>
                      <Text style={styles.eventDetailInfoText}>
                        {getExternalUrlLabel(paymentLink, "Evento pago")}
                      </Text>
                      <Text style={styles.eventDetailInfoLabel}>Pagar evento</Text>
                    </View>
                    <Icon name="chevron-forward" size={24} color={TEXT_SECONDARY} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <View style={styles.eventDetailClosingNoteWrap}>
              <Text style={styles.eventDetailClosingNote}>
                ✧ Las mejores conexiones comienzan en espacios reales.
              </Text>
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
                onPress={handleOpenCalendar}
              >
                <View style={styles.eventDetailInfoIconWrap}>
                  <Icon name="calendar" size={18} color={PRIMARY_COLOR} />
                </View>
                <View style={styles.eventDetailInfoCopy}>
                  <Text style={styles.eventDetailInfoText}>{challengeStartDate}</Text>
                  <Text style={styles.eventDetailInfoLabel}>
                    Agregar a mi calendario
                  </Text>
                </View>
                <Icon name="chevron-forward" size={24} color={TEXT_SECONDARY} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.eventDetailInfoRow}
                onPress={handleOpenMap}
              >
                <View style={styles.eventDetailInfoIconWrap}>
                  <Icon name="location" size={18} color={PRIMARY_COLOR} />
                </View>
                <View style={styles.eventDetailInfoCopy}>
                  <Text style={styles.eventDetailInfoText}>{challengeLocation}</Text>
                  <Text style={styles.eventDetailInfoLabel}>Ver en el mapa</Text>
                </View>
                <Icon name="chevron-forward" size={24} color={TEXT_SECONDARY} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.eventDetailInfoRow}
                onPress={() => setParticipantsVisible(true)}
              >
                <View style={styles.eventDetailInfoIconWrap}>
                  <Icon name="people" size={18} color={PRIMARY_COLOR} />
                </View>
                <View style={styles.eventDetailInfoCopy}>
                  <Text style={styles.eventDetailInfoText}>
                    {participantCount} participantes
                  </Text>
                  <Text style={styles.eventDetailInfoLabel}>Ver participantes</Text>
                </View>
                <Icon name="chevron-forward" size={24} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Tracking section (solo challenges) ── */}
        {isChallenge ? (
          <>
            {participantLoading ? (
              <ActivityIndicator
                color={PRIMARY_COLOR}
                style={{ marginVertical: 24 }}
              />
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
                        <TouchableOpacity
                          key={`day-${day}`}
                          activeOpacity={0.85}
                          onPress={() => setSelectedProgressDay(selectionKey)}
                          style={[
                            localStyles.dayPill,
                            isDone && localStyles.dayPillDone,
                            isMissed && localStyles.dayPillMissed,
                            isCurrent && localStyles.dayPillCurrent,
                            isSelected && localStyles.dayPillSelected,
                          ]}
                        >
                          <Text
                            style={[
                              localStyles.dayPillText,
                              isDone && localStyles.dayPillTextDone,
                              isMissed && localStyles.dayPillTextMissed,
                              isCurrent && localStyles.dayPillTextCurrent,
                            ]}
                          >
                            {day}
                          </Text>
                        </TouchableOpacity>
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
                      {getStreakHeadline(streak, totalCheckins)}
                    </Text>
                    <Text style={localStyles.streakLabel}>
                      {getStreakMessage(streak, totalCheckins)}
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

                {milestone ? (
                  <View style={localStyles.milestoneWrap}>
                    <View style={localStyles.milestoneBarBg}>
                      <View
                        style={[
                          localStyles.milestoneBarFill,
                          {
                            width: `${Math.min(
                              (streak / milestone) * 100,
                              100,
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={localStyles.milestoneLabel}>
                      {getMilestoneMessage(streak, milestone)}
                    </Text>
                  </View>
                ) : (
                  <Text style={localStyles.milestoneLabel}>
                    {getMilestoneMessage(streak, milestone)}
                  </Text>
                )}

                {showTreeProgress ? (
                  <ChallengeTreeProgress progress={treeProgress} size={200} />
                ) : null}
              </View>
            ) : (
              <View style={localStyles.joinSpacer} />
            )}
          </>
        ) : eventParticipantLoading ? (
          <ActivityIndicator
            color={PRIMARY_COLOR}
            style={{ marginVertical: 24 }}
          />
        ) : isEventParticipant ? (
          <View style={localStyles.joinSpacer} />
        ) : (
          <View style={localStyles.joinSpacer} />
        )}
      </ScrollView>

      {renderBottomActions() ? (
        <View style={localStyles.fixedFooter}>{renderBottomActions()}</View>
      ) : null}

      {/* Modal check-in con nota opcional */}
      <Modal
        visible={checkInModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCheckInModalVisible(false)}
      >
        <View style={localStyles.modalOverlay}>
          <View style={localStyles.modalCard}>
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
            <TouchableOpacity
              style={localStyles.modalConfirmButton}
              onPress={handleCheckIn}
              disabled={checkInMutation.isPending}
            >
              {checkInMutation.isPending ? (
                <ActivityIndicator color={WHITE} size="small" />
              ) : (
                <Text style={localStyles.modalConfirmText}>
                  Confirmar check-in 🔥
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={localStyles.modalCancelButton}
              onPress={() => setCheckInModalVisible(false)}
            >
              <Text style={localStyles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Menú hamburguesa ── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={localStyles.menuBackdrop}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          />
        </View>
        <View style={localStyles.menuSheet}>
          <View style={localStyles.menuHandle} />
          <Text style={localStyles.menuTitle}>{event.title}</Text>

          <TouchableOpacity
            style={localStyles.menuItem}
            onPress={() => {
              setMenuVisible(false);
              setParticipantsVisible(true);
            }}
          >
            <Icon name="people" size={20} color={DARK_GRAY} />
            <Text style={localStyles.menuItemText}>
              Participantes ({participantCount})
            </Text>
            <Icon name="chevron-forward" size={16} color={TEXT_SECONDARY} />
          </TouchableOpacity>

          {isJoined ? (
            <TouchableOpacity
              style={localStyles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate("EventChat" as never, { event } as never);
              }}
            >
              <Icon name="chatbubbles" size={20} color={DARK_GRAY} />
              <Text style={localStyles.menuItemText}>Chat del challenge</Text>
              <Icon name="chevron-forward" size={16} color={TEXT_SECONDARY} />
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
                <Icon name="create-outline" size={20} color={DARK_GRAY} />
                <Text style={localStyles.menuItemText}>Editar evento</Text>
                <Icon name="chevron-forward" size={16} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            </>
          ) : null}

          {isJoined && !isAdmin ? (
            <TouchableOpacity
              style={[localStyles.menuItem, localStyles.menuItemDanger]}
              onPress={handleLeave}
            >
              <Icon name="exit" size={20} color="#D32F2F" />
              <Text style={[localStyles.menuItemText, { color: "#D32F2F" }]}>
                Salir del challenge
              </Text>
            </TouchableOpacity>
          ) : null}

          {isAdmin ? (
            <>
              <View style={localStyles.menuDivider} />
              <Text style={localStyles.menuSectionLabel}>Admin</Text>
              <TouchableOpacity
                style={[localStyles.menuItem, localStyles.menuItemDanger]}
                onPress={handleLeave}
              >
                <Icon name="exit" size={20} color="#D32F2F" />
                <Text style={[localStyles.menuItemText, { color: "#D32F2F" }]}>
                  Abandonar challenge
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[localStyles.menuItem, localStyles.menuItemDanger]}
                onPress={handleDelete}
              >
                <Icon name="trash" size={20} color="#D32F2F" />
                <Text style={[localStyles.menuItemText, { color: "#D32F2F" }]}>
                  Eliminar challenge
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
        </View>
      </Modal>

      {/* ── Modal participantes ── */}
      <Modal
        visible={participantsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setParticipantsVisible(false)}
      >
        <View style={localStyles.participantsModalOverlay}>
          <View style={localStyles.participantsModalCard}>
            <View style={localStyles.participantsModalHeader}>
              <Text style={localStyles.participantsModalTitle}>
                Participantes ({participantCount})
              </Text>
              <TouchableOpacity onPress={() => setParticipantsVisible(false)}>
                <Icon name="close" size={24} color={DARK_GRAY} />
              </TouchableOpacity>
            </View>
          <FlatList
            data={challengeParticipants}
            keyExtractor={(item) => item.id}
            style={{ maxHeight: 380 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={localStyles.memberRow}
                activeOpacity={0.85}
                onPress={() =>
                  setSelectedParticipant({
                    userId: item.userId,
                    displayName: item.displayName,
                    avatarUrl: item.avatarUrl,
                  })
                }
              >
                <Image
                  source={item.avatarUrl ? { uri: item.avatarUrl } : LOGO}
                  style={localStyles.memberAvatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={localStyles.memberName}>
                    {item.displayName || "Participante"}
                    {item.userId === event.createdBy ? " 👑" : ""}
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
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(selectedParticipant && selectedParticipantCard)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedParticipant(null)}
      >
        <View style={styles.discoverSheetRoot}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.discoverSheetBackdrop}
            onPress={() => setSelectedParticipant(null)}
          />
          <TouchableOpacity
            style={styles.discoverSheetCloseButton}
            onPress={() => setSelectedParticipant(null)}
            activeOpacity={0.9}
          >
            <Icon name="close" size={20} color="#2B2B2B" />
          </TouchableOpacity>
          <View style={styles.discoverSheetContainer}>
            <View style={styles.discoverSheetHandle} />
            {selectedParticipantCard ? (
              <CardItem
                variant="discover"
                image={selectedParticipantCard.image}
                name={selectedParticipantCard.name}
                age={selectedParticipantCard.age}
                location={selectedParticipantCard.location}
                description={selectedParticipantCard.description}
                vibe={selectedParticipantCard.vibe}
                intention={selectedParticipantCard.intention}
                prompt={selectedParticipantCard.prompt}
                tags={selectedParticipantCard.tags}
                preferences={selectedParticipantCard.preferences}
                vegetarian={selectedParticipantCard.vegetarian}
                smoking={selectedParticipantCard.smoking}
                pets={selectedParticipantCard.pets}
                images={selectedParticipantCard.images}
                onContactPress={handleConnectParticipant}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const localStyles = StyleSheet.create({
  challengeWhiteBackground: {
    backgroundColor: WHITE,
  },
  trackingCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#E4B76E",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    alignItems: "stretch",
    gap: 14,
  },
  daysPanel: {
    backgroundColor: "#FBF5EA",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#F0E1C7",
  },
  eventHeroMedia: {
    minHeight: 232,
    borderRadius: 28,
    overflow: "hidden",
    marginBottom: 18,
    justifyContent: "flex-end",
    backgroundColor: "#C9B89A",
  },
  eventHeroVideo: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  eventHeroScrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(37, 26, 11, 0.36)",
  },
  eventHeroContent: {
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  eventHeroTitle: {
    color: WHITE,
    fontSize: 36,
    lineHeight: 38,
    fontFamily: "CormorantGaramond_700Bold",
  },
  eventHeroSubtitle: {
    marginTop: 6,
    color: "rgba(255,255,255,0.92)",
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "CormorantGaramond_500Medium",
  },
  eventMiniMapCard: {
    height: 116,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#FBF5EA",
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.24)",
    marginTop: 2,
    marginBottom: 6,
  },
  eventMiniMapImage: {
    width: "100%",
    height: "100%",
  },
  eventMiniMapFallback: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FBF5EA",
  },
  eventMiniMapPin: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(228, 183, 110, 0.16)",
  },
  eventMiniMapCopy: {
    flex: 1,
  },
  eventMiniMapTitle: {
    color: DARK_GRAY,
    fontSize: 16,
    fontFamily: "CormorantGaramond_700Bold",
  },
  eventMiniMapText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontFamily: "CormorantGaramond_500Medium",
    marginTop: 2,
  },
  eventMiniMapBadge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(43, 43, 43, 0.72)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  eventMiniMapBadgeText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "700",
  },
  daysWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignSelf: "flex-start",
  },
  dayPill: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4EFE7",
    borderWidth: 1,
    borderColor: "#E7DCC7",
  },
  dayPillDone: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  dayPillMissed: {
    backgroundColor: "#FFF1EE",
    borderColor: "#E7A596",
  },
  dayPillCurrent: {
    backgroundColor: "#FFF8ED",
    borderColor: PRIMARY_COLOR,
  },
  dayPillSelected: {
    transform: [{ scale: 1.06 }],
    shadowColor: PRIMARY_COLOR,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  dayPillText: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    fontFamily: "CormorantGaramond_700Bold",
  },
  dayPillTextDone: {
    color: WHITE,
  },
  dayPillTextMissed: {
    color: "#C96A54",
  },
  dayPillTextCurrent: {
    color: PRIMARY_COLOR,
  },
  scrollContent: {
    paddingBottom: 180,
  },
  scrollContentChallenge: {
    paddingTop: 72,
  },
  joinSpacer: {
    height: 12,
  },
  fixedFooter: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 22,
  },
  fixedFooterContent: {
    backgroundColor: "rgba(246, 246, 244, 0.96)",
    borderRadius: 24,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 8,
    shadowColor: "#E4B76E",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  eventOrganizerStack: {
    flexDirection: "column",
    alignItems: "center",
  },
  eventOrganizerAvatarStack: {
    marginRight: 0,
    marginBottom: 10,
  },
  eventOrganizerLabelStack: {
    alignItems: "center",
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  fixedFooterNote: {
    marginBottom: 8,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  streakEmoji: {
    fontSize: 36,
  },
  streakTextWrap: {
    flex: 1,
  },
  streakCount: {
    fontSize: 24,
    fontFamily: "CormorantGaramond_700Bold",
    color: DARK_GRAY,
  },
  streakLabel: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontFamily: "CormorantGaramond_500Medium",
    marginTop: 2,
  },
  totalBadge: {
    alignItems: "center",
    backgroundColor: "#FDF6EC",
    borderRadius: 12,
    minWidth: 76,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E4B76E",
  },
  totalBadgeNumber: {
    fontSize: 18,
    fontFamily: "CormorantGaramond_700Bold",
    color: PRIMARY_COLOR,
  },
  totalBadgeLabel: {
    fontSize: 10,
    color: TEXT_SECONDARY,
    fontFamily: "CormorantGaramond_500Medium",
  },
  milestoneWrap: {
    gap: 6,
  },
  milestoneBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F0EDE8",
    overflow: "hidden",
  },
  milestoneBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: PRIMARY_COLOR,
  },
  milestoneLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontFamily: "CormorantGaramond_500Medium",
  },
  checkedInBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FFF4",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  checkedInText: {
    color: "#2E7D32",
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 14,
  },
  checkInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 24,
    paddingVertical: 14,
    shadowColor: PRIMARY_COLOR,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  checkInButtonText: {
    color: WHITE,
    fontFamily: "CormorantGaramond_700Bold",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(43, 43, 43, 0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "CormorantGaramond_700Bold",
    color: DARK_GRAY,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontFamily: "CormorantGaramond_500Medium",
    textAlign: "center",
  },
  noteInput: {
    backgroundColor: "#F6F6F4",
    borderRadius: 12,
    padding: 14,
    color: DARK_GRAY,
    fontFamily: "CormorantGaramond_500Medium",
    fontSize: 15,
    minHeight: 72,
    textAlignVertical: "top",
  },
  modalConfirmButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: PRIMARY_COLOR,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  modalConfirmText: {
    color: WHITE,
    fontFamily: "CormorantGaramond_700Bold",
    fontSize: 16,
  },
  modalCancelButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  modalCancelText: {
    color: TEXT_SECONDARY,
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 14,
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: PRIMARY_COLOR,
    borderRadius: 24,
    paddingVertical: 12,
    marginTop: 4,
  },
  chatButtonText: {
    color: PRIMARY_COLOR,
    fontFamily: "CormorantGaramond_700Bold",
    fontSize: 15,
  },
  // ── Menú hamburguesa ──
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(43,43,43,0.45)",
  },
  menuSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 4,
  },
  menuHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0DDD8",
    alignSelf: "center",
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 18,
    fontFamily: "CormorantGaramond_700Bold",
    color: DARK_GRAY,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EDE8",
  },
  menuItemDanger: {
    borderBottomColor: "#FFE8E8",
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "CormorantGaramond_600SemiBold",
    color: DARK_GRAY,
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#F0EDE8",
    marginVertical: 8,
  },
  menuSectionLabel: {
    fontSize: 12,
    fontFamily: "CormorantGaramond_600SemiBold",
    color: TEXT_SECONDARY,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  menuCancel: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  menuCancelText: {
    fontSize: 15,
    fontFamily: "CormorantGaramond_600SemiBold",
    color: TEXT_SECONDARY,
  },
  // ── Participantes ──
  participantsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(43, 43, 43, 0.5)",
    justifyContent: "flex-end",
  },
  participantsModalCard: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  participantsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  participantsModalTitle: {
    fontSize: 20,
    fontFamily: "CormorantGaramond_700Bold",
    color: DARK_GRAY,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EDE8",
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  memberName: {
    fontSize: 16,
    fontFamily: "CormorantGaramond_600SemiBold",
    color: DARK_GRAY,
  },
  emptyParticipants: {
    textAlign: "center",
    paddingVertical: 24,
    color: TEXT_SECONDARY,
    fontFamily: "CormorantGaramond_500Medium",
    fontSize: 15,
  },
});

export default EventDetail;
