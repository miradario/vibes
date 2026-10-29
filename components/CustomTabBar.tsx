import { vibesTheme } from "../src/theme/vibesTheme";
/** @format */

import React, { memo, useEffect } from "react";
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type ColorValue,
} from "react-native";
import { Text } from "./Typography";
import {
  TAB_BAR_TOP_SPACE,
  TAB_FLOATING_BUTTON_SIZE,
  TAB_FLOATING_TOP,
  getBottomTabBarHeight,
  getTabSlotCenterX,
  getTabSlotWeight,
  getTabBarBottomPadding,
} from "../src/lib/tabBarLayout";
import { useFtuxHighlightedTab } from "../src/ftux/ftuxStore";
import { useCommunityUnreadQuery } from "../src/queries/communityReceipts.queries";
import { LinearGradient } from "expo-linear-gradient";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  ReduceMotion,
  Extrapolation,
  interpolate,
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
import * as ds from "../src/theme/tokens";

const TAB_BAR_HEIGHT = 64;
const FLOATING_BUTTON_SIZE = TAB_FLOATING_BUTTON_SIZE;
const FLOATING_TOP = TAB_FLOATING_TOP;
const SELECTED_RISE = -18;
const ANIMATION_CONFIG = { duration: 520, reduceMotion: ReduceMotion.System };

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

const makeTabAccent = (color: string) => ({
  text: color as ColorValue,
  gradient: [color, color] as [string, string],
  shadow: color,
  glow: ds.withAlpha(color, ds.opacity.medium),
});

