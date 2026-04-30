/** @format */

import React from "react";
import { StyleSheet, View, TouchableOpacity, Text } from "react-native";
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
          const isHome = route.name === "Home";

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
              style={[styles.tabItem, isHome && localStyles.homeTabItem]}
            >
              {isFocused && !isHome && <View style={styles.tabBump} />}
              {isHome ? (
                <>
                  <View
                    style={[
                      localStyles.homeCircle,
                      isFocused
                        ? localStyles.homeCircleFocused
                        : localStyles.homeCircleInactive,
                    ]}
                  >
                    <Icon
                      name="home"
                      size={28}
                      color={isFocused ? WHITE : TEXT_SECONDARY}
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[
                      styles.tabButtonText,
                      localStyles.homeLabel,
                      { color: isFocused ? PRIMARY_COLOR : TEXT_SECONDARY },
                    ]}
                  >
                    {String(label)}
                  </Text>
                </>
              ) : isFocused ? (
                <View style={styles.tabCircle}>
                  {icon ? (
                    icon({ focused: true })
                  ) : (
                    <Icon name="heart" size={22} color={WHITE} />
                  )}
                </View>
              ) : (
                icon && icon({ focused: false })
              )}
              {!isHome && isFocused ? (
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[styles.tabButtonText, { color: PRIMARY_COLOR }]}
                >
                  {String(label)}
                </Text>
              ) : !isHome ? (
                <View style={{ height: 18 }} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default CustomTabBar;

const localStyles = StyleSheet.create({
  homeTabItem: {
    flex: 1.08,
  },
  homeCircle: {
    top: -18,
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.26,
    shadowRadius: 12,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { height: 6, width: 0 },
    borderWidth: 1  ,
    borderColor: "#F6F6F4",
  },
  homeCircleFocused: {
    transform: [{ scale: 1.04 }],
  },
  homeCircleInactive: {
    backgroundColor: "#F6F6F4",
    borderColor: "#AEBFD1",
    shadowOpacity: 0,
  },
  homeLabel: {
    marginTop: -14,
  },
});
