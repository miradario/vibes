import { AppState } from "react-native";
import { vibiFlagStore } from "./store";

export function startRemoteConfig(): () => void {
  let disposed = false;
  let removeRealtime: (() => void) | undefined;
  let removeAppState: (() => void) | undefined;
  // Load inside the guard so older binaries without Firebase remain usable,
  // with Vibi disabled, until the next native build is installed.
  try {
    const sdk: typeof import("@react-native-firebase/remote-config") = require("@react-native-firebase/remote-config");
    const config = sdk.getRemoteConfig();
    config.defaultConfig = { vibi_enabled: false };
    config.settings = {
      minimumFetchIntervalMillis: __DEV__ ? 0 : 300000,
      fetchTimeoutMillis: 10000,
    };
    const publish = () => {
      if (!disposed)
        vibiFlagStore.update(sdk.getValue(config, "vibi_enabled").asBoolean());
    };
    const report = () => {
      if (__DEV__ && !disposed)
        console.warn(
          "[Remote Config] No se pudo actualizar Vibi; se conserva el último valor disponible."
        );
    };
    let fetching = false;
    const refresh = async () => {
      if (disposed || fetching) return;
      fetching = true;
      try {
        await sdk.fetchAndActivate(config);
        publish();
      } catch {
        report();
      } finally {
        fetching = false;
      }
    };
    publish(); // Uses the persisted activated value, or false on first launch.
    void refresh();
    removeRealtime = sdk.onConfigUpdate(config, {
      next: () => {
        void sdk.activate(config).then(publish).catch(report);
      },
      error: report,
      complete: () => {},
    });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    removeAppState = () => subscription.remove();
  } catch {
    vibiFlagStore.update(false);
    if (__DEV__)
      console.warn(
        "[Remote Config] Firebase no está disponible en este build. Vibi permanece deshabilitado."
      );
  }
  return () => {
    disposed = true;
    removeRealtime?.();
    removeAppState?.();
  };
}
