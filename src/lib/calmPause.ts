export const INHALE_MS = 4000;
export const EXHALE_MS = 6000;
export const BREATH_CYCLE_MS = INHALE_MS + EXHALE_MS;
export const getCalmIllustrationSize = (
  width: number,
  height: number,
  fontScale: number
) =>
  Math.max(
    128,
    Math.min(360, width - 48, height - 400 * Math.max(1, fontScale))
  );

export function getStartupDestination(
  hasSession: boolean,
  needsOnboarding: boolean,
  updateGate: object | null
) {
  if (updateGate) return { name: "UpdateGate", params: updateGate };
  if (!hasSession) return { name: "Welcome" };
  if (needsOnboarding) return { name: "VibesOnboardingFlow" };
  return {
    name: "Tab",
    params: { screen: "Home" },
  };
}

export function getBreathFrame(elapsedMs: number) {
  "worklet";
  const elapsed = Math.max(0, elapsedMs) % BREATH_CYCLE_MS;
  const exhaling = elapsed >= INHALE_MS;
  const progress = exhaling
    ? 1 - (elapsed - INHALE_MS) / EXHALE_MS
    : elapsed / INHALE_MS;
  return { exhaling, expansion: (1 - Math.cos(Math.PI * progress)) / 2 };
}
