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
};

const OnboardingScreenContainer = ({
  children,
  footer,
  contentStyle,
}: OnboardingScreenContainerProps) => (
  <View style={onboardingStyles.screen}>
    <SafeAreaView style={onboardingStyles.safeArea}>
      <KeyboardAvoidingView
        style={onboardingStyles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 18}
      >
        <View style={[onboardingStyles.content, contentStyle]}>
          <View style={onboardingStyles.card}>
            <ScrollView
              style={onboardingStyles.bodyScroll}
              contentContainerStyle={onboardingStyles.body}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
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
