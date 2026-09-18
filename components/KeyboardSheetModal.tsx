import React, { useEffect, useState } from "react";
import { Keyboard, Platform, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedSheetModal from "./AnimatedSheetModal";

/** Keep the sheet above the IME even when Android's modal window does not resize. */
export default function KeyboardSheetModal({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow",
      (event) => setKeyboardTop(event.endCoordinates.screenY)
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardTop(null)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  useEffect(() => {
    if (visible) setKeyboardTop(Keyboard.metrics()?.screenY ?? null);
  }, [visible]);
  const overlap = keyboardTop === null ? 0 : Math.max(0, height - keyboardTop);
  return (
    <AnimatedSheetModal
      visible={visible}
      onClose={onClose}
      onClosed={() => Keyboard.dismiss()}
      sheetStyle={{
        height: height - insets.top - 20,
        paddingBottom: Math.max(overlap, insets.bottom),
      }}
    >
      <View style={{ flex: 1, justifyContent: "flex-end", padding: 16 }}>
        {children}
      </View>
    </AnimatedSheetModal>
  );
}
