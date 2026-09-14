/** @format */

import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Icon from "../components/Icon";
import { MessagesContent } from "./Messages";
import { DiscoverContent, type DiscoverContentHandle } from "./Discover";
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
  const { t } = useI18n();
  const discoverRef = useRef<DiscoverContentHandle>(null);
  const [activeSection, setActiveSection] = useState<ConnectionSection>(
    getInitialSection(route.params?.initialSection)
  );
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  useEffect(() => {
    setActiveSection(getInitialSection(route.params?.initialSection));
  }, [route.params?.discoverEntryKey, route.params?.initialSection]);

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
          <>
            <View style={localStyles.sharedExperiencesCard}>
              <View style={localStyles.sharedExperiencesHeading}>
                <View style={localStyles.sharedExperiencesIcon}>
                  <Icon name="people-outline" size={20} color="#765B91" />
                </View>
                <View style={localStyles.sharedExperiencesCopy}>
                  <Text style={localStyles.sharedExperiencesTitle}>
                    {t("discover.sharedExperiencesTitle")}
                  </Text>
                  <Text style={localStyles.sharedExperiencesSubtitle}>
                    {t("discover.sharedExperiencesSubtitle")}
                  </Text>
                </View>
              </View>

              <View style={localStyles.sharedExperiencesActions}>
                <TouchableOpacity
                  style={[
                    localStyles.experienceButton,
                    localStyles.challengeButton,
                  ]}
                  activeOpacity={0.84}
                  onPress={() =>
                    navigation.navigate("Flow", { section: "challenge" })
                  }
                >
                  <Icon name="trophy-outline" size={18} color="#7C5B28" />
                  <Text style={localStyles.experienceButtonText}>
                    {t("events.challenges")}
                  </Text>
                  <Icon name="arrow-forward" size={16} color="#7C5B28" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    localStyles.experienceButton,
                    localStyles.eventButton,
                  ]}
                  activeOpacity={0.84}
                  onPress={() =>
                    navigation.navigate("EventsTab", { section: "event" })
                  }
                >
                  <Icon name="calendar-outline" size={18} color="#536C87" />
                  <Text style={localStyles.experienceButtonText}>
                    {t("events.events")}
                  </Text>
                  <Icon name="arrow-forward" size={16} color="#536C87" />
                </TouchableOpacity>
              </View>
            </View>

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
                {activeFilterCount > 0 ? (
                  <View style={localStyles.filtersCountBadge}>
                    <Text style={localStyles.filtersCountText}>
                      {activeFilterCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
          </>
        ) : null}
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
            showHeader={false}
            contentTopPadding={10}
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
            ref={discoverRef}
            showHeader={false}
            onFilterCountChange={setActiveFilterCount}
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
  filtersCountBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  filtersCountText: {
    color: "#2B2B2B",
    fontSize: 12,
    fontFamily: vibesTheme.fonts.bold,
  },
  filtersRow: {
    marginTop: 12,
    alignItems: "flex-start",
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
