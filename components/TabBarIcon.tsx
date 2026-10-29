import React from "react";
import { View } from "react-native";
import Icon from "./Icon";
import styles, { TEXT_SECONDARY, WHITE } from "../assets/styles";
import { TabBarIconT } from "../types";
import * as ds from "../src/theme/tokens";

const TabBarIcon = ({ focused, iconName }: TabBarIconT) => {
  const iconFocused = focused ? WHITE : TEXT_SECONDARY;

  return (
    <View style={styles.iconMenu}>
      <Icon name={iconName} size={focused ? ds.iconSize.lg : ds.iconSize.md} color={iconFocused} />
    </View>
  );
};

export default TabBarIcon;
