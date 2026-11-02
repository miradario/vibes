import React, { createContext, useContext, useEffect, useId, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ds from "../../src/theme/tokens";
const DockContext = createContext<((id: string, content: React.ReactNode) => void) | null>(null);
/** Actions remain outside the page's scroll viewport and respect the home indicator. */
export function LearningDockHost({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [actions, setActions] = useState<Record<string, React.ReactNode>>({});
  const register = useMemo(() => (id: string, content: React.ReactNode) => {
    setActions(previous => {
      if (previous[id] === content) return previous;
      const next = { ...previous };
      if (content === null) delete next[id]; else next[id] = content;
      return next;
    });
  }, []);
  const entries = Object.entries(actions);
  return <DockContext.Provider value={register}><View style={s.page}>
    {children}
    {entries.length > 0 ? <View style={[s.dock, { paddingBottom: Math.max(insets.bottom, ds.spacing[3]) }]}>{entries.map(([id, action]) => <View key={id}>{action}</View>)}</View> : null}
  </View></DockContext.Provider>;
}
export function LearningActionDock({ children }: { children: React.ReactNode }) {
  const register = useContext(DockContext);
  const id = useId();
  useEffect(() => { register?.(id, children); }, [register, id, children]);
  useEffect(() => () => register?.(id, null), [register, id]);
  return register ? null : <>{children}</>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: ds.colors.bg.screen },
  dock: { paddingHorizontal: ds.spacing[4], paddingTop: ds.spacing[3], gap: ds.spacing[2], borderTopWidth: 1, borderTopColor: ds.colors.border.subtle, backgroundColor: ds.colors.bg.surface },
});
