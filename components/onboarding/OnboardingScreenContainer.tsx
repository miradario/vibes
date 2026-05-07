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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={onboardingStyles.keyboard}
      >
        <ScrollView
          contentContainerStyle={[onboardingStyles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={onboardingStyles.card}>
            <View style={onboardingStyles.body}>{children}</View>
            {footer ? <View style={onboardingStyles.footer}>{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </View>
);

export default OnboardingScreenContainer;
