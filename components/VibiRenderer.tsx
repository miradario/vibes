import React, { memo, useEffect, useMemo, useRef } from "react";
import { Group, NoToneMapping, SRGBColorSpace } from "three";
import { Canvas, useThree, prepareVibiContext } from "./VibiCanvas";
import { vibesTheme } from "../src/theme/vibesTheme";
import { VibiAnimator } from "../src/vibi/animation";
import { finishAnimation, vibiController } from "../src/vibi/controller";
import type { VibiAnimation } from "../src/vibi/controller";
import type { VibiModel } from "../src/vibi/model";

export type VibiRendererProps = {
  animation?: VibiAnimation;
  loop?: boolean;
  spin?: boolean;
  model: VibiModel;
  paused: boolean;
  reducedMotion: boolean;
  onCycleComplete?: () => void;
  viewportSize?: number;
  onReady: () => void;
  onError: (error: unknown) => void;
};
function Character({
  animation,
  loop,
  spin,
  model,
  paused,
  reducedMotion,
  onReady,
  onError,
  onCycleComplete,
  viewportSize = 3.3,
}: VibiRendererProps) {
  const turntable = useRef<Group>(null);
  const lastRequest = useRef("");
  const root = useMemo(() => model.scene.clone(true), [model]);
  const playback = useRef({ animation, reducedMotion });
  playback.current = { animation, reducedMotion };
  const cycleCallback = useRef(onCycleComplete);
  cycleCallback.current = onCycleComplete;
  const animator = useMemo(
    () => {
      const instance = new VibiAnimator(
        root,
        model.clips,
        (requestId) => {
          if (playback.current.animation) {
            instance.play("idle", requestId, playback.current.reducedMotion);
          } else {
            finishAnimation(requestId);
          }
        },
        () => cycleCallback.current?.()
      );
      return instance;
    },
    [root, model]
  );
  const invalidate = useThree((state) => state.invalidate);
  const camera = useThree((state) => state.camera);
  const height = useThree((state) => state.size.height);
  useEffect(() => {
    if ("zoom" in camera) {
      camera.zoom = height / viewportSize;
      camera.updateProjectionMatrix();
      invalidate();
    }
  }, [camera, height, invalidate, viewportSize]);
  const callbacks = useRef({ onReady, onError });
  callbacks.current = { onReady, onError };
  useEffect(() => () => animator.dispose(), [animator]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let last = performance.now();
    let scheduled = false;
    const stop = () => {
      if (timer) clearTimeout(timer);
      scheduled = false;
    };
    const schedule = () => {
      if (paused || scheduled || (reducedMotion && !animator.needsCompletion && !cycleCallback.current))
        return;
      scheduled = true;
      last = performance.now();
      timer = setTimeout(
        tick,
        reducedMotion ? 100 : 1000 / 30
      );
    };
    const tick = () => {
      scheduled = false;
      const now = performance.now();
      const delta = (now - last) / 1000;
      last = now;
      try {
        const step = reducedMotion ? delta : Math.min(delta, 0.1);
        animator.update(step);
        if (spin && !reducedMotion && turntable.current)
          turntable.current.rotation.y += (step * Math.PI) / 4;
        if (!reducedMotion) invalidate();
        schedule();
      } catch (error) {
        stop();
        callbacks.current.onError(error);
      }
    };
    const play = () => {
      stop();
      const state = vibiController.getSnapshot();
      try {
        animator.play(
          animation ?? state.animation,
          animation ? 0 : state.requestId,
          reducedMotion,
          loop
        );
        if (!paused) invalidate();
        schedule();
      } catch (error) {
        callbacks.current.onError(error);
      }
    };
    // Replay only for a new request or a changed motion preference, not when
    // visibility changes. Pausing must retain the current time and return state.
    const preference = reducedMotion ? "static" : "motion";
    const signature = `${
      animation ?? vibiController.getSnapshot().requestId
    }:${preference}:${loop ?? "default"}`;
    if (lastRequest.current !== signature) {
      lastRequest.current = signature;
      play();
    } else {
      if (!paused) invalidate();
      schedule();
    }
    const unsubscribe = animation
      ? () => {}
      : vibiController.subscribe(() => {
          const next = `${
            vibiController.getSnapshot().requestId
          }:${preference}:${loop ?? "default"}`;
          if (next !== lastRequest.current) {
            lastRequest.current = next;
            play();
          }
        });
    return () => {
      // Reduced motion still completes one-shots on time, but renders only a
      // representative pose. Account for partial time when hiding/backgrounding.
      if (reducedMotion && scheduled)
        animator.update(
          Math.min((performance.now() - last) / 1000, animator.remaining)
        );
      stop();
      unsubscribe();
    };
  }, [animation, loop, spin, animator, invalidate, paused, reducedMotion]);
  // The model's front faces +Z. Keep its authoring transforms, materials and
  // morph dictionaries intact; only tilt the display slightly for depth.
  return (
    <group ref={turntable}>
      <primitive object={root} rotation={[0, -0.08, 0]} dispose={null} />
    </group>
  );
}
const colors = vibesTheme.colors;
function VibiRenderer(props: VibiRendererProps) {
  return (
    <Canvas
      style={{ flex: 1 }}
      frameloop="demand"
      orthographic
      camera={{ position: [0, 0, 7], zoom: 37, near: 0.1, far: 30 }}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      onCreated={({ gl, camera, size }) => {
        prepareVibiContext(gl.getContext());
        gl.setClearColor(colors.background, 0);
        gl.toneMapping = NoToneMapping;
        gl.outputColorSpace = SRGBColorSpace;
        if ("zoom" in camera) {
          camera.zoom = size.height / (props.viewportSize ?? 3.3);
          camera.updateProjectionMatrix();
        }
        // Frame-loop GL failures are outside React's error boundary.
        let firstFrameRendered = false;
        const render = gl.render.bind(gl);
        gl.render = (...args) => {
          try {
            render(...args);
            // Keep the bundled image until the first real GL frame exists.
            if (!firstFrameRendered) {
              firstFrameRendered = true;
              props.onReady();
            }
          } catch (error) {
            props.onError(error);
          }
        };
      }}
    >
      <ambientLight color={colors.surface} intensity={1.6} />
      <directionalLight
        color={colors.surface}
        intensity={2.0}
        position={[-3, 4, 6]}
      />
      <directionalLight
        color={colors.surface}
        intensity={0.6}
        position={[3, 1, 2]}
      />
      <Character {...props} />
    </Canvas>
  );
}
export default memo(VibiRenderer);
