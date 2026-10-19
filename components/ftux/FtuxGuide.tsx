import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../Typography";
import PlayfulVibesLogo from "../PlayfulVibesLogo";
import AnimatedSheetModal from "../AnimatedSheetModal";
import VibesActionButton from "../VibesActionButton";
import { vibesTheme } from "../../src/theme/vibesTheme";
import { useI18n } from "../../src/i18n";
import { useAuthSession } from "../../src/auth/auth.queries";
import { useVibiEnabled } from "../../src/featureFlags/useVibiEnabled";
import { useVibiRuntime } from "../../src/vibi/useMotionPreference";
import { localDayKey } from "../../src/lib/profileQuestions";
import Svg, { Path } from "react-native-svg";
import {
  TAB_FLOATING_BUTTON_SIZE,
  TAB_FLOATING_TOP,
  getTabBarFrame,
  getTabSlotCenterX,
} from "../../src/lib/tabBarLayout";
import {
  STEP_ROUTE,
  TOUR_ORDER,
  canShowWelcome,
  isCoachStep,
  stepNumber,
  type FtuxCoachStep,
  type FtuxStep,
} from "../../src/ftux/ftuxMachine";
import {
  dispatchFtux,
  getFtuxState,
  markFtuxAction,
  setFtuxHighlightedTab,
  useFtuxState,
} from "../../src/ftux/ftuxStore";
import { getFtuxEntrySnapshot } from "../../src/ftux/entrySignals";
import { useFtuxProfileCompletion } from "./useFtuxProfileCompletion";

/** Visible tabs, in CustomTabBar order ("Aura" is hidden). */
const VISIBLE_TABS = ["Flow", "EventsTab", "Home", "Discover", "Calendar"];
const TOTAL_STEPS = TOUR_ORDER.length;
/** Each new step shows its screen first; Vibi's card/panel appears after this. */
export const STEP_REVEAL_DELAY_MS = 1000;
const colors = vibesTheme.colors;
const DIM_COLOR = "rgba(43, 43, 43, 0.42)";

type SheetStep = "welcome" | "alt" | "profile" | "closing";
export type FtuxGuideProps = {
  /** Current leaf route and whether the tab bar is on screen (from App.tsx). */
  routeName: string;
  hasBottomBar: boolean;
  navigate: (name: string, params?: Record<string, unknown>) => void;
};

/**
 * Vibi-guided tour over the real screens. Mounted once in App.tsx, next to
 * VibiOverlay. Welcome → Descubrir (1/4) → Desafíos (2/4) → Eventos (3/4) →
 * Perfil (4/4) → Cierre. Leaving midway pauses it (no Home checklist).
 */
