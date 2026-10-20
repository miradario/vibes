import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import { vibesTheme } from "../src/theme/vibesTheme";

/** The Vibes figure without decorative expression marks. */
export default function PlayfulVibesLogo({ style }: { style?: StyleProp<ViewStyle> }) {
  const { accentBlue, accentCoral, accentMustard, primaryText } = vibesTheme.colors;
  return (
    <View style={style} accessible={false} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 150 180">
        <Ellipse cx={77} cy={170} rx={57} ry={5} fill={accentBlue} opacity={0.12} />
        <Circle cx={85} cy={39} r={19} fill={accentCoral} />
        <Circle cx={76} cy={70} r={9} fill={accentMustard} />
        <Path d="M76 87 C71 95 56 106 56 115 C56 128 73 135 77 130 C87 122 97 114 92 105 Z" fill={accentBlue} />
        <Path d="M61 134 Q76 160 92 133" fill="none" stroke={primaryText} strokeWidth={5} strokeLinecap="round" />
        <Path d="M33 155 Q30 166 47 166 Q62 167 77 155 Q94 168 111 165 Q124 164 121 154" fill="none" stroke={primaryText} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
