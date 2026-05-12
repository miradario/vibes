import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { vibesTheme } from "../src/theme/vibesTheme";

type AnimatedSheetModalProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
  offsetY?: number;
  backdropColor?: string;
  closeOnBackdropPress?: boolean;
  backdropInDuration?: number;
  backdropOutDuration?: number;
  sheetInDuration?: number;
  sheetOutDuration?: number;
  sheetInDelay?: number;
  sheetInOpacityDuration?: number;
  sheetOutOpacityDuration?: number;
};

const AnimatedSheetModal = ({
  visible,
  onClose,
  children,
  sheetStyle,
  offsetY = vibesTheme.motion.modal.offsetY,
  backdropColor = vibesTheme.motion.modal.backdropColor,
  closeOnBackdropPress = true,
  backdropInDuration = vibesTheme.motion.modal.backdropInDuration,
  backdropOutDuration = vibesTheme.motion.modal.backdropOutDuration,
  sheetInDuration = vibesTheme.motion.modal.sheetInDuration,
  sheetOutDuration = vibesTheme.motion.modal.sheetOutDuration,
  sheetInDelay = vibesTheme.motion.modal.sheetInDelay,
  sheetInOpacityDuration = vibesTheme.motion.modal.sheetInOpacityDuration,
  sheetOutOpacityDuration = vibesTheme.motion.modal.sheetOutOpacityDuration,
}: AnimatedSheetModalProps) => {
  const [isMounted, setIsMounted] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(offsetY)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(offsetY);
      sheetOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: backdropInDuration,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: sheetInDuration,
          delay: sheetInDelay,
          useNativeDriver: true,
        }),
        Animated.timing(sheetOpacity, {
          toValue: 1,
          duration: sheetInOpacityDuration,
          delay: sheetInDelay,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!isMounted) return;

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: backdropOutDuration,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: offsetY,
        duration: sheetOutDuration,
        useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 0,
        duration: sheetOutOpacityDuration,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [
    backdropInDuration,
    backdropOpacity,
    backdropOutDuration,
    isMounted,
    offsetY,
    sheetInDelay,
    sheetInDuration,
    sheetInOpacityDuration,
    sheetOpacity,
    sheetOutDuration,
    sheetOutOpacityDuration,
    sheetTranslateY,
    visible,
  ]);

  if (!isMounted) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View
          pointerEvents="none"
          style={[styles.backdrop, { backgroundColor: backdropColor, opacity: backdropOpacity }]}
        />
        {closeOnBackdropPress ? (
          <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        ) : null}
        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            {
              opacity: sheetOpacity,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    width: "100%",
  },
});

export default AnimatedSheetModal;
