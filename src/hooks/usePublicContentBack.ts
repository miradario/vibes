import { useCallback } from "react";
import { BackHandler } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { leavePublicContent } from "../lib/publicContentBack";

export function usePublicContentBack(hasSession: boolean) {
  const navigation = useNavigation();
  const goBack = useCallback(() => leavePublicContent(navigation, hasSession), [navigation, hasSession]);
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (navigation.canGoBack()) return false;
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [navigation, goBack]));
  return goBack;
}
