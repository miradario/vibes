import React from "react";
import { View } from "react-native";
import Icon from "./Icon";
import styles, { TEXT_SECONDARY, WHITE } from "../assets/styles";
import { TabBarIconT } from "../types";

const TabBarIcon = ({ focused, iconName }: TabBarIconT) => {
  const iconFocused = focused ? WHITE : TEXT_SECONDARY;

  return (
    <View style={styles.iconMenu}>
      <Icon name={iconName} size={16} color={iconFocused} />
    </View>
  );
};

export default TabBarIcon;