export default function FtuxGuide({ routeName, hasBottomBar, navigate }: FtuxGuideProps) {
  const { t } = useI18n();
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const state = useFtuxState(userId, session?.user?.created_at);
  const involved = Boolean(state && state.status !== "ineligible");
  const completion = useFtuxProfileCompletion(involved ? userId : undefined);
  const vibiEnabled = useVibiEnabled();
  const onHome = routeName === "Home" && hasBottomBar;

  // Route history for the welcome gate, and pause when the tour loses its tab.
  const homeFocusSince = useRef<number | null>(null);
  const lastAwayAt = useRef<number | null>(null);
  // "Completar mi perfil" leaves for the edit screen: show the closing when they come back.
  const closingAfterRouteChange = useRef(false);
  useEffect(() => {
    closingAfterRouteChange.current = false;
    const now = Date.now();
    if (onHome) homeFocusSince.current = now;
    else {
      homeFocusSince.current = null;
      lastAwayAt.current = now;
    }
    const current = getFtuxState(userId);
    if (!userId || !current || current.status !== "active" || current.step === "closing") return;
    if (hasBottomBar && routeName === STEP_ROUTE[current.step]) return;
    // A tab tap, a notification or a deep link took the person elsewhere:
    // keep the progress and let the Home checklist resume it.
    dispatchFtux(userId, { type: "PAUSE" });
  }, [routeName, hasBottomBar]); // eslint-disable-line react-hooks/exhaustive-deps

  const [welcomeReady, setWelcomeReady] = useState(false);
  const pending = state?.status === "pending";
  useEffect(() => {
    if (!userId || !pending || !onHome) {
      setWelcomeReady(false);
      return;
    }
    const check = () => {
      const entry = getFtuxEntrySnapshot();
      const ready = canShowWelcome({
        now: Date.now(),
        bootAt: entry.bootAt,
        onHome: true,
        homeFocusSince: homeFocusSince.current,
        lastAwayAt: lastAwayAt.current,
        externalEntryAt: entry.externalEntryAt,
        pendingExternal: entry.pendingExternal,
        deferredLinkSettled: entry.deferredLinkSettled,
      });
      if (ready) {
        setWelcomeReady(true);
        clearInterval(timer);
      }
    };
    const timer = setInterval(check, 400);
    check();
    return () => clearInterval(timer);
  }, [userId, pending, onHome]);

  useEffect(() => {
    if (welcomeReady && pending && userId)
      dispatchFtux(userId, { type: "WELCOME_SHOWN", day: localDayKey() });
  }, [welcomeReady, pending, userId]);

  useEffect(() => {
    if (involved && completion.complete) void markFtuxAction(userId, "profileCompleted");
  }, [involved, completion.complete, userId]);

  const active = state?.status === "active";
  const sheetStep: SheetStep | null = !state || !userId
    ? null
    : pending && welcomeReady && onHome
      ? "welcome"
      : active && state.step === "alt" && onHome
        ? "alt"
        : active && state.step === "profile" && hasBottomBar && routeName === "Aura"
          ? "profile"
          : active && state.step === "closing" && hasBottomBar && !closingAfterRouteChange.current
            ? "closing"
            : null;
  const coachStep: FtuxCoachStep | null =
    active && state && isCoachStep(state.step) && hasBottomBar && routeName === STEP_ROUTE[state.step]
      ? state.step
      : null;

  // The ring is turned on by CoachCard once it is revealed; clear it otherwise.
  useEffect(() => {
    if (!coachStep) setFtuxHighlightedTab(null);
  }, [coachStep]);
  useEffect(() => () => setFtuxHighlightedTab(null), []);

  useEffect(() => {
    if (!coachStep || !userId) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      dispatchFtux(userId, { type: "PAUSE" });
      return true;
    });
    return () => subscription.remove();
  }, [coachStep, userId]);

  const goToStep = (step: FtuxStep | undefined) => {
    if (!step || step === "closing" || step === "welcome" || step === "alt") return;
    navigate("Tab", { screen: STEP_ROUTE[step] });
  };
  const send = (event: Parameters<typeof dispatchFtux>[1]) => {
    dispatchFtux(userId, event);
    return getFtuxState(userId);
  };

  // Hide the panel on every step change and reveal it after STEP_REVEAL_DELAY_MS.
  // The welcome already waits for a settled Home (WELCOME_SETTLE_MS), so no extra delay.
  const [revealedSheet, setRevealedSheet] = useState<SheetStep | null>(null);
  useEffect(() => {
    if (!sheetStep || sheetStep === "welcome") {
      setRevealedSheet(sheetStep);
      return;
    }
    setRevealedSheet(null);
    const timer = setTimeout(() => setRevealedSheet(sheetStep), STEP_REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [sheetStep]);
  const sheetVisible = sheetStep !== null && revealedSheet === sheetStep;

  // Keep the last revealed content while the modal animates out (and during the delay).
  const lastSheet = useRef<SheetStep>("welcome");
  if (sheetVisible && sheetStep) lastSheet.current = sheetStep;
  const shownSheet = lastSheet.current;

  const profile = completion.profile as Record<string, unknown> | null | undefined;
  const rawName = String(profile?.display_name ?? profile?.displayName ?? "").trim();
  const firstName = rawName.split(/\s+/)[0] ?? "";

  const closeSheet = () => {
    if (shownSheet === "welcome" || shownSheet === "alt") send({ type: "LATER" });
    else if (shownSheet === "profile") send({ type: "PROFILE_LATER" });
    else send({ type: "FINISH" });
  };

  if (!userId || !state || state.status === "ineligible") return null;

  return (
    <>
      <FtuxSheet
        visible={sheetVisible}
        step={shownSheet}
        onClose={closeSheet}
        title={
          shownSheet === "welcome"
            ? firstName
              ? t("ftux.welcome.title", { name: firstName })
              : t("ftux.welcome.titleNoName")
            : t(`ftux.${shownSheet}.title`)
        }
        body={
          shownSheet === "closing" && !vibiEnabled
            ? t("ftux.closing.bodyNoVibi")
            : t(`ftux.${shownSheet}.body`)
        }
        stepLabel={
          shownSheet === "profile"
            ? t("ftux.step", { current: TOTAL_STEPS, total: TOTAL_STEPS })
            : null
        }
        progress={
          shownSheet === "profile" && completion.ready
            ? { percent: completion.percent, label: t("ftux.profile.progress", { percent: completion.percent }) }
            : null
        }
        vibiLabel={t("ftux.vibi")}
        bubble={
          shownSheet === "welcome"
            ? firstName
              ? t("ftux.welcome.bubble", { name: firstName })
              : t("ftux.welcome.bubbleNoName")
            : t(`ftux.${shownSheet}.bubble`)
        }
        actions={
          shownSheet === "welcome"
            ? [
                { label: t("ftux.welcome.start"), variant: "start", onPress: () => goToStep(send({ type: "START_TOUR" })?.step) },
                { label: t("ftux.welcome.other"), variant: "outline", onPress: () => send({ type: "CHOOSE_OTHER" }) },
                { label: t("ftux.welcome.later"), variant: "skip", onPress: () => send({ type: "LATER" }) },
              ]
            : shownSheet === "alt"
              ? [
                  { label: t("ftux.alt.challenges"), variant: "start", onPress: () => goToStep(send({ type: "PICK", step: "challenges" })?.step) },
                  { label: t("ftux.alt.events"), variant: "outline", onPress: () => goToStep(send({ type: "PICK", step: "events" })?.step) },
                  { label: t("ftux.alt.later"), variant: "skip", onPress: () => send({ type: "LATER" }) },
                ]
              : shownSheet === "profile"
                ? [
                    {
                      label: t("ftux.profile.start"),
                      variant: "start",
                      onPress: () => {
                        closingAfterRouteChange.current = true;
                        send({ type: "PROFILE_START" });
                        navigate(completion.nextScreen || "EditProfile");
                      },
                    },
                    { label: t("ftux.profile.later"), variant: "skip", onPress: () => send({ type: "PROFILE_LATER" }) },
                  ]
                : [
                    {
                      label: t("ftux.closing.start"),
                      variant: "start",
                      onPress: () => {
                        send({ type: "FINISH" });
                        if (routeName !== "Home") navigate("Tab", { screen: "Home" });
                      },
                    },
                  ]
        }
        dots={shownSheet === "profile" ? TOTAL_STEPS : null}
      />
      {coachStep ? (
        <CoachCard
          key={coachStep}
          step={coachStep}
          title={t(`ftux.${coachStep}.title`)}
          body={t(`ftux.${coachStep}.body`)}
          stepLabel={t("ftux.step", { current: stepNumber(coachStep) ?? 1, total: TOTAL_STEPS })}
          vibiLabel={t("ftux.vibi")}
          bubble={t(`ftux.${coachStep}.bubble`)}
          a11yLabel={t("ftux.a11y.coach")}
          pauseHint={t("ftux.a11y.pauseHint")}
          exploreLabel={t(`ftux.${coachStep}.explore`)}
          nextLabel={
            coachStep === "events"
              ? completion.complete
                ? t("ftux.finishTour")
                : t("ftux.lastStep")
              : t("ftux.next")
          }
          onExplore={() => send({ type: "EXPLORE" })}
          onNext={() => goToStep(send({ type: "NEXT", profileComplete: completion.complete })?.step)}
        />
      ) : null}
    </>
  );
}

type SheetAction = { label: string; variant: "start" | "outline" | "skip"; onPress: () => void };

/** Playful Vibi (same figure as the signup onboarding) with its speech bubble. */
function VibiFigure({
  size,
  bubble,
  play,
  delay,
  reducedMotion,
}: {
  size: number;
  bubble: string;
  /** Pops the bubble in each time this turns true (it is not hidden on false, so it stays during the exit). */
  play: boolean;
  delay: number;
  reducedMotion: boolean;
}) {
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!play) return;
    pop.setValue(0);
    const animation = reducedMotion
      ? Animated.timing(pop, { toValue: 1, duration: 200, delay, useNativeDriver: true })
      : Animated.spring(pop, { toValue: 1, delay, damping: 13, stiffness: 260, mass: 0.7, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [play, delay, reducedMotion, pop]);
  return (
    <View style={[styles.mascot, { width: Math.max(size, 84) }]}>
      <PlayfulVibesLogo style={{ width: size, height: size * 1.2 }} />
      {bubble ? (
        <Animated.View
          style={[
            styles.greetingBubble,
            {
              opacity: pop.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: "clamp" }),
              // Grows from its "tail": the top center, right under Vibi.
              transformOrigin: ["50%", 0, 0],
              transform: reducedMotion
                ? []
                : [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }],
            },
          ]}
        >
          <Text style={styles.greetingText} numberOfLines={2} maxFontSizeMultiplier={1.3}>
            {bubble}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Spring shared by the card pop and the panel slide: playful, little bounce, ~350ms. */
const UNFOLD_SPRING = { damping: 18, stiffness: 220, mass: 0.9 };
const BUBBLE_STAGGER_MS = 120;

/** Smaller figure on narrow screens or with large text so the card still fits. */
const useCompact = () => {
  const { width, fontScale } = useWindowDimensions();
  return width < 380 || fontScale > 1.15;
};

function Dots({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: total }, (_, index) => (
        <View key={index} style={[styles.dot, index + 1 === current && styles.dotActive]} />
      ))}
    </View>
  );
}

