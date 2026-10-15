import React from "react";
import {
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
}: OnboardingScreenContainerProps) => (
  <View style={onboardingStyles.screen}>
    <SafeAreaView style={onboardingStyles.safeArea}>
      <KeyboardAvoidingView
        style={onboardingStyles.keyboard}
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

export default OnboardingScreenContainer;
