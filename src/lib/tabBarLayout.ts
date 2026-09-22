import { PixelRatio, Platform } from "react-native";

const IOS_BOTTOM_TAB_SCROLL_EXTRA = 48;

export const getBottomTabBarHeight = (fontScale = PixelRatio.getFontScale()) =>
  Math.max(82, 52 + 28 * fontScale);

export const getBottomTabContentPadding = (
  insetBottom: number,
  minimumPadding: number
) => {
  const barAndGap =
    getBottomTabBarHeight() + Math.max(insetBottom + 8, 18) + 52;
  const basePadding = Math.max(barAndGap, minimumPadding);
  return Platform.OS === "ios"
    ? basePadding + IOS_BOTTOM_TAB_SCROLL_EXTRA
    : basePadding;
};
