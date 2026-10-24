import { PixelRatio } from "react-native";

export const TAB_BAR_TOP_SPACE = 12;
// The row already leaves space below its labels; avoid counting it twice.
export const getTabBarBottomPadding = (insetBottom: number) =>
  Math.max(0, insetBottom - 12);
/** Raised selected-tab bubble in CustomTabBar (size and top offset in the bar root). */
export const TAB_FLOATING_BUTTON_SIZE = 48;
export const TAB_FLOATING_TOP = 6;

export const getBottomTabBarHeight = (fontScale = PixelRatio.getFontScale()) =>
  Math.max(64, 36 + 28 * fontScale);

export const getBottomTabContentPadding = (
  insetBottom: number,
  minimumPadding: number
) => {
  const barAndGap =
    getBottomTabBarHeight() + getTabBarBottomPadding(insetBottom) + TAB_BAR_TOP_SPACE + 20;
  return Math.max(barAndGap, minimumPadding);
};

/**
 * Geometry of components/CustomTabBar.tsx (keep both in sync): the floating
 * bar is centered, at most 620 wide, with 18 of side margin, 12 of top space
 * for the raised selected icon and a surface extending to the bottom edge.
 * The safe area is inside the bar, below its interactive content.
 */
export const getTabBarFrame = (
  windowWidth: number,
  insetBottom: number,
  fontScale = PixelRatio.getFontScale()
) => {
  const barWidth = Math.min(windowWidth - 36, 620);
  const barLeft = (windowWidth - barWidth) / 2;
  const bottomPadding = getTabBarBottomPadding(insetBottom);
  return {
    barWidth,
    barLeft,
    bottomPadding,
    totalHeight: TAB_BAR_TOP_SPACE + getBottomTabBarHeight(fontScale) + bottomPadding,
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
