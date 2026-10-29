import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

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
    paddingHorizontal: ds.spacing[2],
    paddingVertical: ds.spacing[1],
    borderRadius: ds.radii.pill,
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  text: {
    ...ds.textStyles.caption,
    color: vibesTheme.colors.primaryText,
  },
});