export function FtuxSheet({
  visible,
  step,
  onClose,
  title,
  body,
  stepLabel,
  progress,
  vibiLabel,
  bubble,
  actions,
  dots,
}: {
  visible: boolean;
  step: SheetStep;
  onClose: () => void;
  title: string;
  body: string;
  stepLabel: string | null;
  progress: { percent: number; label: string } | null;
  vibiLabel: string;
  bubble: string;
  actions: SheetAction[];
  dots: number | null;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { reducedMotion } = useVibiRuntime();
  const compact = useCompact();
  // Panel slides up with a spring, then its content and Vibi's bubble unfold in sequence.
  const content = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    content.setValue(0);
    const animation = reducedMotion
      ? Animated.timing(content, { toValue: 1, duration: 200, useNativeDriver: true })
      : Animated.spring(content, { toValue: 1, delay: 90, ...UNFOLD_SPRING, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [visible, reducedMotion, content]);
  const contentStyle = {
    opacity: content.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: "clamp" as const }),
    transform: reducedMotion ? [] : [{ translateY: content.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };
  return (
    <AnimatedSheetModal
      visible={visible}
      onClose={onClose}
      closeOnBackdropPress={false}
      offsetY={reducedMotion ? 0 : 140}
      sheetInSpring={reducedMotion ? undefined : UNFOLD_SPRING}
      sheetInDuration={reducedMotion ? 0 : 260}
      sheetOutDuration={reducedMotion ? 0 : 180}
      sheetStyle={[
        styles.sheet,
        { maxHeight: height - insets.top - 16, paddingBottom: Math.max(insets.bottom, 16) + 8 },
      ]}
    >
      <View style={styles.handle} />
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        accessibilityViewIsModal
      >
        <Animated.View style={[styles.sheetContent, contentStyle]}>
        <View style={styles.sheetHeader}>
          <View style={styles.sheetCopy}>
            <View style={styles.metaRow}>
              <Text style={styles.vibiLabel}>{vibiLabel}</Text>
              {stepLabel ? <Text style={styles.stepLabel}>{stepLabel}</Text> : null}
            </View>
            <Text
              accessibilityRole="header"
              style={[styles.sheetTitle, compact && styles.sheetTitleCompact]}
              maxFontSizeMultiplier={1.4}
            >
              {title}
            </Text>
          </View>
          <VibiFigure
            size={compact ? 72 : 92}
            bubble={bubble}
            play={visible}
            delay={90 + BUBBLE_STAGGER_MS * 2}
            reducedMotion={reducedMotion}
          />
        </View>
        <View style={styles.sheetBody}>
          <Text style={styles.body}>{body}</Text>
          {progress ? (
            <View style={styles.progressRow}>
              <View
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: progress.percent }}
                style={styles.track}
              >
                <View style={[styles.fill, { width: `${Math.max(4, Math.min(100, progress.percent))}%` }]} />
              </View>
              <Text style={styles.progressText}>{progress.label}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.sheetActions} key={step}>
          {actions.map((action) =>
            action.variant === "skip" ? (
              <VibesActionButton
                key={action.label}
                label={action.label}
                variant="skip"
                showDivider={false}
                onPress={action.onPress}
              />
            ) : (
              <VibesActionButton
                key={action.label}
                label={action.label}
                variant={action.variant}
                onPress={action.onPress}
                style={action.variant === "start" ? styles.primaryButton : undefined}
                textStyle={action.variant === "start" ? styles.primaryText : undefined}
              />
            )
          )}
        </View>
        {dots ? <Dots total={dots} current={dots} /> : null}
        </Animated.View>
      </ScrollView>
    </AnimatedSheetModal>
  );
}

export function CoachCard({
  step,
  title,
  body,
  stepLabel,
  vibiLabel,
  bubble,
  a11yLabel,
  pauseHint,
  exploreLabel,
  nextLabel,
  onExplore,
  onNext,
}: {
  step: FtuxCoachStep;
  title: string;
  body: string;
  stepLabel: string;
  vibiLabel: string;
  bubble: string;
  a11yLabel: string;
  pauseHint: string;
  exploreLabel: string;
  nextLabel: string;
  onExplore: () => void;
  onNext: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const { reducedMotion } = useVibiRuntime();
  const compact = useCompact();
  const frame = getTabBarFrame(width, insets.bottom, fontScale);
  const cardWidth = Math.min(width - 32, 520);
  const cardLeft = (width - cardWidth) / 2;
  const slotX = getTabSlotCenterX(VISIBLE_TABS.indexOf(STEP_ROUTE[step]), VISIBLE_TABS.length, width);
  const arrowLeft = Math.min(Math.max(slotX - cardLeft - 9, 24), cardWidth - 42);
  // Measure the real overlay (mounted at the app root, same box the tab bar sits
  // in) instead of trusting the window size, which differs on Android.
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const rootWidth = box?.width ?? width;
  const rootHeight = box?.height ?? height;
  const dimHeight = Math.max(0, rootHeight - frame.totalHeight);
  // Spotlight hole around the raised tab bubble (CustomTabBar: floatingWrap + ftuxRing).
  const holeX = slotX + (rootWidth - width) / 2;
  const holeY = dimHeight + TAB_FLOATING_TOP + TAB_FLOATING_BUTTON_SIZE / 2;
  const holeR = (TAB_FLOATING_BUTTON_SIZE + 18) / 2 + 6;
  const dimPath =
    `M0 0H${rootWidth}V${rootHeight}H0Z` +
    `M${holeX - holeR} ${holeY}a${holeR} ${holeR} 0 1 0 ${holeR * 2} 0a${holeR} ${holeR} 0 1 0 ${-holeR * 2} 0Z`;
  const opacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  // Let the person see the new screen first; reduce motion only skips the fade.
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), STEP_REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  // The tab ring appears together with the card (CustomTabBar fades it in).
  useEffect(() => {
    if (!revealed) return;
    setFtuxHighlightedTab(STEP_ROUTE[step]);
    return () => setFtuxHighlightedTab(null);
  }, [revealed, step]);
  useEffect(() => {
    if (!revealed) return;
    if (reducedMotion) {
      opacity.setValue(1);
      return;
    }
    const animation = Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [opacity, reducedMotion, revealed]);
  // The card "unfolds" from the arrow (pointing at the tab): scale + lift + fade, with a spring.
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!revealed) return;
    const animation = reducedMotion
      ? Animated.timing(pop, { toValue: 1, duration: 200, useNativeDriver: true })
      : Animated.spring(pop, { toValue: 1, ...UNFOLD_SPRING, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [pop, reducedMotion, revealed]);
  const cardPopStyle = {
    opacity: pop.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: "clamp" as const }),
    transformOrigin: [arrowLeft + 9, "100%", 0],
    transform: reducedMotion
      ? []
      : [
          { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
          { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
        ],
  };
  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, styles.coachRoot]}
      onLayout={(event) => {
        const { width: w, height: h } = event.nativeEvent.layout;
        setBox((prev) => (prev && prev.width === w && prev.height === h ? prev : { width: w, height: h }));
      }}
    >
      {/* Touch blocker above the tab bar (also during the reveal delay); the tab bar stays tappable. */}
      <View
        style={[styles.touchBlocker, { height: dimHeight }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onStartShouldSetResponder={() => true}
      />
      {revealed ? (
        <>
      {/* Visual dim: the whole screen (status bar to bottom, around the floating bar)
          with a round cutout on the highlighted tab. Never takes touches. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg width={rootWidth} height={rootHeight}>
          <Path d={dimPath} fill={DIM_COLOR} fillRule="evenodd" />
        </Svg>
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        accessibilityLabel={a11yLabel}
        accessibilityHint={pauseHint}
        style={[
          styles.coachCard,
          {
            width: cardWidth,
            left: cardLeft,
            bottom: frame.totalHeight + 10,
            maxHeight: Math.max(220, dimHeight - insets.top - 24),
          },
          cardPopStyle,
        ]}
      >
        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
          <View style={styles.coachHeader}>
            <View style={styles.sheetCopy}>
              <View style={styles.metaRow}>
                <Text style={styles.vibiLabel}>{vibiLabel}</Text>
                <Text style={styles.stepLabel}>{stepLabel}</Text>
              </View>
              <Text
                accessibilityRole="header"
                style={[styles.coachTitle, compact && styles.coachTitleCompact]}
                maxFontSizeMultiplier={1.4}
              >
                {title}
              </Text>
            </View>
            <VibiFigure
              size={compact ? 60 : 76}
              bubble={bubble}
              play={revealed}
              delay={BUBBLE_STAGGER_MS}
              reducedMotion={reducedMotion}
            />
          </View>
          <Text style={[styles.body, styles.coachBody]}>{body}</Text>
          <View style={styles.coachActions}>
            <VibesActionButton
              label={exploreLabel}
              variant="outline"
              onPress={onExplore}
              style={styles.coachButton}
            />
            <VibesActionButton
              label={nextLabel}
              onPress={onNext}
              style={[styles.primaryButton, styles.coachButton]}
              textStyle={styles.primaryText}
            />
          </View>
          <Dots total={TOTAL_STEPS} current={stepNumber(step) ?? 1} />
        </ScrollView>
        <View pointerEvents="none" style={[styles.arrow, { left: arrowLeft }]} />
      </Animated.View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: vibesTheme.spacing.lg,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(110, 110, 110, 0.22)",
    marginBottom: 14,
  },
  sheetContent: {
    gap: vibesTheme.spacing.lg,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sheetCopy: {
    flex: 1,
    gap: 6,
  },
  sheetBody: {
    gap: 6,
    marginTop: -8,
  },
  mascot: {
    alignItems: "center",
    gap: 4,
  },
  // Same bubble as the signup onboarding greeting ("¡Hola, {nombre}!").
  greetingBubble: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: `${colors.accentBlue}14`,
    maxWidth: 120,
  },
  greetingText: {
    color: colors.accentBlue,
    fontFamily: vibesTheme.fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  vibiLabel: {
    color: colors.accentCoral,
    fontFamily: vibesTheme.fonts.semibold,
    fontSize: 14,
    lineHeight: 18,
  },
  stepLabel: {
    color: colors.secondaryText,
    fontFamily: vibesTheme.fonts.medium,
    fontSize: 14,
    lineHeight: 18,
  },
  sheetTitle: {
    color: colors.primaryText,
    fontFamily: vibesTheme.fonts.extraBold,
    fontSize: 27,
    lineHeight: 33,
  },
  sheetTitleCompact: {
    fontSize: 23,
    lineHeight: 29,
  },
  body: {
    color: colors.secondaryText,
    fontFamily: vibesTheme.fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  progressRow: {
    marginTop: 6,
    gap: 6,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(244, 163, 64, 0.18)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.accentMustard,
  },
  progressText: {
    color: colors.primaryText,
    fontFamily: vibesTheme.fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  sheetActions: {
    gap: 12,
  },
  primaryButton: {
    height: undefined,
    minHeight: 54,
    paddingHorizontal: vibesTheme.spacing.md,
    paddingVertical: 10,
  },
  primaryText: {
    color: colors.primaryText,
    fontFamily: vibesTheme.fonts.bold,
    fontSize: 17,
    lineHeight: 22,
    textAlign: "center",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(110, 110, 110, 0.28)",
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.accentMustard,
  },
  coachRoot: {
    zIndex: 60,
    elevation: 60,
  },
  touchBlocker: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  coachCard: {
    position: "absolute",
    backgroundColor: colors.surface,
    borderRadius: vibesTheme.radii.lg,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    shadowColor: colors.primaryText,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  coachHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  coachTitle: {
    color: colors.primaryText,
    fontFamily: vibesTheme.fonts.extraBold,
    fontSize: 23,
    lineHeight: 29,
  },
  coachTitleCompact: {
    fontSize: 20,
    lineHeight: 25,
  },
  coachBody: {
    marginTop: 8,
  },
  coachActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    marginBottom: 12,
  },
  coachButton: {
    flex: 1,
    width: undefined,
  },
  arrow: {
    position: "absolute",
    bottom: -8,
    width: 18,
    height: 18,
    backgroundColor: colors.surface,
    transform: [{ rotate: "45deg" }],
    borderBottomRightRadius: 4,
  },
});
