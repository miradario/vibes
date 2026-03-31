/** @format */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Icon } from "../components";
import styles, { DARK_GRAY } from "../assets/styles";

const Matches = () => {
  const navigation = useNavigation();
  return (
    <View style={styles.bg}>
      <View style={styles.soulmateScreen}>
        <View style={styles.soulmateHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={22} color={DARK_GRAY} />
          </TouchableOpacity>
          <Text style={styles.soulmateTitle}>Resonances</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={localStyles.emptyState}>
          <Text style={localStyles.emptyTitle}>No real resonances yet</Text>
          <Text style={localStyles.emptyText}>
            This screen no longer uses demo connections. Show matches here once the
            backend exposes real connected users.
          </Text>
        </View>

        <TouchableOpacity style={styles.soulmateFooterButton}>
          <Text style={styles.soulmateFooterText}>See previous resonances</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Matches;

const localStyles = {
  emptyState: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 28,
  },
  emptyTitle: {
    color: "#2B2B2B",
    fontSize: 24,
    fontFamily: "CormorantGaramond_600SemiBold",
    textAlign: "center" as const,
  },
  emptyText: {
    marginTop: 10,
    color: "#6E6E6E",
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "CormorantGaramond_500Medium",
    textAlign: "center" as const,
  },
};
