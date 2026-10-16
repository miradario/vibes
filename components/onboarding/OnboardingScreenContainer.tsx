import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { onboardingStyles } from "../../src/screens/Onboarding/vibesOnboardingStyles";

// Android uses native adjustResize or the measured overlap fallback below.
// Keeping an idle KeyboardAvoidingView there adds a second IME layout listener.
const KeyboardContainer = Platform.OS === "ios" ? KeyboardAvoidingView : View;

type OnboardingScreenContainerProps = {
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  scrollViewRef?: React.RefObject<ScrollView | null>;
  onViewportChange?: () => void;
  onScroll?: ScrollViewProps["onScroll"];
};

const OnboardingScreenContainer = ({
  children,
  footer,
  contentStyle,
  scrollViewRef,
  onViewportChange,
  onScroll,
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
      <KeyboardContainer
        style={[onboardingStyles.keyboard, keyboardOverlap > 0 && { paddingBottom: keyboardOverlap }]}
        // Android already resizes the activity via windowSoftInputMode=adjustResize.
        // Applying a second height adjustment can clip and blur the focused input.
        {...(Platform.OS === "ios" ? { behavior: "padding" as const, keyboardVerticalOffset: 0 } : {})}
      >
        <View style={[onboardingStyles.content, contentStyle]}>
          <View style={onboardingStyles.card}>
            <ScrollView
              ref={scrollViewRef}
              style={onboardingStyles.bodyScroll}
              contentContainerStyle={onboardingStyles.body}
              // KeyboardAvoidingView owns iOS insets; do not apply them twice.
              automaticallyAdjustKeyboardInsets={false}
              onLayout={onViewportChange}
              onContentSizeChange={onViewportChange}
              onScroll={onScroll}
              scrollEventThrottle={16}
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={false}
              showsVerticalScrollIndicator={false}
            >
              {children}
              {footer ? <View style={onboardingStyles.footer}>{footer}</View> : null}
            </ScrollView>
          </View>
        </View>
      </KeyboardContainer>
    </SafeAreaView>
  </View>
  );
};

export default OnboardingScreenContainer;
