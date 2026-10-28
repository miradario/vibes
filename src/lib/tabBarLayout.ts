import { PixelRatio } from "react-native";

export const TAB_BAR_TOP_SPACE = 12;
// Keep labels clear of the gesture area, including devices without a bottom inset.
export const getTabBarBottomPadding = (insetBottom: number) =>
  Math.max(12, insetBottom);
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
 * bar spans the full window width, with 12 of top space
 * for the raised selected icon and a surface extending to the bottom edge.
 * The safe area is inside the bar, below its interactive content.
 */
export const getTabBarFrame = (
  windowWidth: number,
  insetBottom: number,
  fontScale = PixelRatio.getFontScale()
) => {
  const barWidth = windowWidth;
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
  windowWidth: number,
  homeIndex?: number
) => {
  const { barWidth, barLeft } = getTabBarFrame(windowWidth, 0);
  let center = (index + 0.5) / Math.max(count, 1);
  if (homeIndex !== undefined) {
    center = getTabSlotWeight(index, count, homeIndex) / 2;
    for (let slot = 0; slot < index; slot++) center += getTabSlotWeight(slot, count, homeIndex);
  }
  return barLeft + 10 + center * (barWidth - 20);
};

/** Reserve a central slot for Home; share each remaining half among its tabs. */
export const getTabSlotWeight = (index: number, count: number, homeIndex: number) => {
  if (homeIndex < 1 || homeIndex >= count - 1) return 1 / Math.max(count, 1);
  const homeWidth = 1 / (count % 2 === 0 ? count + 1 : count);
  if (index === homeIndex) return homeWidth;
  return (1 - homeWidth) / 2 / (index < homeIndex ? homeIndex : count - homeIndex - 1);
};
