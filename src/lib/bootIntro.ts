// Shared boot intro state between the root BootIntroOverlay, App navigation and Welcome.
export type BootIntroFrame = { x: number; y: number; width: number; height: number };
export type WelcomeAttachment = "none" | "attached" | "declined";
type State = {
  ready: boolean;
  readyRoute: string | null;
  /** True while the overlay still owns the boot logo (from launch until it fades or detaches). */
  active: boolean;
  /** Window frame of Welcome's logo slot, published by Welcome while it waits for the intro. */
  welcomeSlot: BootIntroFrame | null;
  welcomeFocused: boolean;
  attachment: WelcomeAttachment;
};
const state: State = { ready: false, readyRoute: null, active: true, welcomeSlot: null, welcomeFocused: false, attachment: "none" };
const listeners = new Set<() => void>();
function update(patch: Partial<State>) {
  Object.assign(state, patch);
  listeners.forEach((listener) => listener());
}
export function getBootIntroState(): Readonly<State> {
  return state;
}
export function subscribeBootIntro(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function markBootIntroReady(routeName: string | null = null) {
  if (state.ready) return;
  update({ ready: true, readyRoute: routeName });
}
export function isBootIntroReady() {
  return state.ready;
}
export function subscribeBootIntroReady(listener: () => void) {
  return subscribeBootIntro(() => { if (state.ready) listener(); });
}
export function setBootIntroInactive() {
  if (state.active) update({ active: false });
}
export function setWelcomeSlot(frame: BootIntroFrame | null) {
  update({ welcomeSlot: frame });
}
export function setWelcomeFocused(focused: boolean) {
  if (state.welcomeFocused !== focused) update({ welcomeFocused: focused });
}
export function setWelcomeAttachment(attachment: WelcomeAttachment) {
  if (state.attachment !== attachment) update({ attachment });
}
