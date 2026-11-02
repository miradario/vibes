/* ds-lint-disable-file lienzo de exportación 1080×1350 con tipografía y medidas fijas (imagen para compartir), exento por decisión de Agus 29/10 */
import React, { forwardRef, useState } from "react";
import { View, StyleSheet, type ImageSourcePropType } from "react-native";
import { Image } from "expo-image";
import { Text } from "./Typography";
import VibesWordmark from "./VibesWordmark";
import { vibesTheme } from "../src/theme/vibesTheme";

const { colors, fonts } = vibesTheme;
const fallback = require("../assets/images/challenges/challengetree.png");

type Props = {
  title: string;
  source: ImageSourcePropType;
  label: string;
  headline: string;
  caption: string;
  onReady: () => void;
  onLoading: () => void;
  onError: () => void;
};

// Fixed export canvas: text scaling belongs to the surrounding accessible sheet.
// Native view-shot exports this 324 × 405 layout as a 1080 × 1350 PNG.
const ChallengeCompletionShareCard = forwardRef<View, Props>(function ChallengeCompletionShareCard(
  { title, source, label, headline, caption, onReady, onLoading, onError }, ref,
) {
  const [failed, setFailed] = useState(false);
  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={[styles.circle, styles.topLeft]} />
      <View style={[styles.circle, styles.topRight]} />
      <View style={[styles.circle, styles.bottomLeft]} />
      <View style={[styles.circle, styles.bottomRight]} />
      <View style={[styles.circle, styles.smallLeft]} />
      <View style={[styles.circle, styles.smallRight]} />
      <VibesWordmark fontSize={28} />
      <Text allowFontScaling={false} style={styles.label}>{label}</Text>
      <Text allowFontScaling={false} style={styles.headline}>{headline}</Text>
      <View style={styles.imageFrame}>
        <Image
          source={failed ? fallback : source}
          style={styles.image}
          contentFit="contain"
          transition={0}
          onLoadStart={onLoading}
          onDisplay={onReady}
          onError={() => { if (failed) onError(); else setFailed(true); }}
        />
      </View>
      <Text allowFontScaling={false} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.65} style={styles.title}>{title}</Text>
      <Text allowFontScaling={false} style={styles.caption}>{caption}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { width: 324, height: 405, backgroundColor: colors.background, overflow: "hidden", alignItems: "center", paddingTop: 12, paddingHorizontal: 18 },
  circle: { position: "absolute", borderRadius: 999 },
  topLeft: { width: 112, height: 112, top: -55, left: -48, backgroundColor: colors.accentMustard, opacity: 0.85 },
  topRight: { width: 135, height: 135, top: -64, right: -70, backgroundColor: colors.accentBlue, opacity: 0.75 },
  bottomLeft: { width: 140, height: 140, bottom: -72, left: -99, backgroundColor: colors.accentCoral, opacity: 0.85 },
  bottomRight: { width: 146, height: 146, bottom: -101, right: -60, backgroundColor: colors.accentMustard, opacity: 0.85 },
  smallLeft: { width: 49, height: 49, left: -6, top: 26, backgroundColor: colors.accentMustard, opacity: 0.22 },
  smallRight: { width: 66, height: 66, right: -30, top: 44, backgroundColor: colors.accentBlue, opacity: 0.18 },
  label: { marginTop: 10, fontFamily: fonts.semibold, fontSize: 8, lineHeight: 12, letterSpacing: 1.5, color: colors.primaryText, textAlign: "center" },
  headline: { marginTop: 2, fontFamily: fonts.extraBold, fontSize: 41, lineHeight: 49, color: colors.primaryText, textAlign: "center" },
  imageFrame: { width: 190, height: 190, borderRadius: 95, backgroundColor: `${colors.accentMustard}0D`, overflow: "hidden", marginVertical: 5 },
  image: { width: "100%", height: "100%" },
  title: { fontFamily: fonts.extraBold, fontSize: 18, lineHeight: 22, maxHeight: 66, color: colors.primaryText, textAlign: "center" },
  caption: { marginTop: 5, fontFamily: fonts.regular, fontSize: 11, lineHeight: 15, color: colors.secondaryText, textAlign: "center" },
});

export default ChallengeCompletionShareCard;
