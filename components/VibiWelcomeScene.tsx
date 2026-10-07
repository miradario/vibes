import React, { useEffect, useMemo, useRef } from "react";
import { PerspectiveCamera } from "three";
import { useThree } from "./VibiCanvas";
import { VibiAnimator } from "../src/vibi/animation";
import {
  applyWelcomeCamera,
  welcomeCameraPlan,
  welcomeIntroFrame,
  welcomeModelBounds,
  WELCOME_INTRO_DURATION,
} from "../src/vibi/welcomeIntro";
import type { VibiRendererProps } from "./VibiRenderer";

export type WelcomeIntro = {
  replayKey: number;
  skip: boolean;
  onProgress: (seconds: number) => void;
};

export default function VibiWelcomeScene(
  props: VibiRendererProps & { onPrepared: () => void }
) {
  const { model, paused, reducedMotion, welcomeIntro, onPrepared } = props;
  const root = useMemo(() => model.scene.clone(true), [model]);
  const animator = useMemo(
    () => new VibiAnimator(root, model.clips, () => {}),
    [root, model]
  );
  const envelope = useMemo(() => {
    const breathing = model.clips.get("breathing");
    if (!breathing)
      throw new Error("Vibi requires breathing for the welcome screen");
    return welcomeModelBounds(model.scene, breathing);
  }, [model]);
  const { camera, size, invalidate } = useThree();
  const elapsed = useRef(0);
  const breathingStarted = useRef(false);
  const callbacks = useRef(props);
  callbacks.current = props;
  const plan = useMemo(
    () =>
      welcomeCameraPlan(
        envelope.bounds,
        envelope.sphereBounds,
        Math.max(1, size.width),
        Math.max(1, size.height)
      ),
    [envelope, size.width, size.height]
  );
  useEffect(() => () => animator.dispose(), [animator]);
  useEffect(() => {
    elapsed.current = welcomeIntro?.skip ? WELCOME_INTRO_DURATION : 0;
    breathingStarted.current = false;
    animator.mixer.stopAllAction();
    animator.mixer.update(0);
    if (welcomeIntro?.skip) {
      animator.play("breathing", 0, reducedMotion, true);
      breathingStarted.current = true;
    }
  }, [animator, welcomeIntro?.replayKey, welcomeIntro?.skip]);
  useEffect(() => {
    if (breathingStarted.current)
      animator.play("breathing", 0, reducedMotion, true);
  }, [animator, reducedMotion]);
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const frame = welcomeIntroFrame(elapsed.current, reducedMotion);
    applyWelcomeCamera(camera, plan, frame.camera);
    onPrepared();
    invalidate();
  }, [
    camera,
    plan,
    reducedMotion,
    welcomeIntro?.replayKey,
    welcomeIntro?.skip,
    onPrepared,
    invalidate,
  ]);
  useEffect(() => {
    if (paused || !(camera instanceof PerspectiveCamera)) return;
    let timer: ReturnType<typeof setTimeout>;
    let last = performance.now();
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const now = performance.now();
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      elapsed.current = Math.min(
        WELCOME_INTRO_DURATION,
        elapsed.current + delta
      );
      const frame = welcomeIntroFrame(elapsed.current, reducedMotion);
      try {
        applyWelcomeCamera(camera, plan, frame.camera);
        if (frame.complete && !breathingStarted.current) {
          breathingStarted.current = true;
          animator.play("breathing", 0, reducedMotion, true);
        }
        if (breathingStarted.current) animator.update(delta);
        callbacks.current.welcomeIntro?.onProgress(elapsed.current);
        invalidate();
        if (!frame.complete || !reducedMotion)
          timer = setTimeout(tick, 1000 / 30);
      } catch (error) {
        callbacks.current.onError(error);
      }
    };
    // Start the timeline only after a prepared frame has been presented.
    timer = setTimeout(tick, 1000 / 30);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [
    paused,
    camera,
    plan,
    reducedMotion,
    animator,
    invalidate,
    welcomeIntro?.replayKey,
    welcomeIntro?.skip,
  ]);
  return <primitive object={root} dispose={null} />;
}
