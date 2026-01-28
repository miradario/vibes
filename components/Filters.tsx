import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Icon from "./Icon";
import styles, { DARK_GRAY } from "../assets/styles";

const Filters = () => (
  <TouchableOpacity style={styles.filters}>
    <View style={styles.filtersRow}>
      <View style={styles.filtersIcon}>
        <Icon name="options" size={14} color={DARK_GRAY} />
      </View>
      <View>
        <Text style={styles.filtersLabel}>Intentions</Text>
        <Text style={styles.filtersValue}>Connection</Text>
      </View>
    </View>
    <View style={styles.filtersChevron}>
      <Icon name="chevron-down" size={16} color={DARK_GRAY} />
    </View>
  </TouchableOpacity>
);

export default Filters;
