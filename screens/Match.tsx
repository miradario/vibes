import { getSharedInterests, getMatchIcebreakers } from "../src/lib/matchIcebreakers";
import MatchConnectionLogo, { MatchConnectionSymbol } from "../components/MatchConnectionLogo";
import ScreenContainer from "../components/ScreenContainer";
/** @format */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Text } from "../components/Typography";
import * as Haptics from "expo-haptics";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";

import { useAuthSession } from "../src/auth/auth.queries";
import { useProfileQuery } from "../src/queries/profile.queries";
import { mapOwnProfileToConnectionProfile } from "../src/lib/connectionProfiles";
import { useFindMatchQuery } from "../src/queries/matches.queries";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

const getFirstName = (value?: string | null) =>
  value?.trim()?.split(" ")?.[0] || "Vibes";

const getPrimaryPhotoUri = (profile: any) => {
  if (!profile) return null;
  if (typeof profile.avatarUri === "string" && profile.avatarUri.trim()) {
    return profile.avatarUri.trim();
  }

  const image =
    Array.isArray(profile.images) && profile.images[0]
      ? profile.images[0]
      : profile.image;

  if (typeof image === "object" && image && "uri" in image) {
    return String((image as { uri?: string }).uri ?? "") || null;
  }

  return null;
};

