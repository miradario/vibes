import {
  AnimationClip,
  AnimationMixer,
  KeyframeTrack,
  LoopOnce,
  LoopRepeat,
  Object3D,
  PropertyBinding,
  type AnimationAction,
} from "three";
import { VIBI_ANIMATIONS, VIBI_LOOPS, type VibiAnimation } from "./controller";

export type VibiClipInfo = {
  name: VibiAnimation;
  start: number;
  end: number;
  duration: number;
};
export function normalizeVibiClips(raw: AnimationClip[]) {
  const info: VibiClipInfo[] = [];
  const clips = new Map<VibiAnimation, AnimationClip>();
  for (const name of VIBI_ANIMATIONS) {
    const matches = raw.filter((clip) => clip.name === name);
    if (matches.length !== 1)
      throw new Error(`Vibi requires exactly one clip named ${name}`);
    const clip = matches[0].clone();
    const start = Math.min(...clip.tracks.map((track) => track.times[0]));
    const end = Math.max(
      ...clip.tracks.map((track) => track.times[track.times.length - 1])
    );
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
      throw new Error(`Vibi clip ${name} has an invalid timeline`);
    clip.tracks.forEach((track) => track.shift(-start));
    if (name === "meditating") {
      // One continuous cosine cycle: inhale 0–3s, exhale 3–6s.
      // Amplify the same authored Respirar morph on body, hair and face:
      // +17.6% width at peak inhale, with closed-eye channels left neutral.
      clip.tracks.forEach((track) => {
        const size = track.getValueSize();
        const frames = 181;
        const times = new Float32Array(frames);
        const values = new Float32Array(frames * size);
        for (let frame = 0; frame < frames; frame++) {
          const time = frame / 30;
          const inhale = (1 - Math.cos((time / 6) * Math.PI * 2)) / 2;
          times[frame] = time;
          if (track.name.includes("morphTargetInfluences")) {
            values[frame * size] = inhale * 3.2;
            // Other channels remain neutral, including the closed eyes.
          } else if (track.name.endsWith(".position")) {
            for (let axis = 0; axis < size; axis++)
              values[frame * size + axis] = track.values[axis];
            values[frame * size + 1] += inhale * 0.003;
          }
        }
        track.times = times;
        track.values = values;
      });
    }
    clip.resetDuration();
    clips.set(name, clip);
    info.push({ name, start, end, duration: clip.duration });
  }
  return { clips, info };
}

export function representativeVibiTime(clip: AnimationClip) {
  let bestTime = clip.duration * 0.37;
  let bestExpression = 0;
  // Facial tracks have six channels: breathe, bounce, wave, open, happy, sad.
  // Choose a real authored expression, rather than the neutral rest at the
  // midpoint of several one-shot clips. No new morphs or poses are invented.
  for (const track of clip.tracks) {
    if (
      !track.name.includes("morphTargetInfluences") ||
      track.getValueSize() !== 6
    )
      continue;
    for (let frame = 0; frame < track.times.length; frame++) {
      const offset = frame * 6;
      const expression =
        Math.abs(track.values[offset + 3]) +
        Math.abs(track.values[offset + 4]) +
        Math.abs(track.values[offset + 5]);
      if (expression > bestExpression) {
        bestExpression = expression;
        bestTime = track.times[frame];
      }
    }
  }
  return bestTime;
}

const FADE_SECONDS = 0.24;
// A frozen snapshot of the currently blended pose is the sole outgoing action.
// This also handles interruption halfway through a transition: weights are
// blended normally, never added across three or more independent expressions.
export class VibiAnimator {
  readonly mixer: AnimationMixer;
  private action?: AnimationAction;
  private transition?: AnimationAction;
  private transitionClip?: AnimationClip;
  private tracks: KeyframeTrack[];
  private elapsed = 0;
  private duration = 0;
  private looping = true;
  private reduced = false;
  private completed = false;
  private requestId = 0;
  constructor(
    readonly root: Object3D,
    readonly clips: Map<VibiAnimation, AnimationClip>,
    private onFinished: (requestId: number) => void
  ) {
    this.mixer = new AnimationMixer(root);
    const unique = new Map<string, KeyframeTrack>();
    clips.forEach((clip) =>
      clip.tracks.forEach((track) => unique.set(track.name, track))
    );
    this.tracks = [...unique.values()];
  }
  private capturePose() {
    return new AnimationClip(
      "vibi-transition",
      FADE_SECONDS,
      this.tracks.map((track) => {
        const values = new Float32Array(track.getValueSize());
        const binding = PropertyBinding.create(this.root, track.name);
        binding.bind();
        binding.getValue(values, 0);
        binding.unbind();
        const Track = track.constructor as new (
          name: string,
          times: number[],
          values: Float32Array
        ) => KeyframeTrack;
        return new Track(track.name, [0], values);
      })
    );
  }
  play(
    name: VibiAnimation,
    requestId: number,
    reducedMotion: boolean,
    loop = VIBI_LOOPS.has(name)
  ) {
    const clip = this.clips.get(name);
    if (!clip) throw new Error(`Missing Vibi clip: ${name}`);
    const snapshot =
      this.action && !reducedMotion ? this.capturePose() : undefined;
    this.mixer.stopAllAction();
    if (this.transitionClip) this.mixer.uncacheClip(this.transitionClip);
    this.transition = undefined;
    this.transitionClip = undefined;
    this.elapsed = 0;
    this.completed = false;
    this.requestId = requestId;
    this.duration = clip.duration;
    this.looping = loop;
    this.reduced = reducedMotion;
    const action = this.mixer.clipAction(clip).reset();
    action.enabled = true;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(1);
    action.setLoop(
      this.looping ? LoopRepeat : LoopOnce,
      this.looping ? Infinity : 1
    );
    action.clampWhenFinished = true;
    action.play();
    if (snapshot) {
      this.transitionClip = snapshot;
      this.transition = this.mixer
        .clipAction(snapshot)
        .setLoop(LoopOnce, 1)
        .play();
      this.transition.clampWhenFinished = true;
      this.transition.fadeOut(FADE_SECONDS);
      action.fadeIn(FADE_SECONDS);
    }
    if (reducedMotion) action.time = representativeVibiTime(clip);
    this.action = action;
    this.mixer.update(0);
  }
  get remaining() {
    return Math.max(0, this.duration - this.elapsed);
  }
  get needsCompletion() {
    return !this.looping && !this.completed;
  }
  update(delta: number) {
    this.elapsed += delta;
    if (!this.reduced) this.mixer.update(delta);
    if (this.transition && this.elapsed >= FADE_SECONDS) {
      this.transition.stop();
      if (this.transitionClip) this.mixer.uncacheClip(this.transitionClip);
      this.transition = undefined;
      this.transitionClip = undefined;
    }
    if (this.needsCompletion && this.elapsed >= this.duration) {
      this.completed = true;
      this.onFinished(this.requestId);
    }
  }
  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
  }
}
