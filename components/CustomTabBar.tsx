/** @format */

import React from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Icon from "./Icon";
import styles, { PRIMARY_COLOR, TEXT_SECONDARY, WHITE } from "../assets/styles";

const CustomTabBar = ({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) => {
  return (
    <View style={styles.tabBarWrapper}>
      <View style={styles.tabBarContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const icon = options.tabBarIcon as
            | ((props: { focused: boolean }) => React.ReactNode)
            | undefined;
          const isFocused = state.index === index;

          const onPress = () => {
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
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.tabItem}
            >
              <View
                style={[
                  styles.tabCircle,
                  !isFocused && styles.tabCircleInactive,
                ]}
              >
                {icon ? (
                  icon({ focused: isFocused })
                ) : (
                  <Icon
                    name="heart"
                    size={22}
                    color={isFocused ? PRIMARY_COLOR : TEXT_SECONDARY}
                  />
                )}
              </View>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.tabButtonText,
                  isFocused
                    ? styles.tabButtonTextActive
                    : styles.tabButtonTextInactive,
                ]}
              >
                {String(label)}
              </Text>
            </TouchableOpacity>
          );
        })}
        <View pointerEvents="none" style={styles.tabBarHandle} />
      </View>
    </View>
  );
};

export default CustomTabBar;
