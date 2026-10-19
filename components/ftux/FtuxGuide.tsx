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
import Vibi from "../Vibi";
import AnimatedSheetModal from "../AnimatedSheetModal";
import VibesActionButton from "../VibesActionButton";
import { vibesTheme } from "../../src/theme/vibesTheme";
import { useI18n } from "../../src/i18n";
import { useAuthSession } from "../../src/auth/auth.queries";
import { useVibiEnabled } from "../../src/featureFlags/useVibiEnabled";
import { useVibiRuntime } from "../../src/vibi/useMotionPreference";
import { localDayKey } from "../../src/lib/profileQuestions";
import { getTabBarFrame, getTabSlotCenterX } from "../../src/lib/tabBarLayout";
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
const colors = vibesTheme.colors;

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
 * Perfil (4/4) → Cierre; the Home checklist (FtuxChecklistCard) resumes it.
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

  useEffect(() => {
    setFtuxHighlightedTab(coachStep ? STEP_ROUTE[coachStep] : null);
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

  // Keep the last sheet content while the modal animates out.
  const lastSheet = useRef<SheetStep>("welcome");
  if (sheetStep) lastSheet.current = sheetStep;
  const shownSheet = sheetStep ?? lastSheet.current;

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
        visible={sheetStep !== null}
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

function VibiBadge({ size }: { size: number }) {
  return (
    <View style={[styles.vibiBadge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Vibi state="happy" size={size * 0.72} />
    </View>
  );
}

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
  actions: SheetAction[];
  dots: number | null;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { reducedMotion } = useVibiRuntime();
  return (
    <AnimatedSheetModal
      visible={visible}
      onClose={onClose}
      closeOnBackdropPress={false}
      offsetY={reducedMotion ? 0 : 80}
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
        contentContainerStyle={styles.sheetContent}
        accessibilityViewIsModal
      >
        <View style={styles.sheetHeader}>
          <VibiBadge size={56} />
          <View style={styles.sheetCopy}>
            <View style={styles.metaRow}>
              <Text style={styles.vibiLabel}>{vibiLabel}</Text>
              {stepLabel ? <Text style={styles.stepLabel}>{stepLabel}</Text> : null}
            </View>
            <Text accessibilityRole="header" style={styles.sheetTitle}>
              {title}
            </Text>
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
  const frame = getTabBarFrame(width, insets.bottom, fontScale);
  const cardWidth = Math.min(width - 32, 520);
  const cardLeft = (width - cardWidth) / 2;
  const slotX = getTabSlotCenterX(VISIBLE_TABS.indexOf(STEP_ROUTE[step]), VISIBLE_TABS.length, width);
  const arrowLeft = Math.min(Math.max(slotX - cardLeft - 9, 24), cardWidth - 42);
  const dimHeight = Math.max(0, height - frame.totalHeight);
  const opacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      return;
    }
    const animation = Animated.timing(opacity, { toValue: 1, duration: 220, delay: 120, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [opacity, reducedMotion]);
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.coachRoot]}>
      {/* Dim everything but the tab bar, so the highlighted tab stands out. */}
      <Animated.View
        style={[styles.dim, { height: dimHeight, opacity }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onStartShouldSetResponder={() => true}
      />
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
            opacity,
          },
        ]}
      >
        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
          <View style={styles.coachHeader}>
            <VibiBadge size={48} />
            <View style={styles.sheetCopy}>
              <View style={styles.metaRow}>
                <Text style={styles.vibiLabel}>{vibiLabel}</Text>
                <Text style={styles.stepLabel}>{stepLabel}</Text>
              </View>
              <Text accessibilityRole="header" style={styles.coachTitle}>
                {title}
              </Text>
            </View>
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
    alignItems: "flex-start",
    gap: 14,
  },
  sheetCopy: {
    flex: 1,
    gap: 6,
  },
  vibiBadge: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(43, 43, 43, 0.08)",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  vibiLabel: {
    color: colors.accentBlue,
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
    fontFamily: vibesTheme.fonts.bold,
    fontSize: 22,
    lineHeight: 28,
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
    backgroundColor: "rgba(57, 120, 184, 0.14)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.accentBlue,
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
    backgroundColor: colors.accentBlue,
  },
  coachRoot: {
    zIndex: 60,
    elevation: 60,
  },
  dim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(43, 43, 43, 0.42)",
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
    fontFamily: vibesTheme.fonts.bold,
    fontSize: 19,
    lineHeight: 25,
  },
  coachBody: {
    marginTop: 12,
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