const Match = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const didPlayMatchHaptic = useRef(false);
  const { data: session } = useAuthSession();
  const { data: ownProfileData } = useProfileQuery(session?.user?.id);
  const ownProfile = useMemo(
    () =>
      mapOwnProfileToConnectionProfile(
        ownProfileData,
        session?.user?.email?.split("@")[0]
      ),
    [ownProfileData, session?.user?.email]
  );
  const profile = route?.params?.profile ?? null;
  const { data: matchData } = useFindMatchQuery(profile?.id);
  const ownName = getFirstName(ownProfile.name);
  const otherName = getFirstName(profile?.name);

  useEffect(() => {
    if (didPlayMatchHaptic.current || Platform.OS === "web") return;

    didPlayMatchHaptic.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
      // The celebration remains available on devices without haptic support.
    });
  }, []);

  const { width } = useWindowDimensions();
  const logoAnchorRef = useRef<View>(null);
  const [logoTop, setLogoTop] = useState<number | null>(null);
  const measureLogoAnchor = () => logoAnchorRef.current?.measureInWindow((_x, y) => {
    if (Number.isFinite(y)) setLogoTop(previous => previous === y ? previous : y);
  });
  const avatarSize = Math.min(176, Math.max(96, (width - 62) / 2));
  const [question] = useState(() => Math.floor(Math.random() * 1000));
  const [circlesRoaming, setCirclesRoaming] = useState(false);
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;
  const secondEntrance = useRef(new Animated.Value(0)).current;
  const split = useRef(new Animated.Value(0)).current;
  const titleReveal = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const sharedInterests = useMemo(() => getSharedInterests(
    ownProfile, profile,
  ), [ownProfile, profile]);
  const questions = getMatchIcebreakers(sharedInterests);
  const currentQuestion = questions[question % questions.length];

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReducedMotion(value); });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (reducedMotion === null) return;
    setCirclesRoaming(false);
    entrance.setValue(reducedMotion ? 1 : 0);
    secondEntrance.setValue(reducedMotion ? 1 : 0);
    split.setValue(reducedMotion ? 1 : 0);
    titleReveal.setValue(reducedMotion ? 1 : 0);
    float.setValue(0);
    if (reducedMotion) return;
    const arrival = Animated.stagger(220, [entrance, secondEntrance].map(value =>
      Animated.spring(value, { toValue: 1, damping: 11, stiffness: 55, mass: 1.4, useNativeDriver: true })
    ));
    const drift = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const heading = Animated.sequence([
      Animated.delay(450),
      Animated.spring(titleReveal, { toValue: 1, damping: 12, stiffness: 110, mass: 0.8, useNativeDriver: true }),
    ]);
    const reveal = Animated.sequence([
      Animated.delay(350),
      Animated.timing(split, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      arrival,
    ]);
    // 350 ms lead-in + 850 ms split, then hold above the figure for one second.
    const roamTimer = setTimeout(() => setCirclesRoaming(true), 2200);
    heading.start();
    reveal.start(({ finished }) => { if (finished) drift.start(); });
    return () => { clearTimeout(roamTimer); heading.stop(); reveal.stop(); drift.stop(); };
  }, [reducedMotion, entrance, secondEntrance, float, split, titleReveal]);



  const openChat = (draft?: string) => {
    if (!profile || !matchData) {
      navigation.goBack();
      return;
    }

    navigation.navigate(
      "Chat" as never,
      {
        matchId: matchData.id,
        otherUserId: String(profile.id),
        otherUserName: profile.name,
        otherUserPhoto: getPrimaryPhotoUri(profile),
        initialDraft: draft,
      } as never
    );
  };

  return (
    <View style={localStyles.screen}>
    <ScreenContainer style={localStyles.screen} scroll
      scrollViewProps={{ showsVerticalScrollIndicator: false, onScroll: measureLogoAnchor, scrollEventThrottle: 32 }}
      contentContainerStyle={[localStyles.content, { paddingBottom: Math.max(insets.bottom + ds.spacing[4], ds.spacing[8]) }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar nueva conexión" onPress={() => navigation.goBack()} style={localStyles.close}>
        <Icon name="close" size={ds.iconSize.xl} color={vibesTheme.colors.secondaryText} />
      </Pressable>
      <Text style={localStyles.eyebrow}>¡HAY BUENA VIBE!</Text>
      <Animated.View style={{ opacity: titleReveal, transform: [
        { translateY: titleReveal.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
        { scale: titleReveal.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
      ] }}>
        <Text accessibilityRole="header" style={localStyles.title}>Nueva conexión</Text>
      </Animated.View>


      <View style={localStyles.hero}>
        <View style={localStyles.peopleRow}>
          {[{ name: ownName, uri: ownProfile.avatarUri }, { name: otherName, uri: getPrimaryPhotoUri(profile) }].map((person, index) => (
            <Animated.View key={index} style={[localStyles.person, { opacity: (index ? secondEntrance : entrance).interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1], extrapolate: "clamp" }), transform: [{ translateX: (index ? secondEntrance : entrance).interpolate({ inputRange: [0, 1], outputRange: [index ? width : -width, 0] }) }, { scale: (index ? secondEntrance : entrance).interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
              <View style={localStyles.avatar}><Avatar uri={person.uri ?? null} size={avatarSize} /></View>
              <Text numberOfLines={1} style={localStyles.personName}>{person.name}</Text>
            </Animated.View>
          ))}
        </View>
        <MatchConnectionSymbol drift={float} top={40 + (avatarSize + 4) / 2 - 32} />
        <View ref={logoAnchorRef} collapsable={false} pointerEvents="none"
          onLayout={measureLogoAnchor} style={{ position: "absolute", left: "50%", top: 40 + avatarSize / 2 - 76, width: 1, height: 1 }} />
      </View>
      <View style={{ width: "100%" }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Intereses en común: ${sharedInterests.join(", ") || "Todavía no encontramos coincidencias"}. ${currentQuestion}. Abrir en el chat`} accessibilityHint="Abre el chat con esta pregunta lista para enviar" onPress={() => openChat(currentQuestion)} style={localStyles.questionCard}>
          <View style={localStyles.messageIcon}><Icon name="chatbubble-outline" size={ds.iconSize.lg} color={vibesTheme.colors.accentBlue} /></View>
          <View style={{ flex: 1 }}>
            <Text style={localStyles.interestsLabel}>Intereses en común</Text>
            <Text style={localStyles.sharedInterests}>{sharedInterests.join(" · ") || "Descubran qué les gusta a los dos"}</Text>
            <Text accessibilityLiveRegion="polite" style={localStyles.question}>{currentQuestion}</Text>
          </View>
        </Pressable>
      </View>
      <View style={localStyles.actions}>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: (!profile || !matchData) }} disabled={(!profile || !matchData)} onPress={() => openChat()} style={[localStyles.primary, (!profile || !matchData) && { opacity: 0.5 }]}>
          <Icon name="chatbubble-outline" size={ds.iconSize.lg} color={vibesTheme.colors.surface} />
          <Text style={localStyles.primaryText}>Conversar</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={localStyles.secondary}>
          <Text style={localStyles.secondaryText}>Seguir descubriendo</Text>
        </Pressable>
      </View>
    </ScreenContainer>
    {logoTop !== null && <MatchConnectionLogo photoSize={avatarSize + 4} split={split}
      animate={reducedMotion === false && circlesRoaming} top={logoTop} />}
    </View>
  );
};

const localStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: vibesTheme.colors.background },
  content: { flexGrow: 1, paddingHorizontal: ds.spacing[5], alignItems: "center", paddingTop: ds.spacing[3] },
  close: { alignSelf: "flex-end", width: 44, height: 44, borderRadius: ds.radii.pill, alignItems: "center", justifyContent: "center", backgroundColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.subtle), marginBottom: ds.spacing[3] },
  eyebrow: { color: vibesTheme.colors.accentBlue, ...ds.textStyles.caption, letterSpacing: 2, textAlign: "center" },
  title: { color: vibesTheme.colors.primaryText, ...ds.textStyles.display, textAlign: "center", marginTop: ds.spacing[3] },
  hero: { width: "100%", marginTop: ds.spacing[12], paddingTop: ds.spacing[12], paddingBottom: ds.spacing[8] },
  peopleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  person: { alignItems: "center", maxWidth: "49%" },
  avatar: { borderWidth: 2, borderColor: vibesTheme.colors.primaryText, borderRadius: /* ds-lint-allow DS-TODO: borderRadius 180 sin ancho/alto conocido: ¿círculo (pill) o xl? */ 180, overflow: "hidden" },
  personName: { marginTop: ds.spacing[2], ...ds.textStyles.heading, color: vibesTheme.colors.primaryText },
  questionCard: { width: "100%", borderRadius: ds.radii.xl, padding: ds.spacing[4], flexDirection: "row", alignItems: "center", gap: ds.spacing[4], backgroundColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.subtle) },
  messageIcon: { width: 46, height: 46, borderRadius: ds.radii.pill, alignItems: "center", justifyContent: "center", backgroundColor: ds.colors.feedback.infoBg },
  interestsLabel: { color: vibesTheme.colors.accentBlue, ...ds.textStyles.caption, marginBottom: ds.spacing[1] },
  sharedInterests: { color: vibesTheme.colors.secondaryText, ...ds.textStyles.caption, marginBottom: ds.spacing[2] },
  question: { color: vibesTheme.colors.primaryText, ...ds.textStyles.heading },
  actions: { width: "100%", marginTop: "auto", paddingTop: ds.spacing[8] },
  primary: { minHeight: 56, padding: ds.spacing[4], borderRadius: ds.radii.lg, backgroundColor: vibesTheme.colors.primaryText, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: ds.spacing[3] },
  primaryText: { color: vibesTheme.colors.surface, ...ds.textStyles.heading, flexShrink: 1, textAlign: "center" },
  secondary: { minHeight: 52, alignItems: "center", justifyContent: "center", marginTop: ds.spacing[2] },
  secondaryText: { color: vibesTheme.colors.secondaryText, ...ds.textStyles.subtitle },
});

export default Match;
