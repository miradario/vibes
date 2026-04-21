import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Icon from "./Icon";
import styles, { DARK_GRAY } from "../assets/styles";

type FiltersProps = {
  label?: string;
  value?: string;
  onPress?: () => void;
};

const Filters = ({
  label = "Filtros",
  value = "Personalizar",
  onPress,
}: FiltersProps) => (
  <TouchableOpacity style={styles.filters} onPress={onPress} activeOpacity={0.9}>
    <View style={styles.filtersRow}>
      <View style={styles.filtersIcon}>
        <Icon name="options" size={14} color={DARK_GRAY} />
      </View>
      <View>
        <Text style={styles.filtersLabel}>{label}</Text>
        <Text style={styles.filtersValue}>{value}</Text>
      </View>
    </View>
    <View style={styles.filtersChevron}>
      <Icon name="chevron-down" size={16} color={DARK_GRAY} />
    </View>
  </TouchableOpacity>
);

export default Filters;
