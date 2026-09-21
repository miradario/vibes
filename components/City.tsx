import React from "react";
import { TouchableOpacity } from "react-native";
import { Text } from "./Typography";
import Icon from "./Icon";
import styles, { DARK_GRAY } from "../assets/styles";

const City = () => (
  <TouchableOpacity style={styles.city}>
    <Text style={styles.cityText}>
      <Icon name="navigate" size={13} color={DARK_GRAY} /> Near You
    </Text>
  </TouchableOpacity>
);

export default City;
