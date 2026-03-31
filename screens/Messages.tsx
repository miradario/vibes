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

const Messages = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.bg}>
      <View style={styles.containerMessages}>
        <View style={styles.flowTop}>
          <TouchableOpacity style={styles.flowTopIcon}>
            <Icon name="infinite" color={DARK_GRAY} size={20} />
          </TouchableOpacity>
          <View style={styles.flowTopCenter}>
            <Icon name="chatbubble-ellipses" color="#AEBFD1" size={26} />
          </View>
          <TouchableOpacity style={styles.flowTopIcon}>
            <Icon name="ellipsis-vertical" color={DARK_GRAY} size={20} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.flowSectionHeader}
          onPress={() => navigation.navigate("Soulmates" as never)}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Icon name="heart" color="#AEBFD1" size={16} />
            <Text
              style={[
                styles.flowSectionTitle,
                { marginLeft: 8, color: "#AEBFD1" },
              ]}
            >
              New Connections
            </Text>
          </View>
          <View style={styles.flowSectionCount}>
            <Text style={styles.flowSectionCountText}>0</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.flowSectionHeader}>
          <Text style={styles.flowSectionTitle}>Messages</Text>
        </View>

        <View style={localStyles.emptyState}>
          <Text style={localStyles.emptyTitle}>No real messages yet</Text>
          <Text style={localStyles.emptyText}>
            Demo conversations were removed. Render this list once the app has a
            real matches or chat source.
          </Text>
        </View>
      </View>
    </View>
  );
};

export default Messages;

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
