// Remote Config is available in the native iOS/Android builds only.
export function startRemoteConfig(): () => void {
  return () => {};
}
