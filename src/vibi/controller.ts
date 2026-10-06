export const VIBI_ANIMATIONS = [
  "idle",
  "breathing",
  "happy",
  "sad",
  "surprised",
  "idea",
  "thinking",
  "meditating",
  "challenge_invite",
  "challenge_active",
  "challenge_complete",
  "encouraging",
  "connecting",
] as const;
export type VibiAnimation = (typeof VIBI_ANIMATIONS)[number];
export const VIBI_LOOPS = new Set<VibiAnimation>([
  "idle",
  "breathing",
  "sad",
  "thinking",
  "meditating",
  "challenge_active",
]);
export type VibiSnapshot = {
  animation: VibiAnimation;
  returnTo: VibiAnimation;
  requestId: number;
  visible: boolean;
  minimized: boolean;
};
let state: VibiSnapshot = {
  animation: "idle",
  returnTo: "idle",
  requestId: 0,
  visible: true,
  minimized: false,
};
const listeners = new Set<() => void>();
const publish = (next: VibiSnapshot) => {
  state = next;
  listeners.forEach((listener) => listener());
};
export const vibiController = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => state,
};
export function playAnimation(name: VibiAnimation) {
  if (!VIBI_ANIMATIONS.includes(name))
    throw new Error(`Unknown Vibi animation: ${name}`);
  publish({
    ...state,
    animation: name,
    requestId: state.requestId + 1,
    returnTo: "idle",
  });
}
export function setVisible(visible: boolean) {
  if (visible !== state.visible) publish({ ...state, visible });
}
export function setMinimized(minimized: boolean) {
  if (minimized !== state.minimized) publish({ ...state, minimized });
}
// A stale completion cannot override a newer app event or development selection.
export function finishAnimation(requestId: number) {
  if (requestId !== state.requestId || VIBI_LOOPS.has(state.animation)) return;
  playAnimation(state.returnTo);
}
