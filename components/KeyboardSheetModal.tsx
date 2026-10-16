import React, { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedSheetModal from "./AnimatedSheetModal";

/** Measure the modal itself: Android can resize the activity without resizing its modal window. */
export default function KeyboardSheetModal({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const viewport = useRef<View>(null);
  const keyboardTop = useRef<number | null>(null);
  const [overlap, setOverlap] = useState(0);
  const updateOverlap = useCallback(() => {
    viewport.current?.measureInWindow((_x, y, _width, height) => {
      const next = keyboardTop.current === null ? 0 : Math.max(0, y + height - keyboardTop.current);
      setOverlap(previous => Math.abs(previous - next) > 1 ? next : previous);
    });
  }, []);
  useEffect(() => {
    if (!visible) {
      keyboardTop.current = null;
      setOverlap(0);
      return;
    }
    keyboardTop.current = Keyboard.metrics()?.screenY ?? null;
    requestAnimationFrame(updateOverlap);
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow",
      event => {
        keyboardTop.current = event.endCoordinates.screenY;
        requestAnimationFrame(updateOverlap);
      }
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        keyboardTop.current = null;
        setOverlap(0);
      }
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [visible, updateOverlap]);
  return (
    <AnimatedSheetModal
      visible={visible}
      fullScreen
      onClose={onClose}
      onClosed={() => Keyboard.dismiss()}
      sheetStyle={{ flex: 1 }}
    >
      <View ref={viewport} collapsable={false} onLayout={updateOverlap} pointerEvents="box-none" style={{ flex: 1 }}>
        <View pointerEvents="box-none" style={{ flex: 1, justifyContent: "flex-end", paddingHorizontal: 16,
          paddingTop: insets.top + 20, paddingBottom: Math.max(overlap, insets.bottom) + 16 }}>
          {children}
        </View>
      </View>
    </AnimatedSheetModal>
  );
}
