import React from "react";
import KeyboardViewport from "../KeyboardViewport";
import {
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
  return (
  <KeyboardViewport style={onboardingStyles.screen} iosAvoiding={false}>
    <SafeAreaView style={onboardingStyles.safeArea}>
      <KeyboardContainer style={onboardingStyles.keyboard}
        {...(Platform.OS === "ios" ? { behavior: "padding" as const, keyboardVerticalOffset: 0 } : {})}>
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
            </ScrollView>
            {footer ? <View style={onboardingStyles.footer}>{footer}</View> : null}
          </View>
        </View>
      </KeyboardContainer>
    </SafeAreaView>
  </KeyboardViewport>
  );
};

export default OnboardingScreenContainer;
