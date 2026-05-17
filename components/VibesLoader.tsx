/** @format */

import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import LottieView from "lottie-react-native";

type VibesLoaderProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
};

const VibesLoader = ({ size = 72, style }: VibesLoaderProps) => (
  <View style={[styles.wrap, { width: size, height: size }, style]}>
    <LottieView
      source={require("../assets/images/lotties/Loading.json")}
      autoPlay
      loop
      style={StyleSheet.absoluteFill}
    />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default VibesLoader;
