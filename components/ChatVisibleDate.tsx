import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, type ViewToken } from "react-native";
import { Text } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

export function useChatVisibleDate(conversationId: string | undefined, inverted = false, onViewable?: (info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => void) {
  const [date, setDate] = useState<string | null>(null);
  const latest = useRef({ inverted, onViewable });
  latest.current = { inverted, onViewable };
  useEffect(() => { setDate(null); }, [conversationId]);
  const onViewableItemsChanged = useRef((info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => {
    latest.current.onViewable?.(info);
    const visible = info.viewableItems.filter(v => v.isViewable && v.index !== null);
    visible.sort((a, b) => latest.current.inverted ? b.index! - a.index! : a.index! - b.index!);
    const item = visible[0]?.item;
    const timestamp = item?.createdAt ?? item?.created_at;
    if (timestamp && Number.isFinite(new Date(timestamp).getTime())) setDate(timestamp);
  }).current;
  return { date, onViewableItemsChanged, setDate };
}

export default function ChatVisibleDate({ date }: { date: string | null }) {
  if (!date) return null;
  const value = new Date(date);
  if (!Number.isFinite(value.getTime())) return null;
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const label = value.toDateString() === now.toDateString() ? "Hoy" : value.toDateString() === yesterday.toDateString() ? "Ayer" : value.toLocaleDateString("es-AR", { day: "numeric", month: "long", ...(value.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) });
  return <View pointerEvents="none" style={s.overlay}><View style={s.badge}><Text style={s.text}>{label}</Text></View></View>;
}
const s = StyleSheet.create({
  overlay: { position: "absolute", top: 8, left: 0, right: 0, alignItems: "center", zIndex: 10 },
  badge: { backgroundColor: ds.withAlpha(ds.colors.base.paper, ds.opacity.higher), borderRadius: ds.radii.lg, paddingHorizontal: ds.spacing[4], paddingVertical: ds.spacing[2] },
  text: { color: vibesTheme.colors.secondaryText, ...ds.textStyles.caption },
});
