import { Platform } from "react-native";

const IOS_BOTTOM_TAB_SCROLL_EXTRA = 48;

export const getBottomTabContentPadding = (insetBottom: number, minimumPadding: number) => {
  const basePadding = Math.max(insetBottom + 90, minimumPadding);
  return Platform.OS === "ios" ? basePadding + IOS_BOTTOM_TAB_SCROLL_EXTRA : basePadding;
};
