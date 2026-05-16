import React from "react";
import {
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
      <View style={onboardingStyles.keyboard}>
        <View style={[onboardingStyles.content, contentStyle]}>
          <View style={onboardingStyles.card}>
            <ScrollView
              style={onboardingStyles.bodyScroll}
              contentContainerStyle={onboardingStyles.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
            {footer ? <View style={onboardingStyles.footer}>{footer}</View> : null}
          </View>
        </View>
      </View>
    </SafeAreaView>
  </View>
);

export default OnboardingScreenContainer;
