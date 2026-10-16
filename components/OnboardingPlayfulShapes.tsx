import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";
import { vibesTheme } from "../src/theme/vibesTheme";

type Kind = "practices" | "identity" | "interests";
export default function OnboardingPlayfulShapes({ kind, style }: { kind: Kind; style?: StyleProp<ViewStyle> }) {
  const { accentBlue: blue, accentCoral: coral, accentMustard: mustard, primaryText: ink, surface } = vibesTheme.colors;
  return <View style={style} accessible={false} pointerEvents="none">
    <Svg width="100%" height="100%" viewBox="0 0 120 120">
      <Ellipse cx={60} cy={107} rx={44} ry={6} fill={blue} opacity={0.1} />
      <Circle cx={97} cy={25} r={6} fill={coral} />
      <Path d="M16 31 L11 21 M101 78 L110 74" stroke={mustard} strokeWidth={5} strokeLinecap="round" />
      {kind === "practices" ? <>
        <Circle cx={59} cy={60} r={36} fill={blue} opacity={0.12} />
        <Path d="M38 79 C23 50 48 31 86 34 C87 68 67 89 38 79 Z" fill={coral} />
        <Path d="M31 94 Q48 69 73 48" fill="none" stroke={ink} strokeWidth={4} strokeLinecap="round" />
        <Path d="M47 74 L47 58 M58 63 L74 64" fill="none" stroke={ink} strokeWidth={2.5} strokeLinecap="round" />
        <Circle cx={26} cy={49} r={5} fill={mustard} />
      </> : kind === "identity" ? <>
        <Rect x={18} y={23} width={64} height={73} rx={16} fill={blue} opacity={0.14} rotation={-9} origin="50, 60" />
        <Circle cx={49} cy={48} r={13} fill={coral} />
        <Path d="M28 82 Q28 61 49 61 Q70 61 70 82 Z" fill={blue} />
        <Path d="M74 45 Q105 38 106 61 Q107 77 89 80 L77 91 L78 76 Q62 65 74 45 Z" fill={mustard} stroke={surface} strokeWidth={3} />
        <Circle cx={80} cy={60} r={2.5} fill={ink} /><Circle cx={89} cy={60} r={2.5} fill={ink} /><Circle cx={98} cy={60} r={2.5} fill={ink} />
      </> : <>
        <Circle cx={57} cy={63} r={34} fill={coral} opacity={0.16} />
        <Path d="M66 27 L66 77 M66 30 L92 24 L92 69" fill="none" stroke={blue} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <Ellipse cx={56} cy={80} rx={12} ry={9} fill={blue} rotation={-20} origin="56, 80" />
        <Ellipse cx={82} cy={72} rx={12} ry={9} fill={blue} rotation={-20} origin="82, 72" />
        <Path d="M28 40 L32 51 L44 54 L33 59 L29 70 L24 59 L13 55 L24 51 Z" fill={mustard} />
        <Path d="M90 93 L93 99 L100 101 L93 104 L90 111 L87 104 L80 101 L87 98 Z" fill={coral} />
      </>}
    </Svg>
  </View>;
}
