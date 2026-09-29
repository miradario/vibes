import { useVibiEnabled } from "../src/featureFlags/useVibiEnabled";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import * as Crypto from "expo-crypto";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "../components/ScreenContainer";
import AnimatedSheetModal from "../components/AnimatedSheetModal";
import UserProfileSheet from "../components/UserProfileSheet";
import type { UserProfileCardData } from "../components/UserProfileCard";
import { Text } from "../components/Typography";
import { useAuthSession } from "../src/auth/auth.queries";
import { vibesTheme } from "../src/theme/vibesTheme";
import {
  fetchVibiHistory,
  resetVibiHistory,
  resolveVibiCard,
  sendVibiMessage,
} from "../src/queries/vibi.queries";
import { fetchEventFeedItemById } from "../src/queries/events.queries";
import { fetchCandidateById } from "../src/queries/candidates.queries";
import { mapCandidateToConnectionProfile } from "../src/lib/connectionProfiles";
import { useSwipeMutation } from "../src/queries/swipes.mutations";
import {
  mergeVibiExchanges,
  vibiErrorMessage,
  type VibiCard,
  type VibiCategory,
  type VibiExchange,
} from "../src/lib/vibi";

const colors = vibesTheme.colors;
const categories: {
  type: VibiCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  prompt: string;
}[] = [
  {
    type: "challenge",
    label: "Desafíos",
    icon: "sparkles-outline",
    prompt: "Quiero encontrar un desafío para mí.",
  },
  {
    type: "event",
    label: "Eventos",
    icon: "calendar-outline",
    prompt: "Quiero encontrar un evento para mí.",
  },
  {
    type: "person",
    label: "Personas",
    icon: "people-outline",
    prompt: "Quiero encontrar personas para conectar.",
  },
];
const labels = { challenge: "DESAFÍO", event: "EVENTO", person: "PERSONA" };
const fallbackImage = require("../assets/images/challenges/vibesLogo.png");
const RecommendationCard = memo(
  ({
    card,
    onOpen,
    disabled,
  }: {
    card: VibiCard;
    onOpen: (card: VibiCard) => void;
    disabled: boolean;
  }) => (
    <Pressable
      style={s.card}
      onPress={() => onOpen(card)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Ver ${card.title}`}
    >
      <Image
        source={card.thumbnail ? { uri: card.thumbnail } : fallbackImage}
        style={s.thumbnail}
        contentFit="cover"
      />
      <View style={s.cardCopy}>
        <Text style={s.eyebrow}>{labels[card.type]}</Text>
        <Text style={s.cardTitle}>{card.title}</Text>
        <Text style={s.reason}>{card.reason}</Text>
        <Text style={s.cardLink}>
          Ver {card.type === "person" ? "perfil" : "detalle"} →
        </Text>
      </View>
    </Pressable>
  )
);
const Exchange = memo(
  ({
    item,
    onOpen,
    disabled,
  }: {
    item: VibiExchange;
    onOpen: (card: VibiCard) => void;
    disabled: boolean;
  }) => (
    <View style={s.exchange}>
      <View style={s.userBubble}>
        <Text style={s.message}>{item.user_text}</Text>
      </View>
      <View style={s.answer}>
        <Text style={s.author}>VIBI</Text>
        <Text style={s.message} selectable>
          {item.assistant_text}
        </Text>
        {item.recommendations.map((card) => (
          <RecommendationCard
            key={`${card.type}:${card.id}`}
            card={card}
            onOpen={onOpen}
            disabled={disabled}
          />
        ))}
      </View>
    </View>
  )
);
function VibiConversation({ userId }: { userId: string }) {
  const navigation = useNavigation<any>();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [exchanges, setExchanges] = useState<VibiExchange[]>([]);
  const [before, setBefore] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<{
    id: string;
    message: string;
    category?: VibiCategory;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [profile, setProfile] = useState<UserProfileCardData | null>(null);
  const swipe = useSwipeMutation();
  const list = useRef<FlatList<VibiExchange>>(null);
  const mounted = useRef(true);
  const busy = useRef(false);
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  const loadVersion = useRef(0);
  const autoScroll = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      loadVersion.current++;
    };
  }, []);
  const reload = useCallback(async () => {
    if (busy.current) return;
    const version = ++loadVersion.current;
    setLoading(true);
    setError(null);
    try {
      const history = await fetchVibiHistory();
      if (!mounted.current || version !== loadVersion.current) return;
      setConversationId(history.conversation_id);
      setExchanges(history.exchanges);
      setBefore(history.before);
      if (
        history.exchanges.some((e) => e.request_id === pendingRef.current?.id)
      ) {
        setPending(null);
        setDraft("");
      }
      autoScroll.current = true;
    } catch (e) {
      if (mounted.current && version === loadVersion.current)
        setError(vibiErrorMessage(e));
    } finally {
      if (mounted.current && version === loadVersion.current) setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );
  const send = async (choice?: (typeof categories)[number]) => {
    if (!conversationId || busy.current || loading || loadingOlder) return;
    const request = pending ?? {
      id: Crypto.randomUUID(),
      message: (choice?.prompt ?? draft).trim(),
      category: choice?.type,
    };
    if (!request.message) return;
    busy.current = true;
    setSending(true);
    setPending(request);
    setError(null);
    setNotice(null);
    autoScroll.current = true;
    try {
      const result = await sendVibiMessage(
        conversationId,
        request.id,
        request.message,
        request.category
      );
      if (!mounted.current) return;
      setExchanges((current) => mergeVibiExchanges(current, [result.exchange]));
      setPending(null);
      setDraft("");
      autoScroll.current = true;
    } catch (e) {
      if (mounted.current) {
        setError(vibiErrorMessage(e));
        if (e instanceof Error && e.message === "conversation_changed") {
          setPending(null);
          setDraft(request.message);
          setConversationId(null);
        }
      }
    } finally {
      busy.current = false;
      if (mounted.current) setSending(false);
    }
  };
  const loadOlder = async () => {
    if (!before || loadingOlder || busy.current) return;
    const version = loadVersion.current;
    setLoadingOlder(true);
    setError(null);
    autoScroll.current = false;
    try {
      const history = await fetchVibiHistory(before);
      if (!mounted.current || version !== loadVersion.current) return;
      if (history.conversation_id !== conversationId) {
        await reload();
        return;
      }
      setExchanges((current) => mergeVibiExchanges(current, history.exchanges));
      setBefore(history.before);
    } catch (e) {
      if (mounted.current) setError(vibiErrorMessage(e));
    } finally {
      if (mounted.current) setLoadingOlder(false);
    }
  };
  const openCard = useCallback(
    async (card: VibiCard) => {
      if (busy.current) return;
      busy.current = true;
      setOpening(true);
      setError(null);
      try {
        await resolveVibiCard(card);
        if (card.type === "person") {
          const candidate = await fetchCandidateById(userId, card.id);
          if (!candidate) throw new Error("recommendation_unavailable");
          if (mounted.current)
            setProfile(mapCandidateToConnectionProfile(candidate));
        } else {
          const event = await fetchEventFeedItemById(card.id, card.type);
          if (!event) throw new Error("recommendation_unavailable");
          if (mounted.current)
            navigation.navigate(
              card.type === "challenge"
                ? "ChallengeDetailScreen"
                : "EventDetail",
              { event }
            );
        }
      } catch (e) {
        if (mounted.current) setError(vibiErrorMessage(e));
      } finally {
        busy.current = false;
        if (mounted.current) setOpening(false);
      }
    },
    [navigation, userId]
  );
  const reset = async () => {
    if (!conversationId || busy.current) return;
    busy.current = true;
    ++loadVersion.current;
    setResetting(true);
    setError(null);
    try {
      await resetVibiHistory(conversationId);
      if (!mounted.current) return;
      setExchanges([]);
      setPending(null);
      setDraft("");
      setConversationId(null);
      setBefore(null);
      setConfirmReset(false);
      busy.current = false;
      await reload();
    } catch (e) {
      if (mounted.current) setError(vibiErrorMessage(e));
    } finally {
      busy.current = false;
      if (mounted.current) setResetting(false);
    }
  };
  const connect = async () => {
    if (!profile?.id || swipe.isPending) return;
    try {
      await resolveVibiCard({ id: profile.id, type: "person" } as VibiCard);
      const result = await swipe.mutateAsync({
        targetUserId: profile.id,
        direction: "like",
      });
      if (!mounted.current) return;
      setProfile(null);
      setNotice(
        result.match
          ? "¡Conectaron! Ya pueden conversar desde Conexiones."
          : "Le enviaste una conexión."
      );
      await reload();
    } catch {
      if (mounted.current)
        setNotice("No pudimos enviar la conexión. Volvé a intentarlo.");
    }
  };
  const disabled = loading || sending || opening || resetting || loadingOlder;
  return (
    <ScreenContainer
      style={s.screen}
      edges={["top", "left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.header}>
          <Pressable
            style={s.iconButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="chevron-back" size={24} color={colors.primaryText} />
          </Pressable>
          <View style={s.avatar}>
            <Ionicons
              name="sparkles-outline"
              size={24}
              color={colors.primaryText}
            />
          </View>
          <View style={s.headerCopy}>
            <Text style={s.title}>Vibi</Text>
            <Text style={s.subtitle}>Tu asistente en Vibes</Text>
          </View>
          <Pressable
            style={s.iconButton}
            disabled={disabled || !conversationId}
            onPress={() => setConfirmReset(true)}
            accessibilityRole="button"
            accessibilityLabel="Borrar conversación"
          >
            <Ionicons
              name="trash-outline"
              size={21}
              color={colors.secondaryText}
            />
          </Pressable>
        </View>
        {loading && !exchanges.length ? (
          <View style={s.loading}>
            <ActivityIndicator color={colors.primaryText} />
            <Text style={s.subtitle}>Abriendo tu conversación…</Text>
          </View>
        ) : (
          <FlatList
            ref={list}
            data={exchanges}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <Exchange item={item} onOpen={openCard} disabled={disabled} />
            )}
            contentContainerStyle={s.messages}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => {
              if (autoScroll.current) {
                list.current?.scrollToEnd({ animated: false });
                autoScroll.current = false;
              }
            }}
            ListHeaderComponent={
              <>
                {before ? (
                  <Pressable
                    style={s.older}
                    onPress={loadOlder}
                    disabled={disabled}
                  >
                    <Text style={s.link}>
                      {loadingOlder ? "Cargando…" : "Ver mensajes anteriores"}
                    </Text>
                  </Pressable>
                ) : (
                  <View style={s.welcome}>
                    <Text style={s.welcomeTitle}>
                      ¿Qué te gustaría encontrar hoy?
                    </Text>
                    <Text style={s.welcomeText}>
                      Te ayudo a descubrir desafíos, eventos y personas según
                      tus intereses y lo que tengas ganas de hacer.
                    </Text>
                  </View>
                )}
              </>
            }
            ListFooterComponent={
              pending ? (
                <View style={s.exchange}>
                  <View style={s.userBubble}>
                    <Text style={s.message}>{pending.message}</Text>
                  </View>
                  <Text style={s.subtitle} accessibilityLiveRegion="polite">
                    {sending
                      ? "Vibi está buscando…"
                      : "El mensaje todavía no se completó."}
                  </Text>
                  {sending ? (
                    <ActivityIndicator
                      style={s.pendingSpinner}
                      color={colors.primaryText}
                    />
                  ) : null}
                </View>
              ) : null
            }
          />
        )}
        {opening ? (
          <Text style={s.status} accessibilityLiveRegion="polite">
            Abriendo recomendación…
          </Text>
        ) : null}
        {notice ? (
          <Text style={s.status} accessibilityLiveRegion="polite">
            {notice}
          </Text>
        ) : null}
        {error ? (
          <View style={s.error} accessibilityLiveRegion="polite">
            <Text style={s.errorText}>{error}</Text>
            <Pressable
              onPress={() => (pending ? void send() : void reload())}
              disabled={disabled}
            >
              <Text style={s.link}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={s.composer}>
          <View style={s.categories}>
            {categories.map((choice) => (
              <Pressable
                key={choice.type}
                accessibilityRole="button"
                accessibilityLabel={`Buscar ${choice.label.toLowerCase()}`}
                style={s.category}
                disabled={disabled || !!pending || !conversationId}
                onPress={() => void send(choice)}
              >
                <Ionicons
                  name={choice.icon}
                  size={16}
                  color={colors.primaryText}
                />
                <Text style={s.categoryText}>{choice.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.inputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              style={s.input}
              multiline
              maxLength={2000}
              editable={!disabled && !pending && !!conversationId}
              placeholder="Contame qué estás buscando…"
              placeholderTextColor={colors.secondaryText}
              accessibilityLabel="Mensaje para Vibi"
              textAlignVertical="top"
            />
            <Pressable
              style={[
                s.send,
                (!draft.trim() || disabled || !!pending) && s.dimmed,
              ]}
              disabled={
                !draft.trim() || disabled || !!pending || !conversationId
              }
              onPress={() => void send()}
              accessibilityRole="button"
              accessibilityLabel="Enviar mensaje"
            >
              <Ionicons name="arrow-up" size={23} color={colors.primaryText} />
            </Pressable>
          </View>
          {draft.length > 1800 ? (
            <Text style={s.counter}>{draft.length}/2000</Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
      <AnimatedSheetModal
        visible={confirmReset}
        onClose={() => {
          if (!resetting) setConfirmReset(false);
        }}
        closeOnBackdropPress={!resetting}
        sheetStyle={s.resetSheet}
      >
        <Text style={s.resetTitle}>¿Empezar de cero?</Text>
        <Text style={s.welcomeText}>
          Se borrarán todos tus mensajes con Vibi. Tus preferencias y conexiones
          se conservan.
        </Text>
        {error ? <Text style={s.errorText}>{error}</Text> : null}
        <Pressable
          style={s.deleteButton}
          disabled={resetting}
          onPress={() => void reset()}
        >
          <Text style={s.buttonText}>
            {resetting ? "Borrando…" : "Borrar conversación"}
          </Text>
        </Pressable>
        <Pressable
          style={s.cancelButton}
          disabled={resetting}
          onPress={() => setConfirmReset(false)}
        >
          <Text style={s.buttonText}>Conservar conversación</Text>
        </Pressable>
      </AnimatedSheetModal>
      <UserProfileSheet
        visible={!!profile}
        profile={profile}
        onClose={() => setProfile(null)}
        onContactPress={connect}
        actionPending={swipe.isPending}
      />
    </ScreenContainer>
  );
}
export default function Vibi() {
  const enabled = useVibiEnabled();
  const navigation = useNavigation();
  const { data: session } = useAuthSession();
  useEffect(() => {
    if (!enabled) {
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate("Home" as never);
    }
  }, [enabled, navigation]);
  if (!enabled) return null;
  return session?.user?.id ? (
    <VibiConversation key={session.user.id} userId={session.user.id} />
  ) : (
    <ScreenContainer style={s.screen}>
      <Text style={s.status}>Iniciá sesión para conversar con Vibi.</Text>
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    gap: 8,
  },
  iconButton: {
    width: 42,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentMustard,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1 },
  title: {
    fontSize: 24,
    color: colors.primaryText,
    fontFamily: vibesTheme.fonts.bold,
  },
  subtitle: { fontSize: 14, lineHeight: 20, color: colors.secondaryText },
  messages: { padding: 20, paddingBottom: 24 },
  welcome: { paddingTop: 16, paddingBottom: 28 },
  welcomeTitle: {
    fontSize: 29,
    lineHeight: 35,
    color: colors.primaryText,
    fontFamily: vibesTheme.fonts.bold,
    marginBottom: 12,
  },
  welcomeText: { fontSize: 17, lineHeight: 24, color: colors.primaryText },
  exchange: { gap: 18, marginBottom: 28 },
  userBubble: {
    alignSelf: "flex-end",
    maxWidth: "90%",
    padding: 15,
    borderRadius: 20,
    backgroundColor: colors.accentMustard,
  },
  answer: { gap: 10, paddingRight: 8 },
  author: { fontSize: 12, letterSpacing: 2, color: colors.secondaryText },
  message: { fontSize: 17, lineHeight: 25, color: colors.primaryText },
  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.accentBlue,
    borderRadius: 18,
    padding: 12,
    gap: 12,
    backgroundColor: colors.surface,
    marginTop: 4,
  },
  thumbnail: {
    width: 72,
    height: 88,
    borderRadius: 12,
    backgroundColor: colors.accentMustard,
  },
  cardCopy: { flex: 1, gap: 5 },
  eyebrow: { fontSize: 10, letterSpacing: 1.4, color: colors.secondaryText },
  cardTitle: {
    fontSize: 18,
    lineHeight: 22,
    color: colors.primaryText,
    fontFamily: vibesTheme.fonts.bold,
  },
  reason: { fontSize: 14, lineHeight: 20, color: colors.secondaryText },
  cardLink: {
    fontSize: 14,
    color: colors.primaryText,
    textDecorationLine: "underline",
    marginTop: 4,
  },
  composer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    gap: 12,
  },
  categories: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  category: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.accentBlue,
  },
  categoryText: { fontSize: 14, color: colors.primaryText },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.secondaryText,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 13,
    fontFamily: vibesTheme.fonts.primary,
    fontSize: 16,
    lineHeight: 22,
    color: colors.primaryText,
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accentMustard,
    alignItems: "center",
    justifyContent: "center",
  },
  dimmed: { opacity: 0.45 },
  counter: { fontSize: 12, color: colors.secondaryText, textAlign: "right" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  pendingSpinner: { alignSelf: "flex-start" },
  status: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.secondaryText,
  },
  error: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.accentCoral,
  },
  errorText: { fontSize: 14, lineHeight: 20, color: colors.primaryText },
  link: {
    color: colors.primaryText,
    fontSize: 15,
    textDecorationLine: "underline",
  },
  older: { padding: 12, alignItems: "center", marginBottom: 16 },
  resetSheet: {
    backgroundColor: colors.surface,
    padding: 24,
    paddingBottom: 36,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 16,
  },
  resetTitle: {
    fontSize: 25,
    color: colors.primaryText,
    fontFamily: vibesTheme.fonts.bold,
  },
  deleteButton: {
    backgroundColor: colors.accentCoral,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
  },
  cancelButton: { padding: 14, alignItems: "center" },
  buttonText: { fontSize: 17, color: colors.primaryText },
});
