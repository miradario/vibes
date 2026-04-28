import React from "react";
import { View } from "react-native";
import Icon from "./Icon";
import styles from "../assets/styles";
import { TabBarIconT } from "../types";

const TabBarIcon = ({ focused, iconName }: TabBarIconT) => {
  const iconFocused = focused ? "#243D8E" : "#606AA6";

  return (
    <View style={styles.iconMenu}>
      <Icon name={iconName} size={20} color={iconFocused} />
    </View>
  );
};

export default TabBarIcon;
