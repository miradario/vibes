/** @format */

import React, { useState, useEffect } from "react";
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
  Dimensions,
} from "react-native";
import { ResizeMode, Video } from "expo-av";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useNavigation, useRoute } from "@react-navigation/native";
import styles, {
  TEXT_SECONDARY,
  PRIMARY_COLOR,
  WHITE,
  DARK_GRAY,
} from "../assets/styles";
import Icon from "../components/Icon";
import ChallengeTreeProgress from "../components/ChallengeTreeProgress";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  useChallengeParticipantQuery,
  useChallengeCheckinsQuery,
  useChallengeParticipantsQuery,
  useJoinChallengeMutation,
  useCheckInChallengeMutation,
  useLeaveChallengeMutation,
  useDeleteChallengeMutation,
  useIsEventParticipantQuery,
  useJoinEventMutation,
} from "../src/queries/events.queries";
import {
  getChallengeMediaPreset,
  parseChallengeMediaPreset,
} from "../src/constants/challengeMediaPresets";


const CHALLENGE_TREE_BG = require("../assets/images/challengeTree.png");
const EVENT_TREE_BG = require("../assets/images/eventTree.png");
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 90];

const getStreakEmoji = (streak: number) => {
  if (streak >= 30) return "🔥🔥🔥";
  if (streak >= 14) return "🔥🔥";
  if (streak >= 3) return "🔥";
  return "✨";
};

