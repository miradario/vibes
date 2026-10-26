import React, { useEffect, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, View, type StyleProp, type ViewStyle } from "react-native";

/** Keep the measured root independent of the padding applied to its children. */
export default function KeyboardViewport({ children, style, iosAvoiding = true }: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  iosAvoiding?: boolean;
}) {
  const root = useRef<View>(null);
  const keyboardTop = useRef<number | null>(null);
  const revision = useRef(0);
  const [overlap, setOverlap] = useState(0);
  const updateOverlap = () => {
    if (Platform.OS !== "android") return;
    const measurement = ++revision.current;
    root.current?.measureInWindow((_x, y, _width, height) => {
      // A resize or hide can overtake this native measurement on first focus.
      if (measurement !== revision.current) return;
      const next = keyboardTop.current === null ? 0 : Math.max(0, y + height - keyboardTop.current);
      setOverlap(previous => Math.abs(previous - next) > 1 ? next : previous);
    });
  };
  useEffect(() => {
    if (Platform.OS !== "android") return;
    let active = true;
    const schedule = () => {
      ++revision.current;
      requestAnimationFrame(() => { if (active) updateOverlap(); });
    };
    keyboardTop.current = Keyboard.metrics()?.screenY ?? null;
    schedule();
    const shown = Keyboard.addListener("keyboardDidShow", event => {
      keyboardTop.current = event.endCoordinates.screenY;
      schedule();
    });
    const hidden = Keyboard.addListener("keyboardDidHide", () => {
      ++revision.current;
      keyboardTop.current = null;
      setOverlap(0);
    });
    return () => {
      active = false;
      ++revision.current;
      shown.remove();
      hidden.remove();
    };
  }, []);
  if (Platform.OS === "ios" && iosAvoiding) {
    return <KeyboardAvoidingView style={style} behavior="padding" keyboardVerticalOffset={0}>{children}</KeyboardAvoidingView>;
  }
  return (
    <View ref={root} collapsable={false} style={style} onLayout={updateOverlap}>
      <View style={{ flex: 1, paddingBottom: overlap }}>{children}</View>
    </View>
  );
}