const routeAccent: Record<string, ReturnType<typeof makeTabAccent>> = {
  Home: makeTabAccent(vibesTheme.colors.accentCoral),
  Flow: makeTabAccent(vibesTheme.colors.accentBlue),
  EventsTab: makeTabAccent(vibesTheme.colors.accentCoral),
  ClassesTab: makeTabAccent(vibesTheme.colors.accentMustard),
  Discover: makeTabAccent(vibesTheme.colors.accentBlue),
  Calendar: makeTabAccent(vibesTheme.colors.accentCoral),
  Aura: makeTabAccent(vibesTheme.colors.accentBlue),
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
  }: TabButtonProps) => {
    const focusProgress = useSharedValue(isFocused ? 1 : 0);

    useEffect(() => {
      focusProgress.value = withTiming(isFocused ? 1 : 0, ANIMATION_CONFIG);
    }, [focusProgress, isFocused]);

    const contentStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        focusProgress.value,
        [0, 0.72, 1],
        [1, 0.15, 0],
        Extrapolation.CLAMP
      ),
      transform: [
        {
          translateY: interpolate(
            focusProgress.value,
            [0, 1],
            [0, SELECTED_RISE],
            Extrapolation.CLAMP
          ),
        },
        {
          scale: interpolate(
            focusProgress.value,
            [0, 1],
            [1, 0.84],
            Extrapolation.CLAMP
          ),
        },
      ],
    }));

    return (
      <TouchableOpacity
        accessibilityRole="tab"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={isFocused ? { selected: true } : {}}
        activeOpacity={0.78}
        onPress={onPress}
        onLongPress={onLongPress}
        style={[localStyles.tabItem, { height, flex: weight }]}
      >
        <Animated.View style={[localStyles.tabContent, contentStyle]}>
          <View style={localStyles.iconWrap}>
            <Icon
              size={ds.iconSize.lg}
              color={vibesTheme.colors.primaryText}
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
            style={[localStyles.tabLabel, isFocused && { color: accentColor }]}
          >
            {label}
          </Text>
        </Animated.View>
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
  // Vibi's onboarding points at a tab: draw a spotlight ring on its bubble.
  const ftuxHighlightedTab = useFtuxHighlightedTab();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const barHeight = getBottomTabBarHeight(fontScale);
  const selectedRoute = state.routes[state.index];
  const visibleRoutes = state.routes.filter((route) => route.name !== "Aura");
  const selectedVisualRouteName = selectedRoute?.name;
  const showFloatingButton = selectedRoute?.name !== "Aura";
  const selectedVisualIndex = Math.max(
    visibleRoutes.findIndex((route) => route.name === selectedVisualRouteName),
    0
  );
  const homeIndex = visibleRoutes.findIndex(route => route.name === "Home");
  const selectedCenter = getTabSlotCenterX(selectedVisualIndex, visibleRoutes.length, width, homeIndex);
  const selectedIndex = useSharedValue(selectedCenter);
  const selectedIconProgress = useSharedValue(1);
  const selectedVisualRoute =
    visibleRoutes[selectedVisualIndex] ?? selectedRoute ?? visibleRoutes[0];
  const SelectedIcon = getRouteIcon(selectedVisualRoute?.name ?? "Home");
  const vibesUnreadCount = unread.reduce(
    (sum, row) => sum + Number(row.unread_count),
    0
  );
  const tabCount = Math.max(visibleRoutes.length, 1);
  const barWidth = width;
  const barLeft = (width - barWidth) / 2;
  const selectedAccent =
    routeAccent[selectedVisualRoute?.name ?? "Home"] ?? routeAccent.EventsTab;

  useEffect(() => {
    selectedIndex.value = withTiming(selectedCenter, ANIMATION_CONFIG);
    selectedIconProgress.value = 0;
    selectedIconProgress.value = withTiming(1, {
      duration: 360,
      reduceMotion: ReduceMotion.System,
    });
  }, [selectedIconProgress, selectedIndex, selectedCenter]);

  const bubbleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: selectedIndex.value - FLOATING_BUTTON_SIZE / 2 }],
    };
  });

  const floatingIconStyle = useAnimatedStyle(() => ({
    opacity: selectedIconProgress.value,
    transform: [
      {
        translateY: interpolate(
          selectedIconProgress.value,
          [0, 1],
          [12, 0],
          Extrapolation.CLAMP
        ),
      },
      {
        scale: interpolate(
          selectedIconProgress.value,
          [0, 1],
          [0.76, 1],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

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
                accentColor={routeColor.text}
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

      {showFloatingButton && (
        <Animated.View
          pointerEvents="box-none"
          style={[localStyles.floatingWrap, { left: barLeft }, bubbleStyle]}
        >
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityLabel={
              labelByRoute[selectedVisualRoute?.name ?? "Home"]
            }
            accessibilityState={{ selected: true }}
            activeOpacity={0.88}
            onPress={() => handlePress(selectedVisualRoute, true)}
            style={localStyles.floatingTouch}
          >
            {ftuxHighlightedTab === selectedVisualRoute?.name ? (
              <Animated.View
                pointerEvents="none"
                entering={FadeIn.duration(240).reduceMotion(ReduceMotion.System)}
                style={localStyles.ftuxRing}
              />
            ) : null}
            <View
              style={[
                localStyles.glow,
                {
                  backgroundColor: selectedAccent.glow,
                  shadowColor: selectedAccent.shadow,
                },
              ]}
            />
            <View style={localStyles.floatingRing}>
              <LinearGradient
                colors={selectedAccent.gradient}
                start={{ x: 0.16, y: 0.08 }}
                end={{ x: 0.84, y: 0.95 }}
                style={localStyles.floatingButton}
              >
                <Animated.View style={floatingIconStyle}>
                  <SelectedIcon
                    size={25}
                    color={vibesTheme.colors.primaryText}
                    strokeWidth={2.25}
                  />
                </Animated.View>
              </LinearGradient>
            </View>
            {selectedVisualRoute?.name === "Calendar" &&
              vibesUnreadCount > 0 && (
                <View style={localStyles.unreadBadge}>
                  <Text style={localStyles.unreadBadgeText}>
                    {formatUnreadBadge(vibesUnreadCount)}
                  </Text>
                </View>
              )}
          </TouchableOpacity>
        </Animated.View>
      )}
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
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: ds.spacing[2],
  },
  iconWrap: {
    position: "relative",
  },
  tabLabel: {
    width: "100%",
    color: localColors.muted,
    ...ds.textStyles.micro,
    textAlign: "center",
  },
  floatingWrap: {
    position: "absolute",
    top: FLOATING_TOP,
    width: FLOATING_BUTTON_SIZE,
    height: FLOATING_BUTTON_SIZE,
  },
  floatingTouch: {
    width: FLOATING_BUTTON_SIZE,
    height: FLOATING_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: ds.radii.pill,
    opacity: 0.34,
    ...Platform.select({
      ios: {
        ...ds.shadows.md,
      },
      android: {
        elevation: ds.shadows.md.elevation,
      },
    }),
  },
  ftuxRing: {
    position: "absolute",
    width: FLOATING_BUTTON_SIZE + 18,
    height: FLOATING_BUTTON_SIZE + 18,
    borderRadius: (FLOATING_BUTTON_SIZE + 18) / 2,
    borderWidth: 3,
    borderColor: vibesTheme.colors.accentMustard,
    backgroundColor: vibesTheme.colors.surface,
  },
  floatingRing: {
    width: FLOATING_BUTTON_SIZE,
    height: FLOATING_BUTTON_SIZE,
    borderRadius: FLOATING_BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    ...ds.shadows.sm,
  },
  floatingButton: {
    width: FLOATING_BUTTON_SIZE,
    height: FLOATING_BUTTON_SIZE,
    borderRadius: FLOATING_BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadge: {
    position: "absolute",
    top: -7,
    right: -13,
    minWidth: 18,
    height: 18,
    borderRadius: ds.radii.pill,
    paddingHorizontal: ds.spacing[1],
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.accentMustard,
    borderWidth: 1.5,
    borderColor: vibesTheme.colors.background,
  },
  unreadBadgeText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.micro,
  },
});

export default CustomTabBar;
