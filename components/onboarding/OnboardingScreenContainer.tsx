import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { onboardingStyles } from "../../src/screens/Onboarding/vibesOnboardingStyles";

type OnboardingScreenContainerProps = {
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  scrollViewRef?: React.RefObject<ScrollView | null>;
};

const OnboardingScreenContainer = ({
  children,
  footer,
  contentStyle,
  scrollViewRef,
}: OnboardingScreenContainerProps) => {
  const root = useRef<View>(null);
  const keyboardTop = useRef<number | null>(null);
  const [keyboardOverlap, setKeyboardOverlap] = useState(0);
  const updateOverlap = () => {
    if (Platform.OS !== "android") return;
    root.current?.measureInWindow((_x, y, _width, height) => {
      const overlap = keyboardTop.current === null ? 0 : Math.max(0, y + height - keyboardTop.current);
      setKeyboardOverlap(previous => Math.abs(previous - overlap) > 1 ? overlap : previous);
    });
  };
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const shown = Keyboard.addListener("keyboardDidShow", event => {
      keyboardTop.current = event.endCoordinates.screenY;
      requestAnimationFrame(updateOverlap);
    });
    const hidden = Keyboard.addListener("keyboardDidHide", () => {
      keyboardTop.current = null;
      setKeyboardOverlap(0);
    });
    return () => { shown.remove(); hidden.remove(); };
  }, []);
  return (
  <View ref={root} style={onboardingStyles.screen} onLayout={updateOverlap}>
    <SafeAreaView style={onboardingStyles.safeArea}>
      <KeyboardAvoidingView
        style={[onboardingStyles.keyboard, keyboardOverlap > 0 && { paddingBottom: keyboardOverlap }]}
        // Android already resizes the activity via windowSoftInputMode=adjustResize.
        // Applying a second height adjustment can clip and blur the focused input.
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={[onboardingStyles.content, contentStyle]}>
          <View style={onboardingStyles.card}>
            <ScrollView
              ref={scrollViewRef}
              style={onboardingStyles.bodyScroll}
              contentContainerStyle={onboardingStyles.body}
              automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={false}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
            {footer ? <View style={onboardingStyles.footer}>{footer}</View> : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </View>
  );
};

export default OnboardingScreenContainer;
