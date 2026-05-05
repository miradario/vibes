/** @format */

import React, { memo, useEffect } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type ColorValue,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  CalendarDays,
  Compass,
  Home,
  MessageCircle,
  Tag,
  Trophy,
  UserRound,
  type LucideIcon,
} from "lucide-react-native";

const TAB_BAR_HEIGHT = 82;
const FLOATING_BUTTON_SIZE = 64;
const NOTCH_SIZE = 104;
const HORIZONTAL_MARGIN = 18;
const FLOATING_TOP = 16;
const SELECTED_RISE = -52;
const ANIMATION_CONFIG = { duration: 520 };

const iconByRoute: Record<string, LucideIcon> = {
  Discover: Compass,
  Flow: Trophy,
  Home,
  Calendar: MessageCircle,
  Aura: UserRound,
};

const fallbackIconByRoute: Record<string, LucideIcon> = {
  Discover: Tag,
  Flow: MessageCircle,
  Calendar: CalendarDays,
};

const routeAccent: Record<
  string,
  { text: ColorValue; gradient: [string, string]; shadow: string; glow: string }
> = {
  Discover: { text: "#AEBFD1", gradient: ["#C4D2DF", "#AEBFD1"], shadow: "#AEBFD1", glow: "rgba(174, 191, 209, 0.14)" },
  Flow: { text: "#E4B76E", gradient: ["#EBC57F", "#E4B76E"], shadow: "#E4B76E", glow: "rgba(228, 183, 110, 0.14)" },
  Home: { text: "#AEBFD1", gradient: ["#C4D2DF", "#AEBFD1"], shadow: "#AEBFD1", glow: "rgba(174, 191, 209, 0.14)" },
  Calendar: { text: "#E4B76E", gradient: ["#EBC57F", "#E4B76E"], shadow: "#E4B76E", glow: "rgba(228, 183, 110, 0.14)" },
  Aura: { text: "#AEBFD1", gradient: ["#C4D2DF", "#AEBFD1"], shadow: "#AEBFD1", glow: "rgba(174, 191, 209, 0.14)" },
};

const labelByRoute: Record<string, string> = {
  Discover: "Explorar",
  Flow: "Desafíos",
  Home: "Inicio",
  Calendar: "Vibes",
  Aura: "Perfil",
};

const getRouteIcon = (routeName: string) =>
  iconByRoute[routeName] ?? fallbackIconByRoute[routeName] ?? Home;

const getRouteLabel = (
  routeName: string,
  label: BottomTabBarProps["descriptors"][string]["options"]["tabBarLabel"],
  title?: string,
) => {
  if (labelByRoute[routeName]) return labelByRoute[routeName];
  if (typeof label === "string") return label;
  return title ?? routeName;
};

type TabButtonProps = {
  icon: LucideIcon;
  isFocused: boolean;
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  accentColor: ColorValue;
};

const TabButton = memo(
  ({
    icon: Icon,
    isFocused,
    label,
    onPress,
    accessibilityLabel,
    accentColor,
  }: TabButtonProps) => {
    const focusProgress = useSharedValue(isFocused ? 1 : 0);

    useEffect(() => {
      focusProgress.value = withTiming(isFocused ? 1 : 0, ANIMATION_CONFIG);
    }, [focusProgress, isFocused]);

    const contentStyle = useAnimatedStyle(() => ({
      opacity: interpolate(focusProgress.value, [0, 0.72, 1], [1, 0.15, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(
            focusProgress.value,
            [0, 1],
            [0, SELECTED_RISE],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(focusProgress.value, [0, 1], [1, 0.84], Extrapolation.CLAMP),
        },
      ],
    }));

    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={isFocused ? { selected: true } : {}}
        activeOpacity={0.78}
        onPress={onPress}
        style={localStyles.tabItem}
      >
        <Animated.View style={[localStyles.tabContent, contentStyle]}>
          <Icon size={27} color={localColors.inactiveIcon} strokeWidth={2.05} />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            style={[
              localStyles.tabLabel,
              isFocused && { color: accentColor },
            ]}
          >
            {label}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    );
  },
);

