import React from "react";
import {
  ScrollView,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import styles from "../assets/styles";

type ScreenContainerProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
  edges?: Edge[];
  scroll?: boolean;
  scrollViewProps?: Omit<ScrollViewProps, "contentContainerStyle" | "children">;
};

const DEFAULT_EDGES: Edge[] = ["top", "left", "right"];

const ScreenContainer = ({
  children,
  style,
  contentContainerStyle,
  edges = DEFAULT_EDGES,
  scroll = false,
  scrollViewProps,
}: ScreenContainerProps) => {
  return (
    <SafeAreaView style={[styles.bg, style]} edges={edges}>
      {scroll ? (
        <ScrollView
          {...scrollViewProps}
          contentContainerStyle={contentContainerStyle}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
  );
};

export default ScreenContainer;
