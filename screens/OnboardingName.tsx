/** @format */

import React, { useRef, useState } from "react";
import {
  findNodeHandle,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  type TextInput as NativeTextInput,
} from "react-native";
import { Text, TextInput } from "../components/Typography";
import { useNavigation } from "@react-navigation/native";
import styles from "../assets/styles";
import AppHeader from "../components/AppHeader";
import OnboardingVideo from "../components/OnboardingVideo";
import OnboardingProgressBar from "../components/OnboardingProgressBar";
import { useOnboardingDraft } from "../src/queries/onboarding.queries";
import { useI18n } from "../src/i18n";

const OnboardingName = () => {
  const { t } = useI18n();
  const navigation = useNavigation();
  const { draft, updateDraft } = useOnboardingDraft();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const nameInputRef = useRef<NativeTextInput | null>(null);
  const [name, setName] = useState(draft.displayName ?? "");

  const scrollInputIntoView = () => {
    if (Platform.OS !== "ios" || !nameInputRef.current) return;
    const node = findNodeHandle(nameInputRef.current);
    const scrollResponder = scrollViewRef.current?.getScrollResponder?.();
    if (!node || !scrollResponder) return;

    setTimeout(() => {
      scrollResponder.scrollResponderScrollNativeHandleToKeyboard(
        node,
        130,
        true
      );
    }, 80);
  };

  const goToNextStep = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    updateDraft({ displayName: trimmedName });
    navigation.navigate("OnboardingAge" as never);
  };

  return (
    <View style={styles.bg}>
      <KeyboardAvoidingView
        style={localStyles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={localStyles.scrollContent}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.onboardContainer}>
            <AppHeader showBack onBack={() => navigation.goBack()} style={styles.onboardHeader} contentStyle={styles.onboardHeaderProgress}>
              <OnboardingProgressBar screenName="OnboardingName" />
            </AppHeader>

            <Text style={styles.onboardTitle} maxFontSizeMultiplier={1}>
              {t("onboarding.nameTitle")}
            </Text>
            <Text style={styles.onboardSubtitle}>{t("onboarding.nameSubtitle")}</Text>

            <View style={styles.loginField}>
              <TextInput
                ref={nameInputRef}
                style={styles.loginInput}
                placeholder={t("onboarding.namePlaceholder")}
                placeholderTextColor="#6E6E6E"
                autoCapitalize="words"
                returnKeyType="done"
                value={name}
                onChangeText={setName}
                maxLength={50}
                onFocus={scrollInputIntoView}
                onSubmitEditing={goToNextStep}
              />
            </View>

            <OnboardingVideo containerStyle={localStyles.videoWrap} />

            <View style={styles.onboardFooter}>
              <TouchableOpacity
                style={[
                  styles.onboardNext,
                  !name.trim() && styles.onboardNextDisabled,
                ]}
                disabled={!name.trim()}
                onPress={goToNextStep}
              >
                <Text style={styles.onboardNextText}>{t("common.next")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default OnboardingName;

const localStyles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  videoWrap: {
    width: "100%",
    flex: 1,
    minHeight: 320,
    marginTop: 18,
    marginBottom: 12,
  },
});
