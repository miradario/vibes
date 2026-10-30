import { PixelRatio } from "react-native";
import { componentSize, spacing, textStyles } from "../theme/tokens";

export const TAB_BAR_TOP_SPACE = 12;
// Keep labels clear of the gesture area, including devices without a bottom inset.
export const getTabBarBottomPadding = (insetBottom: number) =>
  Math.max(12, insetBottom);
/** TabBarItem (DS §5.22): pill 48×28 behind the 20 icon, label always visible below. */
export const TAB_INDICATOR = componentSize.tabIndicator;
export const TAB_ITEM_GAP = spacing[1];
export const TAB_LABEL_LINE_HEIGHT = textStyles.caption.lineHeight;

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

/** Vertical center of the active pill measured from the top of the tab bar root (FTUX spotlight). */
export const getTabIndicatorCenterY = (fontScale = PixelRatio.getFontScale()) => {
  const content = TAB_INDICATOR.height + TAB_ITEM_GAP + TAB_LABEL_LINE_HEIGHT * fontScale;
  return TAB_BAR_TOP_SPACE + (getBottomTabBarHeight(fontScale) - content) / 2 + TAB_INDICATOR.height / 2;
};

/**
 * Geometry of components/CustomTabBar.tsx (keep both in sync): the floating
 * bar spans the full window width, with 12 of top space
 * above the bar and a surface extending to the bottom edge.
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

/** Horizontal center of a visible tab slot, same formula as the tab bar slots. */
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
