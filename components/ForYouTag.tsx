import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";

// "Para ti" pill for the item picked by pickFeaturedItem (src/lib/homePersonalization).
export default function ForYouTag() {
  return (
    <View style={s.tag}>
      <Text style={s.text}>Para ti</Text>
    </View>
  );
}

const s = StyleSheet.create({
  tag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.semibold,
  },
});
