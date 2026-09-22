import React, { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MessagesContent } from "./Messages";
import { getBottomTabContentPadding } from "../src/lib/tabBarLayout";
import { vibesTheme } from "../src/theme/vibesTheme";

export default function Connections() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  useWindowDimensions();
  // Preserve links from earlier app versions targeting the old selector.
  useEffect(() => {
    if (route.params?.initialSection === "discover") {
      navigation.setParams({ initialSection: "chat" });
      navigation.navigate("Discover");
    }
  }, [navigation, route.params?.initialSection]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: vibesTheme.colors.background }} edges={["top", "left", "right"]}>
      <MessagesContent
        homeEntryKey={route.params?.homeEntryKey}
        homeTarget={route.params?.homeTarget}
        initialMessagesTab={route.params?.initialMessagesTab}
        showHeader={false}
        contentTopPadding={8}
        contentBottomPadding={getBottomTabContentPadding(insets.bottom, 118)}
      />
    </SafeAreaView>
  );
}
