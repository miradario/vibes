/** @format */

import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Text } from "./Typography";
import ScreenContainer from "./ScreenContainer";
import VibesLoader from "./VibesLoader";
import { vibesTheme } from "../src/theme/vibesTheme";

export type DeepLinkTarget = "challenge" | "event";

/** After this long we assume something is off and offer a way out. */
export const DEEP_LINK_SLOW_AFTER_MS = 8000;

const TARGET_COPY: Record<DeepLinkTarget, { loading: string; error: string }> = {
  challenge: { loading: "Te estamos llevando al desafío…", error: "No pudimos abrir el desafío" },
  event: { loading: "Te estamos llevando al evento…", error: "No pudimos abrir el evento" },
};

const GENERIC_COPY = { loading: "Te estamos llevando…", error: "No pudimos abrir este contenido" };

type DeepLinkLoadingStateProps = {
  /** What the push / link points to. Unknown targets get a generic copy. */
  target?: DeepLinkTarget;
  /** "loading" while resolving the content, "error" when the request failed. */
  state?: "loading" | "error";
  /** True when the request is paused waiting for connectivity. */
  offline?: boolean;
  onRetry?: () => void;
  /** Same exit the screen already uses (go back, or home on a cold start). */
  onExit: () => void;
};

/**
 * Interstitial shown while a push notification / deep link resolves its
 * destination (challenge or event detail). Same on iOS and Android.
 */
const DeepLinkLoadingState = ({ target, state = "loading", offline = false, onRetry, onExit }: DeepLinkLoadingStateProps) => {
  const navigation = useNavigation();
  const [slow, setSlow] = useState(false);
  const copy = target ? TARGET_COPY[target] : GENERIC_COPY;
  const isError = state === "error";

  useEffect(() => {
    if (isError) return;
    setSlow(false);
    const timeout = setTimeout(() => setSlow(true), DEEP_LINK_SLOW_AFTER_MS);
    return () => clearTimeout(timeout);
  }, [isError]);

  const showActions = isError || slow || offline;
  // A cold start from a notification has no previous screen: exiting goes home.
  const exitLabel = navigation.canGoBack() ? "Volver a donde estabas" : "Ir al inicio";

  let body = "Un momento, ya casi está.";
  if (isError) body = "Revisá tu conexión e intentá de nuevo.";
  else if (offline) body = "Parece que no tenés conexión. Lo abrimos apenas vuelva.";
  else if (slow) body = "Está tardando más de lo normal. Podés reintentar o seguir en otro momento.";

  return (
    <ScreenContainer style={styles.screen}>
      <View style={styles.content}>
        {isError ? null : <VibesLoader size={44} accessibilityLabel={copy.loading} />}
        <Text style={styles.title} accessibilityRole="header" accessibilityLiveRegion="polite">
          {isError ? copy.error : copy.loading}
        </Text>
        <Text style={styles.body} accessibilityLiveRegion="polite">
          {body}
        </Text>

        {showActions ? (
          <View style={styles.actions}>
            {onRetry ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Reintentar"
                style={styles.primaryButton}
                onPress={onRetry}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={exitLabel}
              style={styles.secondaryButton}
              onPress={onExit}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>{exitLabel}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: vibesTheme.colors.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: vibesTheme.spacing.md,
    paddingHorizontal: 28,
  },
  title: {
    marginTop: vibesTheme.spacing.xs,
    color: vibesTheme.colors.primaryText,
    fontFamily: vibesTheme.fonts.semibold,
    fontSize: 20,
    lineHeight: 26,
    textAlign: "center",
  },
  body: {
    maxWidth: 300,
    color: vibesTheme.colors.secondaryText,
    fontFamily: vibesTheme.fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
  },
  actions: {
    alignItems: "center",
    gap: vibesTheme.spacing.sm,
    marginTop: vibesTheme.spacing.sm,
  },
  primaryButton: {
    minWidth: 200,
    alignItems: "center",
    borderRadius: vibesTheme.radii.pill,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  primaryButtonText: {
    color: vibesTheme.colors.surface,
    fontFamily: vibesTheme.fonts.bold,
    fontSize: 16,
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: vibesTheme.colors.accentBlue,
    fontFamily: vibesTheme.fonts.semibold,
    fontSize: 15,
  },
});

export default DeepLinkLoadingState;