const CustomTabBar = ({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const selectedIndex = useSharedValue(state.index);
  const selectedIconProgress = useSharedValue(1);
  const selectedRoute = state.routes[state.index];
  const SelectedIcon = getRouteIcon(selectedRoute?.name ?? "Home");
  const tabCount = Math.max(state.routes.length, 1);
  const barWidth = Math.min(width - HORIZONTAL_MARGIN * 2, 620);
  const barLeft = (width - barWidth) / 2;
  const selectedAccent = routeAccent[selectedRoute?.name ?? "Home"] ?? routeAccent.Home;

  useEffect(() => {
    selectedIndex.value = withTiming(state.index, ANIMATION_CONFIG);
    selectedIconProgress.value = 0;
    selectedIconProgress.value = withTiming(1, { duration: 360 });
  }, [selectedIconProgress, selectedIndex, state.index]);

  const bubbleStyle = useAnimatedStyle(() => {
    const slotCenter = ((selectedIndex.value + 0.5) / tabCount) * barWidth;

    return {
      transform: [
        { translateX: slotCenter - FLOATING_BUTTON_SIZE / 2 },
        {
          translateY: interpolate(
            selectedIndex.value,
            [state.index - 0.5, state.index, state.index + 0.5],
            [5, 0, 5],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const notchStyle = useAnimatedStyle(() => {
    const slotCenter = ((selectedIndex.value + 0.5) / tabCount) * barWidth;

    return {
      transform: [{ translateX: slotCenter - NOTCH_SIZE / 2 }],
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
          Extrapolation.CLAMP,
        ),
      },
      {
        scale: interpolate(
          selectedIconProgress.value,
          [0, 1],
          [0.76, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const handlePress = (route: (typeof state.routes)[number], isFocused: boolean) => {
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        localStyles.root,
        { paddingBottom: Math.max(insets.bottom + 8, 18) },
      ]}
    >
      <View style={[localStyles.barShadow, { width: barWidth }]}>
        <View style={localStyles.bar}>
          <Animated.View pointerEvents="none" style={[localStyles.notchPlate, notchStyle]} />
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const Icon = getRouteIcon(route.name);
            const routeColor = routeAccent[route.name] ?? routeAccent.Home;
            const label = getRouteLabel(route.name, options.tabBarLabel, options.title);
            const accessibilityLabel =
              options.tabBarAccessibilityLabel ??
              String(label);

            return (
              <TabButton
                key={route.key}
                accessibilityLabel={accessibilityLabel}
                accentColor={routeColor.text}
                icon={Icon}
                isFocused={isFocused}
                label={label}
                onPress={() => handlePress(route, isFocused)}
              />
            );
          })}
        </View>
      </View>

      <Animated.View
        pointerEvents="box-none"
        style={[
          localStyles.floatingWrap,
          { left: barLeft, width: barWidth },
          bubbleStyle,
        ]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: true }}
          activeOpacity={0.88}
          onPress={() => handlePress(selectedRoute, true)}
          style={localStyles.floatingTouch}
        >
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
                <SelectedIcon size={29} color={localColors.primaryText} strokeWidth={2.25} />
              </Animated.View>
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const localColors = {
  bg: "#F6F6F4",
  surface: "#FFFFFF",
  primaryText: "#2B2B2B" as ColorValue,
  inactiveIcon: "#6E6E6E" as ColorValue,
  muted: "#6E6E6E" as ColorValue,
};

const localStyles = StyleSheet.create({
  root: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingTop: 46,
  },
  barShadow: {
    maxWidth: 620,
    borderRadius: 38,
    backgroundColor: localColors.surface,
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  bar: {
    height: TAB_BAR_HEIGHT,
    borderRadius: 38,
    backgroundColor: localColors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    overflow: "visible",
    paddingHorizontal: 10,
  },
  notchPlate: {
    position: "absolute",
    top: -50,
    left: 0,
    width: NOTCH_SIZE,
    height: NOTCH_SIZE,
    borderRadius: NOTCH_SIZE / 2,
    backgroundColor: localColors.surface,
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.035,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tabItem: {
    flex: 1,
    height: TAB_BAR_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  tabContent: {
    width: "100%",
    minWidth: 54,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tabLabel: {
    maxWidth: 74,
    color: localColors.muted,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 15,
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
    width: 84,
    height: 84,
    borderRadius: 42,
    opacity: 0.42,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.22,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
      },
      android: {
        elevation: 4,
      },
    }),
  },
  floatingRing: {
    width: FLOATING_BUTTON_SIZE,
    height: FLOATING_BUTTON_SIZE,
    borderRadius: FLOATING_BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 7,
  },
  floatingButton: {
    width: FLOATING_BUTTON_SIZE - 8,
    height: FLOATING_BUTTON_SIZE - 8,
    borderRadius: (FLOATING_BUTTON_SIZE - 8) / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default CustomTabBar;
