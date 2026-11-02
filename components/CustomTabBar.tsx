import { vibesTheme } from "../src/theme/vibesTheme";
/** @format */

import React, { memo, useEffect } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type ColorValue,
} from "react-native";
import { Text } from "./Typography";
import {
  TAB_BAR_TOP_SPACE,
  TAB_INDICATOR,
  TAB_ITEM_GAP,
  getBottomTabBarHeight,
  getTabSlotWeight,
  getTabBarBottomPadding,
} from "../src/lib/tabBarLayout";
import { useFtuxHighlightedTab } from "../src/ftux/ftuxStore";
import { useCommunityUnreadQuery } from "../src/queries/communityReceipts.queries";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  CalendarDays,
  GraduationCap,
  Compass,
  Home,
  MessageCircle,
  Tag,
  Trophy,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react-native";
import { badgeStyles } from "./ui/surfaceStyles";
import * as ds from "../src/theme/tokens";

const TAB_BAR_HEIGHT = 64;
const ANIMATION_CONFIG = { duration: ds.motion.modal.sheetInDuration, reduceMotion: ReduceMotion.System };

const iconByRoute: Record<string, LucideIcon> = {
  Discover: Compass,
  Flow: Trophy,
  EventsTab: CalendarDays,
  ClassesTab: GraduationCap,
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

// DS §5.22: el pill del tab activo usa el acento de cada pestaña.
const makeTabAccent = (color: string) => ({ pill: color as ColorValue });

const routeAccent: Record<string, ReturnType<typeof makeTabAccent>> = {
  Home: makeTabAccent(ds.colors.base.coral),
  Flow: makeTabAccent(ds.colors.base.blue),
  EventsTab: makeTabAccent(ds.colors.base.coral),
  ClassesTab: makeTabAccent(ds.colors.base.mustard),
  Discover: makeTabAccent(ds.colors.base.blue),
  Calendar: makeTabAccent(ds.colors.base.coral),
  Aura: makeTabAccent(ds.colors.base.blue),
};

const labelByRoute: Record<string, string> = {
  Discover: "Descubrir",
  Flow: "Desafíos",
  EventsTab: "Eventos",
  ClassesTab: "Clases",
  Home: "Inicio",
  Calendar: "Chats",
  Aura: "Perfil",
};

const getRouteIcon = (routeName: string) =>
  iconByRoute[routeName] ?? fallbackIconByRoute[routeName] ?? Home;

const getRouteLabel = (
  routeName: string,
  label: BottomTabBarProps["descriptors"][string]["options"]["tabBarLabel"],
  title?: string
) => {
  if (routeName === "EventsTab" && typeof label === "string") return label;
  if (labelByRoute[routeName]) return labelByRoute[routeName];
  if (typeof label === "string") return label;
  return title ?? routeName;
};

type TabButtonProps = {
  icon: LucideIcon;
  isFocused: boolean;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
  height: number;
  weight: number;
  accessibilityLabel: string;
  accentColor: ColorValue;
  unreadCount?: number;
  highlighted?: boolean;
};

const formatUnreadBadge = (count: number) => (count > 9 ? "9+" : String(count));

const TabButton = memo(
  ({
    icon: Icon,
    isFocused,
    label,
    onPress,
    onLongPress,
    height,
    weight,
    accessibilityLabel,
    accentColor,
    unreadCount = 0,
    highlighted = false,
  }: TabButtonProps) => {
    const focusProgress = useSharedValue(isFocused ? 1 : 0);

    useEffect(() => {
      focusProgress.value = withTiming(isFocused ? 1 : 0, ANIMATION_CONFIG);
    }, [focusProgress, isFocused]);

    const pillStyle = useAnimatedStyle(() => ({ opacity: focusProgress.value }));

    return (
      <TouchableOpacity
        accessibilityRole="tab"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={isFocused ? { selected: true } : {}}
        activeOpacity={ds.opacity.pressed}
        onPress={onPress}
        onLongPress={onLongPress}
        style={[localStyles.tabItem, { height, flex: weight }]}
      >
        <View style={localStyles.tabContent}>
          <View style={localStyles.iconWrap}>
            {highlighted ? (
              <Animated.View
                pointerEvents="none"
                entering={FadeIn.duration(240).reduceMotion(ReduceMotion.System)}
                style={localStyles.ftuxRing}
              />
            ) : null}
            <Animated.View
              pointerEvents="none"
              style={[localStyles.indicator, { backgroundColor: accentColor }, pillStyle]}
            />
            <Icon
              size={ds.iconSize.md}
              color={ds.colors.icon.default}
              strokeWidth={2.05}
            />
            {unreadCount > 0 ? (
              <View style={localStyles.unreadBadge}>
                <Text style={localStyles.unreadBadgeText}>
                  {formatUnreadBadge(unreadCount)}
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={[localStyles.tabLabel, isFocused && localStyles.tabLabelSelected]}
          >
            {label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }
);

const CustomTabBar = ({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) => {
  const { data: unread = [] } = useCommunityUnreadQuery();
  // Vibi's onboarding points at a tab: draw a spotlight ring on its pill.
  const ftuxHighlightedTab = useFtuxHighlightedTab();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const barHeight = getBottomTabBarHeight(fontScale);
  const selectedRoute = state.routes[state.index];
  const visibleRoutes = state.routes.filter((route) => route.name !== "Aura");
  const homeIndex = visibleRoutes.findIndex(route => route.name === "Home");
  const vibesUnreadCount = unread.reduce(
    (sum, row) => sum + Number(row.unread_count),
    0
  );
  const tabCount = Math.max(visibleRoutes.length, 1);
  const barWidth = width;

  const handlePress = (
    route: (typeof state.routes)[number],
    isFocused: boolean
  ) => {
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (event.defaultPrevented) return;

    if (!isFocused) {
      if (route.name === "Calendar") {
        navigation.navigate(route.name, { initialSection: "chat" });
        return;
      }

      navigation.navigate(route.name);
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={localStyles.root}
    >
      <View style={[localStyles.barShadow, { width: barWidth, paddingBottom: getTabBarBottomPadding(insets.bottom) }]}>
        <View style={[localStyles.bar, { height: barHeight }]}>
          {visibleRoutes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = selectedRoute?.name === route.name;
            const Icon = getRouteIcon(route.name);
            const routeColor = routeAccent[route.name] ?? routeAccent.EventsTab;
            const label = getRouteLabel(
              route.name,
              options.tabBarLabel,
              options.title
            );
            const accessibilityLabel =
              options.tabBarAccessibilityLabel ?? String(label);

            return (
              <TabButton
                key={route.key}
                height={barHeight}
                weight={getTabSlotWeight(index, tabCount, homeIndex)}
                onLongPress={() =>
                  navigation.emit({ type: "tabLongPress", target: route.key })
                }
                accessibilityLabel={accessibilityLabel}
                accentColor={routeColor.pill}
                highlighted={ftuxHighlightedTab === route.name}
                icon={Icon}
                isFocused={isFocused}
                label={label}
                onPress={() => handlePress(route, isFocused)}
                unreadCount={route.name === "Calendar" ? vibesUnreadCount : 0}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
};

const localColors = {
  bg: vibesTheme.colors.background,
  surface: vibesTheme.colors.background,
  primaryText: vibesTheme.colors.primaryText as ColorValue,
  muted: vibesTheme.colors.secondaryText as ColorValue,
};

const localStyles = StyleSheet.create({
  root: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingTop: TAB_BAR_TOP_SPACE,
  },
  barShadow: {

    backgroundColor: localColors.surface,
    ...ds.shadows.md,
  },
  bar: {
    height: TAB_BAR_HEIGHT,
    backgroundColor: localColors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    overflow: "visible",
    paddingHorizontal: ds.spacing[3],
  },
  tabItem: {
    flex: 1,
    height: TAB_BAR_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  tabContent: {
    width: "100%",
    minWidth: TAB_INDICATOR.width,
    alignItems: "center",
    justifyContent: "center",
    gap: TAB_ITEM_GAP,
  },
  iconWrap: {
    position: "relative",
    width: TAB_INDICATOR.width,
    height: TAB_INDICATOR.height,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    width: "100%",
    color: localColors.muted,
    ...ds.textStyles.caption,
    textAlign: "center",
  },
  tabLabelSelected: {
    color: ds.colors.text.primary,
  },
  indicator: {
    position: "absolute",
    width: TAB_INDICATOR.width,
    height: TAB_INDICATOR.height,
    borderRadius: ds.radii.pill,
  },
  ftuxRing: {
    position: "absolute",
    width: TAB_INDICATOR.width + ds.spacing[3],
    height: TAB_INDICATOR.height + ds.spacing[3],
    borderRadius: ds.radii.pill,
    borderWidth: 2,
    borderColor: ds.colors.border.selected,
  },
  unreadBadge: {
    ...badgeStyles.count,
    ...badgeStyles.outlined,
    position: "absolute",
    top: -7,
    right: -13,
  },
  unreadBadgeText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.micro,
  },
});

export default CustomTabBar;
