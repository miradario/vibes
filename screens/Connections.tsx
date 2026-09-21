import UnreadBadge from "../components/UnreadBadge";
import { useCommunityUnreadQuery } from "../src/queries/communityReceipts.queries";
/** @format */

import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { MessagesContent } from "./Messages";
import { DiscoverContent } from "./Discover";
import { useI18n } from "../src/i18n";
import { getBottomTabContentPadding } from "../src/lib/tabBarLayout";
import { vibesTheme } from "../src/theme/vibesTheme";

type ConnectionSection = "chat" | "discover";

const getInitialSection = (value: unknown): ConnectionSection =>
  value === "discover" ? "discover" : "chat";

const Connections = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  useWindowDimensions(); // Recompute bottom spacing when system text size changes.
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState<ConnectionSection>(
    getInitialSection(route.params?.initialSection)
  );
  const { data: unread = [] } = useCommunityUnreadQuery();
  const unreadTotal = unread.reduce(
    (sum, row) => sum + Number(row.unread_count),
    0
  );

  useEffect(() => {
    setActiveSection(getInitialSection(route.params?.initialSection));
  }, [
    route.params?.discoverEntryKey,
    route.params?.homeEntryKey,
    route.params?.initialSection,
  ]);

  return (
    <SafeAreaView style={localStyles.screen} edges={["top", "left", "right"]}>
      <View style={localStyles.headerBlock}>
        <View style={localStyles.segmentedControl}>
          {(
            [
              { value: "chat", label: "Chat" },
              { value: "discover", label: t("tabs.discover") },
            ] as const
          ).map((item) => {
            const isActive = activeSection === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                style={[
                  localStyles.segmentButton,
                  isActive && localStyles.segmentButtonActive,
                ]}
                activeOpacity={0.84}
                onPress={() => setActiveSection(item.value)}
              >
                <View style={localStyles.segmentButtonContent}>
                  <Text
                    style={[
                      localStyles.segmentText,
                      isActive && localStyles.segmentTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === "chat" ? (
                    <UnreadBadge count={unreadTotal} />
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={localStyles.content}>
        <View
          pointerEvents={activeSection === "chat" ? "auto" : "none"}
          style={[
            localStyles.pane,
            activeSection === "chat"
              ? localStyles.visiblePane
              : localStyles.hiddenPane,
          ]}
        >
          <MessagesContent
            homeEntryKey={route.params?.homeEntryKey}
            homeTarget={route.params?.homeTarget}
            initialMessagesTab={route.params?.initialMessagesTab}
            showHeader={false}
            contentTopPadding={4}
            contentBottomPadding={getBottomTabContentPadding(
              insets.bottom,
              118
            )}
          />
        </View>

        <View
          pointerEvents={activeSection === "discover" ? "auto" : "none"}
          style={[
            localStyles.pane,
            { paddingBottom: getBottomTabContentPadding(insets.bottom, 118) },
            activeSection === "discover"
              ? localStyles.visiblePane
              : localStyles.hiddenPane,
          ]}
        >
          <DiscoverContent
            showHeader={false}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Connections;

const localStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: vibesTheme.colors.background,
  },
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  sharedExperiencesCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: "rgba(43,43,43,0.07)",
  },
  sharedExperiencesHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sharedExperiencesIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(118,91,145,0.12)",
  },
  sharedExperiencesCopy: {
    flex: 1,
  },
  sharedExperiencesTitle: {
    color: "#2B2B2B",
    fontSize: 16,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.semibold,
  },
  sharedExperiencesSubtitle: {
    marginTop: 2,
    color: "#746E68",
    fontSize: 13,
    lineHeight: 17,
    fontFamily: vibesTheme.fonts.regular,
  },
  sharedExperiencesActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  experienceButton: {
    flex: 1,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  challengeButton: {
    backgroundColor: "rgba(228,183,110,0.22)",
  },
  eventButton: {
    backgroundColor: "rgba(127,152,183,0.17)",
  },
  experienceButtonText: {
    color: "#383532",
    fontSize: 13,
    fontFamily: vibesTheme.fonts.medium,
  },
  segmentedControl: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 999,
    backgroundColor: "rgba(20, 40, 62, 0.08)",
  },
  segmentButton: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  segmentButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
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
    flexShrink: 1,
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
