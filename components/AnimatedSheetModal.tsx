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
  inline?: boolean;
  onClose: () => void;
  onClosed?: () => void;
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
  inline = false,
  onClose,
  onClosed,
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
  const mountedRef = useRef(visible);
  const onClosedRef = useRef(onClosed);
  useEffect(() => { onClosedRef.current = onClosed; }, [onClosed]);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(offsetY)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      mountedRef.current = true;
      setIsMounted(true);
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(offsetY);
      sheetOpacity.setValue(0);

      const animation = Animated.parallel([
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
      ]);
      animation.start();
      return () => animation.stop();
    }

    if (!mountedRef.current) return;

    const animation = Animated.parallel([
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
    ]);
    animation.start(({ finished }) => {
      if (finished) {
        mountedRef.current = false;
        setIsMounted(false);
        onClosedRef.current?.();
      }
    });
    return () => animation.stop();
  }, [
    backdropInDuration,
    backdropOpacity,
    backdropOutDuration,
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

  const content = (
    <View
      style={[
        styles.root,
        inline && { ...StyleSheet.absoluteFillObject, zIndex: 50 },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.backdrop,
          { backgroundColor: backdropColor, opacity: backdropOpacity },
        ]}
      />
      {closeOnBackdropPress ? (
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={onClose}
        />
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
  );
  return inline ? (
    content
  ) : (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      {content}
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
