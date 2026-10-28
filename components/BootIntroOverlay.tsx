import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, { Easing, cancelAnimation, runOnJS, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import { LOGO_MORPH_DURATION, logoMorphPath, logoMorphRenderShapes, type LogoMorphShape } from "../src/illustrations/logoMorph";
import { getBootIntroState, setBootIntroInactive, setWelcomeAttachment, subscribeBootIntro } from "../src/lib/bootIntro";
import { vibesTheme } from "../src/theme/vibesTheme";

/*
 * Geometry copied from the native splash so the first frame is pixel-identical:
 * - ios/Vibes/SplashScreen.storyboard: 320x320 pt image, aspect fit, centered on the full window.
 * - assets/adaptive-icon-flat.png (1024 px): logo content box x 328-696, y 264-770
 *   => 115.0 x 158.1 pt, center 1.56 pt below the window center.
 * - assets/branding/vibes-logo-morph.json (viewBox 1254) at logo state: x 275.6-978.9, y 154-1120.4
 *   => scale 115 / 703.3 pt per unit, i.e. a 205 pt square, whose logo center sits 1.67 pt below the box center.
 */
const SPLASH_IMAGE = require("../assets/adaptive-icon-flat.png");
const SPLASH_IMAGE_PT = 320;
const SVG_VIEWBOX = 1254;
const SVG_SCALE = 115 / (978.907 - 275.563);
const SVG_BOX_PT = SVG_VIEWBOX * SVG_SCALE;
const PNG_LOGO_CENTER_OFFSET_PT = ((264 + 770) / 2 - 512) * (SPLASH_IMAGE_PT / 1024);
const SVG_LOGO_CENTER_OFFSET_PT = ((154 + 1120.352) / 2 - SVG_VIEWBOX / 2) * SVG_SCALE;

const HOLD_MS = 300;
const CROSSFADE_MS = 150;
const FADE_OUT_MS = 250;
const FIRST_FRAME_FALLBACK_MS = 1500;
// Duration of the move/scale into Welcome's logo slot; tune here.
const ATTACH_MS = 1200;
const ATTACH_EASING = Easing.bezier(0.45, 0, 0.25, 1);
const WELCOME_SLOT_WAIT_MS = 800;
const DETACH_MS = 150;

function svgTopFor(windowHeight: number) {
  return windowHeight / 2 + PNG_LOGO_CENTER_OFFSET_PT - SVG_LOGO_CENTER_OFFSET_PT - SVG_BOX_PT / 2;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
function MorphPart({ shape, progress }: { shape: LogoMorphShape; progress: SharedValue<number> }) {
  const props = useAnimatedProps(() => ({ d: logoMorphPath(shape, progress.value) }));
  return <AnimatedPath animatedProps={props} fill={shape.color} fillRule="nonzero" />;
}

/**
 * Single boot intro, mounted once at the app root above the navigator.
 * Starts as the exact splash image, hides the native splash once that frame is on screen,
 * crossfades into the morph, plays logo -> word once, loops only while the app still loads,
 * and fades out when the app is ready and the first cycle has finished.
 */
export default function BootIntroOverlay({ onFirstFrameReady }: { onFirstFrameReady: () => void }) {
  const { width, height } = useWindowDimensions();
  const [visible, setVisible] = useState(true);
  const [intro, setIntro] = useState(() => ({ ...getBootIntroState() }));
  const appReady = intro.ready;
  const [mode, setMode] = useState<"intro" | "attached" | "leaving">("intro");
  const [slotWaitExpired, setSlotWaitExpired] = useState(false);
  const [cycleDone, setCycleDone] = useState(false);
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  const [firstFrameShown, setFirstFrameShown] = useState(false);
  const loaded = useRef(false);
  const laidOut = useRef(false);
  const reported = useRef(false);
  const readyRef = useRef(onFirstFrameReady);
  readyRef.current = onFirstFrameReady;

  const progress = useSharedValue(1); // 1 = brand mark, 0 = word
  const svgOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);
  const backgroundOpacity = useSharedValue(1);
  const move = useSharedValue(0); // 0 = splash box, 1 = Welcome logo slot
  const target = useSharedValue({ dx: 0, dy: 0, scale: 1 });
  const looping = useRef(false);

  useEffect(() => subscribeBootIntro(() => setIntro({ ...getBootIntroState() })), []);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => { if (mounted) setReducedMotion(value); })
      .catch(() => { if (mounted) setReducedMotion(false); });
    return () => { mounted = false; };
  }, []);

  const reportFirstFrame = React.useCallback(() => {
    if (reported.current) return;
    reported.current = true;
    // One extra frame so the image is really composited before the native splash goes away.
    requestAnimationFrame(() => {
      readyRef.current();
      setFirstFrameShown(true);
    });
  }, []);
  const maybeReport = () => { if (loaded.current && laidOut.current) reportFirstFrame(); };
  useEffect(() => {
    // Never keep the native splash forever if the image callbacks don't fire.
    const timeout = setTimeout(reportFirstFrame, FIRST_FRAME_FALLBACK_MS);
    return () => clearTimeout(timeout);
  }, [reportFirstFrame]);

  // Runs once per boot: deps only flip false -> true, never reset progress.
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !firstFrameShown || reducedMotion === null) return;
    started.current = true;
    if (reducedMotion) { setCycleDone(true); return; }
    svgOpacity.value = withDelay(HOLD_MS - CROSSFADE_MS, withTiming(1, { duration: CROSSFADE_MS }));
    progress.value = withDelay(HOLD_MS, withTiming(0, {
      duration: LOGO_MORPH_DURATION,
      easing: Easing.inOut(Easing.cubic),
    }, (finished) => { if (finished) runOnJS(setCycleDone)(true); }));
  }, [firstFrameShown, reducedMotion, progress, svgOpacity]);

  const startLoop = React.useCallback(() => {
    if (looping.current) return;
    looping.current = true;
    // Continue from wherever the morph is, so there is never a restart.
    const easing = Easing.inOut(Easing.sin);
    const toMark = withTiming(1, { duration: LOGO_MORPH_DURATION * (1 - progress.value), easing });
    progress.value = withSequence(toMark, withRepeat(withSequence(
      withTiming(0, { duration: LOGO_MORPH_DURATION, easing }),
      withTiming(1, { duration: LOGO_MORPH_DURATION, easing }),
    ), -1, false));
  }, [progress]);

  const fadeOut = React.useCallback((duration: number) => {
    setMode("leaving");
    overlayOpacity.value = withTiming(0, { duration }, (finished) => {
      if (finished) runOnJS(setVisible)(false);
    });
  }, [overlayOpacity]);
  useEffect(() => { if (!visible) setBootIntroInactive(); }, [visible]);

  const toWelcome = intro.readyRoute === "Welcome" && !reducedMotion;
  useEffect(() => {
    if (!toWelcome || !appReady || mode !== "intro" || intro.welcomeSlot) return;
    const timeout = setTimeout(() => setSlotWaitExpired(true), WELCOME_SLOT_WAIT_MS);
    return () => clearTimeout(timeout);
  }, [toWelcome, appReady, mode, intro.welcomeSlot]);

  useEffect(() => {
    if (!visible || !cycleDone || mode !== "intro") return;
    if (appReady) {
      if (toWelcome && intro.welcomeSlot) {
        // Logged out: move the live logo into Welcome's slot and keep animating there.
        const slot = intro.welcomeSlot;
        const side = Math.min(slot.width, slot.height);
        const fromCx = width / 2;
        const fromCy = svgTopFor(height) + SVG_BOX_PT / 2;
        target.value = {
          dx: slot.x + slot.width / 2 - fromCx,
          dy: slot.y + slot.height / 2 - fromCy,
          scale: side / SVG_BOX_PT,
        };
        setMode("attached");
        setWelcomeAttachment("attached");
        startLoop();
        move.value = withTiming(1, { duration: ATTACH_MS, easing: ATTACH_EASING });
        backgroundOpacity.value = withTiming(0, { duration: ATTACH_MS, easing: ATTACH_EASING });
        return;
      }
      if (toWelcome && !slotWaitExpired) return;
      if (intro.readyRoute === "Welcome") setWelcomeAttachment("declined");
      cancelAnimation(progress);
      fadeOut(FADE_OUT_MS);
      return;
    }
    if (reducedMotion) return;
    // Still loading: keep morphing until the app is ready.
    startLoop();
  }, [appReady, cycleDone, visible, reducedMotion, mode, toWelcome, slotWaitExpired, intro.welcomeSlot, width, height, progress, move, target, backgroundOpacity, startLoop, fadeOut]);

  // Once attached, the overlay logo lives only while Welcome is on screen; Welcome takes over after that.
  const wasFocused = useRef(false);
  useEffect(() => {
    if (mode !== "attached") return;
    if (intro.welcomeFocused) { wasFocused.current = true; return; }
    if (wasFocused.current) fadeOut(DETACH_MS);
  }, [mode, intro.welcomeFocused, fadeOut]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const backgroundStyle = useAnimatedStyle(() => ({ opacity: backgroundOpacity.value }));
  const svgStyle = useAnimatedStyle(() => {
    const t = target.value;
    // Welcome's AnimatedBrandLogo breathes up to 4% toward the word; blend that in while moving there.
    const breathing = 1 + 0.04 * (1 - progress.value) * move.value;
    return {
      opacity: svgOpacity.value,
      transform: [
        { translateX: t.dx * move.value },
        { translateY: t.dy * move.value },
        { scale: (1 + (t.scale - 1) * move.value) * breathing },
      ],
    };
  });
  const imageStyle = useAnimatedStyle(() => ({ opacity: 1 - svgOpacity.value }));

  if (!visible) return null;
  const centerY = height / 2;
  const svgTop = svgTopFor(height);
  const passThrough = mode !== "intro" || (appReady && cycleDone);
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}
      pointerEvents={passThrough ? "none" : "auto"}
      accessible={!passThrough}
      accessibilityLabel="Vibes"
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.background, backgroundStyle]} />
      <Animated.Image
        source={SPLASH_IMAGE}
        resizeMode="contain"
        fadeDuration={0}
        onLoad={() => { loaded.current = true; maybeReport(); }}
        onLayout={() => { laidOut.current = true; maybeReport(); }}
        style={[styles.abs, {
          width: SPLASH_IMAGE_PT,
          height: SPLASH_IMAGE_PT,
          left: (width - SPLASH_IMAGE_PT) / 2,
          top: centerY - SPLASH_IMAGE_PT / 2,
        }, imageStyle]}
      />
      <Animated.View
        style={[styles.abs, {
          width: SVG_BOX_PT,
          height: SVG_BOX_PT,
          left: (width - SVG_BOX_PT) / 2,
          top: svgTop,
        }, svgStyle]}
      >
        <Svg width="100%" height="100%" viewBox={`0 0 ${SVG_VIEWBOX} ${SVG_VIEWBOX}`} preserveAspectRatio="xMidYMid meet">
          {logoMorphRenderShapes.map(shape => <MorphPart key={shape.letter} shape={shape} progress={progress} />)}
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 1000, elevation: 1000 },
  background: { backgroundColor: vibesTheme.colors.background },
  abs: { position: "absolute" },
});
