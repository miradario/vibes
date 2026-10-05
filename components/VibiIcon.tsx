import React from "react";
import Svg, { Path } from "react-native-svg";
import { vibesTheme } from "../src/theme/vibesTheme";

export default function VibiIcon({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={(size * 52) / 64} viewBox="0 0 64 52">
      <Path
        d="M8 25 C19 25 20 46 32 46 C44 46 45 25 56 25"
        fill="none"
        stroke={vibesTheme.colors.surface}
        strokeWidth={5.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M48 5 C49.4 5 49.4 9.5 51.3 11.4 C53.2 13.3 57.5 13.2 57.5 14.6 C57.5 16 53.2 15.9 51.3 17.8 C49.4 19.7 49.4 24.2 48 24.2 C46.6 24.2 46.6 19.7 44.7 17.8 C42.8 15.9 38.5 16 38.5 14.6 C38.5 13.2 42.8 13.3 44.7 11.4 C46.6 9.5 46.6 5 48 5 Z"
        fill={vibesTheme.colors.surface}
      />
    </Svg>
  );
}