const getStreakMessage = (streak: number) => {
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

  const isJoined = Boolean(participant);
  const checkedInToday = participant?.checkedInToday ?? false;
  const streak = participant?.streak ?? 0;
  const totalCheckins = participant?.totalCheckins ?? 0;
  const milestone = nextMilestone(streak);
  const durationDays =
    typeof event?.durationDays === "number" && event.durationDays > 0
      ? event.durationDays
      : 21;
  const treeProgress = Math.min(streak / durationDays, 1);
  const challengeStartDate = formatStartDate(
    event?.startsAt ?? event?.createdAt,
  );
  const selectedChallengePreset = getChallengeMediaPreset(
    event?.imagePresetId ?? parseChallengeMediaPreset(event?.imageUrl),
  );
  const selectedEventPreset = getChallengeMediaPreset(
    event?.imagePresetId ?? parseChallengeMediaPreset(event?.imageUrl),
  );
  const startDate = event?.createdAt ? new Date(event.createdAt) : null;
  const validStartDate =
    startDate && !Number.isNaN(startDate.getTime()) ? startDate : null;
  const todayKey = formatDayKey(new Date());
  const checkinSet = new Set(challengeCheckins);
  const eventMediaSource =
    typeof event?.image === "string" ? { uri: event.image } : event?.image;
  const eventVideoSource = selectedEventPreset?.video
    ? selectedEventPreset.video
    : isVideoMedia(event?.imageUrl)
    ? { uri: event.imageUrl }
    : isVideoMedia(event?.image)
    ? { uri: event.image }
    : null;

  // Animated tree background
  const treeBgOpacity = useSharedValue(0);
  useEffect(() => {
    if (isChallenge) {
      const target = isJoined ? 0.08 + treeProgress * 0.17 : 0.06;
      treeBgOpacity.value = withTiming(target, {
        duration: 1800,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      // Events: gentle fade-in
      treeBgOpacity.value = withTiming(0.12, {
        duration: 1800,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [isChallenge, isJoined, treeProgress]);

  const treeBgStyle = useAnimatedStyle(() => ({
    opacity: treeBgOpacity.value,
  }));

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
            <Text style={styles.eventDetailJoinButtonText}>
              Ir al chat del evento
            </Text>
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
            <Text style={styles.eventDetailJoinButtonText}>
              Sumarme al evento
            </Text>
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

  if (!event) return null;

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
    <View style={styles.eventDetailContainer}>
      {/* Animated tree background */}
      <Animated.Image
        source={isChallenge ? CHALLENGE_TREE_BG : EVENT_TREE_BG}
        style={[localStyles.challengeTreeBg, treeBgStyle]}
        resizeMode="contain"
        pointerEvents="none"
      />

      {!isChallenge ? (
        eventVideoSource ? (
          <Video
            source={eventVideoSource}
            style={styles.eventDetailHeroImage}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isMuted
          />
        ) : (
          <Image
            source={eventMediaSource}
            style={styles.eventDetailHeroImage}
          />
        )
      ) : null}

      <View style={styles.eventDetailHeader}>
        <TouchableOpacity
          style={styles.eventDetailBackButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={24} color="#F6F6F4" />
        </TouchableOpacity>
        {isJoined || isAdmin ? (
          <TouchableOpacity
            style={styles.eventDetailMenuButton}
            onPress={() => setMenuVisible(true)}
          >
            <Icon name="ellipsis-horizontal" size={24} color="#F6F6F4" />
          </TouchableOpacity>
        ) : (
          <View style={styles.eventDetailMenuButton} />
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
        <Text style={styles.eventDetailTitle}>{event.title}</Text>
        {eventDescription ? (
          <Text style={styles.eventDetailDescription}>{eventDescription}</Text>
        ) : null}

        {!isChallenge && eventHostName ? (
          <View style={styles.eventDetailHostSection}>
            {eventHostImage ? (
              <Image
                source={eventHostImage}
                style={styles.eventDetailHostAvatar}
              />
            ) : null}
            <Text style={styles.eventDetailHostName}>{eventHostName}</Text>
          </View>
        ) : null}

        <View style={styles.eventDetailInfoSection}>
          <View style={styles.eventDetailInfoRow}>
            <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
            <Text style={styles.eventDetailInfoText}>
              {isChallenge ? challengeStartDate : event.date}
            </Text>
          </View>

          {!isChallenge && eventLocation ? (
            <View style={styles.eventDetailInfoRow}>
              <Icon name="location" size={20} color={TEXT_SECONDARY} />
              <Text style={styles.eventDetailInfoText}>{eventLocation}</Text>
            </View>
          ) : null}

          {!isChallenge && eventTags.length > 0 ? (
            <View style={styles.eventDetailInfoRow}>
              <Icon name="leaf" size={20} color={TEXT_SECONDARY} />
              <Text style={styles.eventDetailInfoText}>
                {eventTags.join(" · ")}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Tracking section (solo challenges) ── */}
        {isChallenge ? (
          <>
            <View style={localStyles.challengeMediaCard}>
              <Video
                source={
                  selectedChallengePreset?.video ||
                  require("../assets/videos/challenge.mp4")
                }
                style={localStyles.challengeVideo}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                isMuted
              />
            </View>

            {participantLoading ? (
              <ActivityIndicator
                color={PRIMARY_COLOR}
                style={{ marginVertical: 24 }}
              />
            ) : isJoined ? (
              <View style={localStyles.trackingCard}>
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

                    return (
                      <View
                        key={`day-${day}`}
                        style={[
                          localStyles.dayPill,
                          isDone && localStyles.dayPillDone,
                          isMissed && localStyles.dayPillMissed,
                          isCurrent && localStyles.dayPillCurrent,
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
                      </View>
                    );
                  })}
                </View>

                <ChallengeTreeProgress progress={treeProgress} size={200} />

                <View style={localStyles.streakRow}>
                  <Text style={localStyles.streakEmoji}>
                    {getStreakEmoji(streak)}
                  </Text>
                  <View style={localStyles.streakTextWrap}>
                    <Text style={localStyles.streakCount}>{streak} días</Text>
                    <Text style={localStyles.streakLabel}>
                      {getStreakMessage(streak)}
                    </Text>
                  </View>
                  <View style={localStyles.totalBadge}>
                    <Text style={localStyles.totalBadgeNumber}>
                      {totalCheckins}
                    </Text>
                    <Text style={localStyles.totalBadgeLabel}>total</Text>
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
                      {milestone - streak} días para los {milestone} días 🏆
                    </Text>
                  </View>
                ) : (
                  <Text style={localStyles.milestoneLabel}>
                    ¡Alcanzaste todos los milestones! 🏆
                  </Text>
                )}
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
              Racha actual: {streak} días · mañana serán {streak + 1}
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
              Participantes ({challengeParticipants.length})
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
        <View style={localStyles.menuBackdrop}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setParticipantsVisible(false)}
          />
        </View>
        <View style={[localStyles.menuSheet, { paddingBottom: 32 }]}>
          <View style={localStyles.menuHandle} />
          <Text style={localStyles.menuTitle}>
            Participantes ({challengeParticipants.length})
          </Text>
          <FlatList
            data={challengeParticipants}
            keyExtractor={(item) => item.id}
            style={{ maxHeight: 380 }}
            renderItem={({ item }) => (
              <View style={localStyles.participantRow}>
                <Image
                  source={item.avatarUrl ? { uri: item.avatarUrl } : LOGO}
                  style={localStyles.participantAvatar}
                />
                <Text style={localStyles.participantName}>
                  {item.displayName || "Participante"}
                  {item.userId === event.createdBy ? " 👑" : ""}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={localStyles.emptyParticipants}>
                Nadie se sumó todavía
              </Text>
            }
          />
          <TouchableOpacity
            style={localStyles.menuCancel}
            onPress={() => setParticipantsVisible(false)}
          >
            <Text style={localStyles.menuCancelText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const localStyles = StyleSheet.create({
  challengeTreeBg: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    width: SCREEN_HEIGHT * 0.55,
    height: SCREEN_HEIGHT * 0.55,
    zIndex: 0,
  },
  trackingCard: {
    marginTop: 20,
    backgroundColor: WHITE,
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
  challengeMediaCard: {
    marginTop: 20,
    height: 220,
    overflow: "hidden",
    backgroundColor: WHITE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(228, 183, 110, 0.18)",
    shadowColor: "#E4B76E",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  challengeVideo: {
    width: "100%",
    height: "100%",
  },
  daysWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayPill: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 16,
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
  dayPillText: {
    fontSize: 13,
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
    fontSize: 22,
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
    paddingHorizontal: 10,
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
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EDE8",
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  participantName: {
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
