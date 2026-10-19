import { useContext, useEffect, useRef } from "react";
import { NavigationContext } from "@react-navigation/native";

/**
 * Refetch when the screen hosting the hook gains navigation focus.
 * App foreground refetches are handled globally by React Query's
 * focusManager (wired to AppState in App.tsx). Safe outside a navigator:
 * there it does nothing and only the AppState refetch applies.
 */
export function useRefetchOnFocus(refetch: () => unknown, enabled = true) {
  const navigation = useContext(NavigationContext);
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  useEffect(() => {
    if (!navigation || !enabled) return;
    let first = true;
    return navigation.addListener("focus", () => {
      // Skip the initial focus: the query already fetches on mount.
      if (first) { first = false; return; }
      void refetchRef.current();
    });
  }, [navigation, enabled]);
}
