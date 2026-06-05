/** @format */

import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRoute } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "../components/Icon";
import { MessagesContent } from "./Messages";
import {
  DiscoverContent,
  type DiscoverContentHandle,
} from "./Discover";
import { useI18n } from "../src/i18n";
import { vibesTheme } from "../src/theme/vibesTheme";

type ConnectionSection = "chat" | "discover";

const getInitialSection = (value: unknown): ConnectionSection =>
  value === "discover" ? "discover" : "chat";

const Connections = () => {
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const discoverRef = useRef<DiscoverContentHandle>(null);
  const [activeSection, setActiveSection] = useState<ConnectionSection>(
    getInitialSection(route.params?.initialSection),
  );

  useEffect(() => {
    setActiveSection(getInitialSection(route.params?.initialSection));
  }, [route.params?.initialSection]);

  return (
    <SafeAreaView style={localStyles.screen} edges={["top", "left", "right"]}>
      <View style={localStyles.headerBlock}>
        <View style={localStyles.segmentedControl}>
          {([
            { value: "chat", label: "Chat" },
            { value: "discover", label: t("tabs.discover") },
          ] as const).map((item) => {
            const isActive = activeSection === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                style={[
                  localStyles.segmentButton,
                  isActive && localStyles.segmentButtonActive,
                ]}
                activeOpacity={0.84}
                onPress={() => setActiveSection(item.value)}
              >
                <Text
                  style={[
                    localStyles.segmentText,
                    isActive && localStyles.segmentTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeSection === "discover" ? (
          <View style={localStyles.filtersRow}>
            <TouchableOpacity
              style={localStyles.filtersButton}
              activeOpacity={0.84}
              onPress={() => discoverRef.current?.openFilters()}
            >
              <Icon name="options-outline" size={17} color="#2B2B2B" />
              <Text style={localStyles.filtersButtonText}>
                {t("discover.filters")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <View style={localStyles.content}>
        <View
          pointerEvents={activeSection === "chat" ? "auto" : "none"}
          style={[
            localStyles.pane,
            activeSection === "chat" ? localStyles.visiblePane : localStyles.hiddenPane,
          ]}
        >
          <MessagesContent
            showHeader={false}
            contentTopPadding={10}
            contentBottomPadding={Math.max(insets.bottom + 90, 118)}
          />
        </View>

        <View
          pointerEvents={activeSection === "discover" ? "auto" : "none"}
          style={[
            localStyles.pane,
            { paddingBottom: Math.max(insets.bottom + 90, 118) },
            activeSection === "discover"
              ? localStyles.visiblePane
              : localStyles.hiddenPane,
          ]}
        >
          <DiscoverContent ref={discoverRef} showHeader={false} />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Connections;

const localStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFDF8",
  },
  headerBlock: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
  },
  filtersButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(43,43,43,0.08)",
  },
  filtersButtonText: {
    color: "#2B2B2B",
    fontSize: 14,
    fontFamily: vibesTheme.fonts.medium,
  },
  filtersRow: {
    marginTop: 12,
    alignItems: "flex-start",
  },
  segmentedControl: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 999,
    backgroundColor: "rgba(20, 40, 62, 0.08)",
  },
  segmentButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingVertical: 12,
  },
  segmentButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#2B2B2B",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  segmentText: {
    color: "#6E6E6E",
    fontSize: 15,
    fontFamily: vibesTheme.fonts.medium,
  },
  segmentTextActive: {
    color: "#2B2B2B",
    fontFamily: vibesTheme.fonts.semibold,
  },
  content: {
    flex: 1,
  },
  pane: {
    flex: 1,
  },
  visiblePane: {
    display: "flex",
  },
  hiddenPane: {
    display: "none",
  },
});
