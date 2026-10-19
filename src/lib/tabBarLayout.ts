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

/**
 * Geometry of components/CustomTabBar.tsx (keep both in sync): the floating
 * bar is centered, at most 620 wide, with 18 of side margin, 32 of top space
 * for the raised selected icon and a bottom padding over the safe area.
 */
export const getTabBarFrame = (
  windowWidth: number,
  insetBottom: number,
  fontScale = PixelRatio.getFontScale()
) => {
  const barWidth = Math.min(windowWidth - 36, 620);
  const barLeft = (windowWidth - barWidth) / 2;
  const bottomPadding = Math.max(insetBottom + 8, 18);
  return {
    barWidth,
    barLeft,
    bottomPadding,
    totalHeight: 32 + getBottomTabBarHeight(fontScale) + bottomPadding,
  };
};

/** Horizontal center of a visible tab slot, same formula as the tab bar bubble. */
export const getTabSlotCenterX = (
  index: number,
  count: number,
  windowWidth: number
) => {
  const { barWidth, barLeft } = getTabBarFrame(windowWidth, 0);
  return barLeft + 10 + ((index + 0.5) / Math.max(count, 1)) * (barWidth - 20);
};
