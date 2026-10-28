import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Modal,
  StyleSheet,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { vibesTheme } from "../src/theme/vibesTheme";

type AnimatedSheetModalProps = {
  visible: boolean;
  placement?: "bottom" | "center";
  inline?: boolean;
  fullScreen?: boolean;
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
  /** Easing for the sheet translate/opacity (defaults to Animated's ease). */
  sheetEasing?: (value: number) => number;
  /**
   * Inline only: keep the children mounted (hidden, non-interactive) while
   * not visible, so showing it again starts animating immediately instead of
   * waiting for a fresh mount. Defaults to false (unmount when hidden).
   */
  keepMounted?: boolean;
  /** Optional spring for the sheet's slide in (replaces the timed slide). */
  sheetInSpring?: { damping: number; stiffness: number; mass?: number };
};

const AnimatedSheetModal = ({
  visible,
  placement = "bottom",
  inline = false,
  fullScreen = false,
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
  sheetEasing,
  keepMounted = false,
  sheetInSpring,
}: AnimatedSheetModalProps) => {
  const stayMounted = inline && keepMounted;
  // Read through a ref: an inline easing function changes identity every
  // render and would otherwise restart the entrance animation.
  const sheetEasingRef = useRef(sheetEasing);
  sheetEasingRef.current = sheetEasing;
  const springDamping = sheetInSpring?.damping;
  const springStiffness = sheetInSpring?.stiffness;
  const springMass = sheetInSpring?.mass ?? 1;
  const [isMounted, setIsMounted] = useState(visible);
  const mountedRef = useRef(visible);
  const onClosedRef = useRef(onClosed);
  const closedPending = useRef(false);
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
        springDamping !== undefined && springStiffness !== undefined
          ? Animated.spring(sheetTranslateY, {
              toValue: 0,
              damping: springDamping,
              stiffness: springStiffness,
              mass: springMass,
              delay: sheetInDelay,
              useNativeDriver: true,
            })
          : Animated.timing(sheetTranslateY, {
              toValue: 0,
              duration: sheetInDuration,
              delay: sheetInDelay,
              easing: sheetEasingRef.current,
              useNativeDriver: true,
            }),
        Animated.timing(sheetOpacity, {
          toValue: 1,
          duration: sheetInOpacityDuration,
          delay: sheetInDelay,
          easing: sheetEasingRef.current,
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
        easing: sheetEasingRef.current,
        useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 0,
        duration: sheetOutOpacityDuration,
        easing: sheetEasingRef.current,
        useNativeDriver: true,
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished) {
        mountedRef.current = false;
        setIsMounted(false);
        closedPending.current = true;
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
    springDamping,
    springStiffness,
    springMass,
    visible,
  ]);

  const notifyClosed = () => {
    if (!closedPending.current) return;
    closedPending.current = false;
    onClosedRef.current?.();
  };
  useEffect(() => {
    if (!isMounted && (inline || Platform.OS !== "ios")) notifyClosed();
  }, [isMounted, inline]);

  if (!isMounted && !stayMounted && (inline || Platform.OS !== "ios")) return null;
  const hiddenButMounted = stayMounted && !visible;

  const content = (
    <KeyboardAvoidingView
      pointerEvents={hiddenButMounted ? "none" : undefined}
      accessibilityElementsHidden={hiddenButMounted || undefined}
      importantForAccessibility={hiddenButMounted ? "no-hide-descendants" : undefined}
      enabled={placement === "center"}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[
        styles.root,
        placement === "center" && styles.centered,
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
    </KeyboardAvoidingView>
  );
  return inline ? (
    content
  ) : (
    <Modal
      transparent
      hardwareAccelerated={Platform.OS === "android"}
      visible={isMounted}
      onDismiss={notifyClosed}
      animationType="none"
      statusBarTranslucent={fullScreen}
      navigationBarTranslucent={fullScreen}
      onRequestClose={onClose}
    >
      {isMounted ? content : null}
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
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
