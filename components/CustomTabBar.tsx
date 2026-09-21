import React from "react";
import { StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Text } from "./Typography";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CalendarDays,
  Compass,
  Home,
  MessageCircle,
  Tag,
  Trophy,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react-native";
import { useCommunityUnreadQuery } from "../src/queries/communityReceipts.queries";
import { getBottomTabBarHeight } from "../src/lib/tabBarLayout";

const iconByRoute: Record<string, LucideIcon> = {
  Discover: Compass,
  Flow: Trophy,
  EventsTab: CalendarDays,
  Home,
  Calendar: UsersRound,
  Aura: UserRound,
};

const fallbackIconByRoute: Record<string, LucideIcon> = {
  Discover: Tag,
  Flow: MessageCircle,
  EventsTab: CalendarDays,
  Calendar: CalendarDays,
};

const labelByRoute: Record<string, string> = {
  Discover: "Explorar",
  Flow: "Desafíos",
  EventsTab: "Eventos",
  Home: "Inicio",
  Calendar: "Comunidad",
  Aura: "Perfil",
};

const getRouteIcon = (routeName: string) =>
  iconByRoute[routeName] ?? fallbackIconByRoute[routeName] ?? Home;

const getRouteLabel = (
  routeName: string,
  label: BottomTabBarProps["descriptors"][string]["options"]["tabBarLabel"],
  title?: string
) => {
  if (labelByRoute[routeName]) return labelByRoute[routeName];
  if (typeof label === "string") return label;
  return title ?? routeName;
};

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { data: unread = [] } = useCommunityUnreadQuery();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const selectedRoute = state.routes[state.index];
  const routes = state.routes.filter((route) => route.name !== "Discover");
  const unreadTotal = unread.reduce(
    (sum, row) => sum + Number(row.unread_count),
    0
  );
  const height = getBottomTabBarHeight(fontScale);
  return (
    <View
      pointerEvents="box-none"
      style={[s.root, { paddingBottom: Math.max(insets.bottom + 8, 18) }]}
    >
      <View
        style={[s.bar, { width: Math.min(width - 24, 620), minHeight: height }]}
      >
        {routes.map((route) => {
          const options = descriptors[route.key].options;
          const focused =
            selectedRoute?.name === route.name ||
            (selectedRoute?.name === "Discover" && route.name === "Calendar");
          const Icon = getRouteIcon(route.name);
          const label = getRouteLabel(
            route.name,
            options.tabBarLabel,
            options.title
          );
          const hasUnread = route.name === "Calendar" && unreadTotal > 0;
          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={
                options.tabBarAccessibilityLabel ??
                `${label}${
                  hasUnread ? `, ${unreadTotal} mensajes sin leer` : ""
                }`
              }
              accessibilityState={{ selected: focused }}
              activeOpacity={0.7}
              style={[s.tab, { minHeight: height }]}
              onLongPress={() =>
                navigation.emit({ type: "tabLongPress", target: route.key })
              }
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (event.defaultPrevented || focused) return;
                if (route.name === "Calendar")
                  navigation.navigate(route.name, { initialSection: "chat" });
                else navigation.navigate(route.name);
              }}
            >
              <View style={[s.icon, focused && s.activeIcon]}>
                <Icon
                  size={24}
                  strokeWidth={2}
                  color={focused ? "#536F91" : "#777975"}
                />
                {hasUnread ? (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>
                      {unreadTotal > 99 ? "99+" : unreadTotal}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
                style={[s.label, focused && s.activeLabel]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  root: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },
  bar: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 4,
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 7,
  },
  tab: {
    flex: 1,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 1,
    gap: 2,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  activeIcon: { backgroundColor: "#E7EDF5" },
  label: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: "center",
    color: "#777975",
    width: "100%",
  },
  activeLabel: { color: "#536F91" },
  badge: {
    position: "absolute",
    top: -2,
    right: -6,
    minWidth: 18,
    minHeight: 18,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: "#DDB16A",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#392E1D", fontSize: 10, lineHeight: 12 },
});
