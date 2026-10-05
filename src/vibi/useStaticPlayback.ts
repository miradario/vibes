import { useEffect, useRef } from "react";
import fallbackDurations from "../../assets/models/vibi-clips.json";
import { finishAnimation, VIBI_LOOPS, vibiController } from "./controller";
import type { VibiClipInfo } from "./animation";
// Static fallback still honors one-shot completion. Its clock pauses with the
// same visibility/background rules as 3D, without rendering animation frames.
export function useStaticPlayback(
  enabled: boolean,
  paused: boolean,
  info?: VibiClipInfo[]
) {
  const progress = useRef({ requestId: -1, remaining: 0 });
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let started = 0;
    const stop = () => {
      if (!timer) return;
      clearTimeout(timer);
      progress.current.remaining = Math.max(
        0,
        progress.current.remaining - (performance.now() - started) / 1000
      );
      timer = undefined;
    };
    const update = () => {
      const state = vibiController.getSnapshot();
      if (state.requestId !== progress.current.requestId) {
        stop();
        progress.current = {
          requestId: state.requestId,
          remaining:
            info?.find((clip) => clip.name === state.animation)?.duration ??
            fallbackDurations[state.animation],
        };
      }
      if (paused || timer || VIBI_LOOPS.has(state.animation)) return;
      started = performance.now();
      timer = setTimeout(() => {
        timer = undefined;
        progress.current.remaining = 0;
        finishAnimation(state.requestId);
      }, progress.current.remaining * 1000);
    };
    update();
    const unsubscribe = vibiController.subscribe(update);
    return () => {
      stop();
      unsubscribe();
    };
  }, [enabled, paused, info]);
}
