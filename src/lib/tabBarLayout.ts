import { PixelRatio } from "react-native";
import { componentSize } from "../theme/tokens/sizes";

export const TAB_BAR_TOP_SPACE = 12;
// Keep labels clear of the gesture area, including devices without a bottom inset.
export const getTabBarBottomPadding = (insetBottom: number) =>
  Math.max(12, insetBottom);
/** Raised selected-tab bubble in CustomTabBar (size and top offset in the bar root). */
export const TAB_FLOATING_BUTTON_SIZE = componentSize.tabBubble;
export const TAB_FLOATING_TOP = componentSize.tabBubbleRise;

export const getBottomTabBarHeight = (fontScale = PixelRatio.getFontScale()) =>
  Math.max(64, 36 + 28 * fontScale);

/**
 * Espacio mínimo debajo del contenido scrolleable de las pestañas para que el último
 * ítem no quede tapado por la barra flotante (barra + safe area + aire), en equipos sin
 * inset inferior. Con inset, manda el cálculo real de la barra.
 */
export const TAB_BAR_CONTENT_CLEARANCE = 118;

export const getBottomTabContentPadding = (
  insetBottom: number,
  minimumPadding: number = TAB_BAR_CONTENT_CLEARANCE
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

/**
 * Slot widths for CustomTabBar. Equal slots unless Home sits with ≥2 tabs on
 * each side (true center reserve). With Clases first, Home is at index 1 →
 * equal weights so Clases is a normal tab and labels don't collide (Agus 6/11).
 * Flag off keeps Home first → also equal (same as before Clases).
 */
export const getTabSlotWeight = (index: number, count: number, homeIndex: number) => {
  const leftCount = homeIndex;
  const rightCount = count - homeIndex - 1;
  if (leftCount < 2 || rightCount < 2) return 1 / Math.max(count, 1);
  const homeWidth = 1 / (count % 2 === 0 ? count + 1 : count);
  if (index === homeIndex) return homeWidth;
  return (1 - homeWidth) / 2 / (index < homeIndex ? leftCount : rightCount);
};
