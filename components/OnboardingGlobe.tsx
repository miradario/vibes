import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path } from "react-native-svg";
import { vibesTheme } from "../src/theme/vibesTheme";

export default function OnboardingGlobe({ style }: { style?: StyleProp<ViewStyle> }) {
  const { accentBlue, accentMustard, accentCoral, surface } = vibesTheme.colors;
  const clipId = `globe-${React.useId().replace(/:/g, "")}`;
  return <View style={style} accessible={false} pointerEvents="none">
    <Svg width="100%" height="100%" viewBox="0 0 180 180">
      <Defs><ClipPath id={clipId}><Circle cx={84} cy={86} r={68} /></ClipPath></Defs>
      <Circle cx={84} cy={86} r={68} fill={accentBlue} opacity={0.2} />
      <G clipPath={`url(#${clipId})`} fill={accentBlue}>
        <Path d="M20 48 L31 35 45 31 50 38 61 29 76 27 87 35 80 44 65 45 62 54 52 58 50 70 43 75 36 68 28 70 22 60 Z" />
        <Path d="M44 79 L56 73 67 79 72 88 82 91 83 100 76 106 73 116 66 123 63 137 55 147 50 137 51 120 46 108 41 98 Z" />
        <Path d="M90 36 L101 30 111 36 111 45 100 50 92 45 Z M102 59 L111 50 124 52 132 44 145 52 155 65 146 75 134 75 127 83 116 79 111 70 102 69 Z" />
        <Path d="M105 81 L119 80 128 92 125 107 116 121 107 116 106 102 98 94 Z M132 123 L141 118 151 126 145 135 133 134 Z" />
        <Path d="M69 22 L75 20 81 25 76 31 69 29 Z M87 49 L92 47 97 52 94 58 88 57 Z" />
      </G>
      <Ellipse cx={89} cy={89} rx={84} ry={30} rotation={-37} origin="89, 89" fill="none" stroke={accentBlue} strokeWidth={1.5} opacity={0.55} />
      <Path d="M13 117 C21 163 127 140 165 73" fill="none" stroke={surface} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={28} cy={129} r={6} fill={accentMustard} stroke={surface} strokeWidth={2} />
      <Circle cx={48} cy={148} r={6} fill={accentBlue} stroke={surface} strokeWidth={2} />
      <Circle cx={163} cy={72} r={6} fill={accentCoral} stroke={surface} strokeWidth={2} />
      <Circle cx={129} cy={20} r={5} fill={accentMustard} stroke={surface} strokeWidth={2} />
    </Svg>
  </View>;
}
