import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import AnimatedSheetModal from "./AnimatedSheetModal";
import ScreenContainer from "./ScreenContainer";
import Icon from "./Icon";
import { Text } from "./Typography";
import { vibesTheme } from "../src/theme/vibesTheme";

function ZoomablePhoto({ source }: { source: ImageSourcePropType }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.max(1, Math.min(4, savedScale.value * event.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      const maxX = (size.width * (scale.value - 1)) / 2;
      const maxY = (size.height * (scale.value - 1)) / 2;
      x.value = withTiming(Math.max(-maxX, Math.min(maxX, x.value)));
      y.value = withTiming(Math.max(-maxY, Math.min(maxY, y.value)));
    });
  const pan = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      savedX.value = x.value;
      savedY.value = y.value;
    })
    .onUpdate((event) => {
      const maxX = (size.width * (scale.value - 1)) / 2;
      const maxY = (size.height * (scale.value - 1)) / 2;
      x.value = Math.max(
        -maxX,
        Math.min(maxX, savedX.value + event.translationX)
      );
      y.value = Math.max(
        -maxY,
        Math.min(maxY, savedY.value + event.translationY)
      );
    });
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const next = scale.value > 1 ? 1 : 2.5;
      scale.value = withTiming(next);
      savedScale.value = next;
      x.value = withTiming(0);
      y.value = withTiming(0);
    });
  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
    ],
  }));
  return (
    <View
      style={s.photo}
      onLayout={({ nativeEvent }) => setSize(nativeEvent.layout)}
    >
      <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
        <Animated.Image
          source={source}
          resizeMode="contain"
          style={[s.image, imageStyle]}
          accessibilityLabel="Foto ampliada. Pellizcá o tocá dos veces para hacer zoom."
        />
      </GestureDetector>
    </View>
  );
}

export default function PhotoViewer({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: {
  visible: boolean;
  images: ImageSourcePropType[];
  initialIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex]);
  const current = Math.max(0, Math.min(index, images.length - 1));
  return (
    <AnimatedSheetModal
      visible={visible}
      fullScreen
      onClose={onClose}
      sheetStyle={s.root}
    >
      <GestureHandlerRootView style={s.root}>
        <ScreenContainer edges={["top", "bottom", "left", "right"]}>
          <View style={s.toolbar}>
            <Text style={s.label}>
              {images.length ? `${current + 1} / ${images.length}` : "Foto"}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cerrar foto"
              onPress={onClose}
              style={s.button}
            >
              <Icon
                name="close"
                size={26}
                color={vibesTheme.colors.primaryText}
              />
            </TouchableOpacity>
          </View>
          {images[current] ? (
            <ZoomablePhoto
              key={`${current}:${visible}`}
              source={images[current]}
            />
          ) : null}
          <View style={s.toolbar}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Foto anterior"
              disabled={current === 0}
              onPress={() => setIndex(current - 1)}
              style={[s.button, current === 0 && s.disabled]}
            >
              <Icon
                name="chevron-back"
                size={26}
                color={vibesTheme.colors.primaryText}
              />
            </TouchableOpacity>
            <Text style={s.hint}>Pellizcá o tocá dos veces para ampliar</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Foto siguiente"
              disabled={current >= images.length - 1}
              onPress={() => setIndex(current + 1)}
              style={[s.button, current >= images.length - 1 && s.disabled]}
            >
              <Icon
                name="chevron-forward"
                size={26}
                color={vibesTheme.colors.primaryText}
              />
            </TouchableOpacity>
          </View>
        </ScreenContainer>
      </GestureHandlerRootView>
    </AnimatedSheetModal>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: vibesTheme.colors.background },
  photo: { flex: 1, overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  button: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.3 },
  label: { color: vibesTheme.colors.primaryText, fontSize: 16 },
  hint: {
    flex: 1,
    color: vibesTheme.colors.secondaryText,
    textAlign: "center",
    fontSize: 13,
  },
});
