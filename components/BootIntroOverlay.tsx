import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, { Easing, cancelAnimation, runOnJS, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import { LOGO_MORPH_DURATION, logoMorphPath, logoMorphRenderShapes, type LogoMorphShape } from "../src/illustrations/logoMorph";
import { isBootIntroReady, subscribeBootIntroReady } from "../src/lib/bootIntro";
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
  const [appReady, setAppReady] = useState(isBootIntroReady);
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

  useEffect(() => subscribeBootIntroReady(() => setAppReady(true)), []);
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

  useEffect(() => {
    if (!visible || !cycleDone) return;
    if (appReady) {
      cancelAnimation(progress);
      overlayOpacity.value = withTiming(0, { duration: FADE_OUT_MS }, (finished) => {
        if (finished) runOnJS(setVisible)(false);
      });
      return;
    }
    if (reducedMotion) return;
    // Still loading: keep breathing word -> mark -> word until the app is ready.
    const easing = Easing.inOut(Easing.sin);
    progress.value = withRepeat(withSequence(
      withTiming(1, { duration: LOGO_MORPH_DURATION, easing }),
      withTiming(0, { duration: LOGO_MORPH_DURATION, easing }),
    ), -1, false);
  }, [appReady, cycleDone, visible, reducedMotion, progress, overlayOpacity]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const svgStyle = useAnimatedStyle(() => ({ opacity: svgOpacity.value }));
  const imageStyle = useAnimatedStyle(() => ({ opacity: 1 - svgOpacity.value }));

  if (!visible) return null;
  const centerY = height / 2;
  const svgTop = centerY + PNG_LOGO_CENTER_OFFSET_PT - SVG_LOGO_CENTER_OFFSET_PT - SVG_BOX_PT / 2;
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}
      pointerEvents={appReady && cycleDone ? "none" : "auto"}
      accessible
      accessibilityLabel="Vibes"
    >
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
  overlay: { backgroundColor: vibesTheme.colors.background, zIndex: 1000, elevation: 1000 },
  abs: { position: "absolute" },
});
