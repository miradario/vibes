type AppStateSource = {
  currentState: string | null;
  addEventListener: (event: "change", listener: (state: string) => void) => { remove: () => void };
};
/** React Query's browser focus listeners do not track React Native AppState. */
export function bindQueryAppState(appState: AppStateSource, setFocused: (focused: boolean) => void) {
  setFocused(appState.currentState === "active");
  const subscription = appState.addEventListener("change", state => setFocused(state === "active"));
  return () => subscription.remove();
}
