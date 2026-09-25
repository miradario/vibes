import { useEmailOwnershipQuery } from "../src/queries/emailOwnership.queries";
import { isEmailOwnershipVerified } from "../src/auth/emailVerification";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "./Typography";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import Icon from "./Icon";
import {
  hasMissingProfileAnswers,
  readProfileAnswers,
} from "../src/lib/profileQuestions";
import { getProfileCompletion } from "../src/lib/profileCompletion";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { vibesTheme } from "../src/theme/vibesTheme";

const DISMISS_DAYS = 30;
const DISMISS_MS = DISMISS_DAYS * 24 * 60 * 60 * 1000;
const getDismissStorageKey = (userId: string) =>
  `complete_profile_prompt_dismissed_until:${userId}`;

export default function CompleteProfilePrompt({ userId }: { userId?: string }) {
  const navigation = useNavigation();
  const [dismissed, setDismissed] = useState(false);
  const [dismissPreferenceLoaded, setDismissPreferenceLoaded] = useState(false);
  const dismissStorageKey = useMemo(
    () => (userId ? getDismissStorageKey(userId) : null),
    [userId]
  );
  const { data: profile, isSuccess: profileReady } = useProfileQuery(userId);
  const { data: preferences, isSuccess: preferencesReady } = useUserPreferencesQuery(userId);
  const { data, isSuccess } = useQuery({
    queryKey: ["profileAnswers", userId],
    queryFn: () => readProfileAnswers(userId!),
    enabled: !!userId,
  });
  const { data: emailOwner, isSuccess: emailReady } = useEmailOwnershipQuery(userId);

  useEffect(() => {
    let cancelled = false;
    setDismissed(false);

    const loadDismissPreference = async () => {
      if (!dismissStorageKey) {
        if (!cancelled) setDismissPreferenceLoaded(true);
        return;
      }

      if (!cancelled) setDismissPreferenceLoaded(false);
      try {
        const raw = await AsyncStorage.getItem(dismissStorageKey);
        const dismissedUntil = raw ? Number(raw) : 0;
        const isDismissed = Number.isFinite(dismissedUntil)
          ? dismissedUntil > Date.now()
          : false;
        if (!cancelled) setDismissed(isDismissed);
        if (raw && !isDismissed) {
          void AsyncStorage.removeItem(dismissStorageKey);
        }
      } catch {
        if (!cancelled) setDismissed(false);
      } finally {
        if (!cancelled) setDismissPreferenceLoaded(true);
      }
    };

    void loadDismissPreference();

    return () => {
      cancelled = true;
    };
  }, [dismissStorageKey]);

  const dismissForThirtyDays = () => {
    setDismissed(true);
    if (!dismissStorageKey) return;
    const dismissedUntil = Date.now() + DISMISS_MS;
    void AsyncStorage.setItem(dismissStorageKey, String(dismissedUntil)).catch(
      () => {}
    );
  };

  if (
    !dismissPreferenceLoaded ||
    dismissed ||
    !isSuccess || !profileReady || !preferencesReady || !emailReady ||
    !hasMissingProfileAnswers(data)
  )
    return null;
  const completion = getProfileCompletion(
    profile,
    preferences,
    isEmailOwnershipVerified(emailOwner),
    data
  );
  if (completion.percent === 100) return null;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={() => navigation.navigate(completion.nextScreen as never)}
      style={styles.card}
      activeOpacity={0.84}
    >
      <View style={styles.iconWrap}>
        <Icon
          name="person-outline"
          size={25}
          color={vibesTheme.colors.accentMustard}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Completá tu perfil</Text>
        <View style={styles.progressRow}>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: completion.percent }}
            style={styles.track}
          >
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.max(0, Math.min(completion.percent, 100))}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.percent}>{completion.percent}%</Text>
        </View>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Cerrar sugerencia"
        onPress={(event) => {
          event.stopPropagation();
          dismissForThirtyDays();
        }}
        style={styles.closeButton}
      >
        <Icon name="close" size={17} color={vibesTheme.colors.secondaryText} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 12,
    paddingRight: 34,
    paddingVertical: 10,
    backgroundColor: vibesTheme.colors.background,
    borderColor: "rgba(110, 110, 110, 0.30)",
    borderWidth: 1,
    borderRadius: 18,
    marginBottom: 16,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(216, 140, 122, 0.21)",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0 },
  title: {
    color: vibesTheme.colors.primaryText,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: vibesTheme.fonts.medium,
  },
  closeButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 7,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(216, 140, 122, 0.34)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: vibesTheme.colors.accentMustard,
  },
  percent: {
    color: vibesTheme.colors.secondaryText,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: vibesTheme.fonts.medium,
  },
});
