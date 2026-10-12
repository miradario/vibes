import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { logoMorphPath, logoMorphRenderShapes } from "../src/illustrations/logoMorph";

// The same Josefin outlines as the intro, including the independently coral i dot.
const points = logoMorphRenderShapes.flatMap(shape => shape.contours.flatMap(contour => contour.from));
const left = Math.min(...points.map(point => point[0])) - 4;
const right = Math.max(...points.map(point => point[0])) + 4;
export default function VibesWordmark({ fontSize = 40, style }: { fontSize?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ width: fontSize * (right - left) / 300, height: fontSize }, style]} accessible accessibilityLabel="Vibes">
      <Svg width="100%" height="100%" viewBox={`${left} 435 ${right - left} 300`} preserveAspectRatio="xMidYMid meet">
        {logoMorphRenderShapes.map(shape => <Path key={shape.letter} d={logoMorphPath(shape, 0)} fill={shape.color} fillRule="nonzero" />)}
      </Svg>
    </View>
  );
}
