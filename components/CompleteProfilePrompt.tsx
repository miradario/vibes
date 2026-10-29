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
import { getProfileCompletion, nextProfileParams } from "../src/lib/profileCompletion";
import { useProfileQuery } from "../src/queries/profile.queries";
import { useUserPreferencesQuery } from "../src/queries/userPreferences.queries";
import { vibesTheme } from "../src/theme/vibesTheme";
import * as ds from "../src/theme/tokens";

const DISMISS_DAYS = 30;
const DISMISS_MS = DISMISS_DAYS * 24 * 60 * 60 * 1000;
const getDismissStorageKey = (userId: string) =>
  `complete_profile_prompt_dismissed_until:${userId}`;

export default function CompleteProfilePrompt({
  userId,
  compact = false,
}: {
  userId?: string;
  compact?: boolean;
}) {
  const navigation = useNavigation();
  const [dismissed, setDismissed] = useState(false);
  const [dismissPreferenceLoaded, setDismissPreferenceLoaded] = useState(false);
  const dismissStorageKey = useMemo(
    () => (userId ? getDismissStorageKey(userId) : null),
    [userId]
  );
  const { data: profile, isSuccess: profileReady } = useProfileQuery(userId);
  const { data: preferences, isSuccess: preferencesReady } =
    useUserPreferencesQuery(userId);
  const { data, isSuccess } = useQuery({
    queryKey: ["profileAnswers", userId],
    queryFn: () => readProfileAnswers(userId!),
    enabled: !!userId,
  });
  const { data: emailOwner, isSuccess: emailReady } =
    useEmailOwnershipQuery(userId);

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
    (!compact && dismissed) ||
    !isSuccess ||
    !profileReady ||
    !preferencesReady ||
    !emailReady ||
    (!compact && !hasMissingProfileAnswers(data))
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
      onPress={() => navigation.navigate(completion.nextScreen as never, nextProfileParams(completion) as never)}
      style={[styles.card, compact && styles.compactCard]}
      activeOpacity={0.84}
    >
      <View style={[styles.iconWrap, compact && styles.compactIcon]}>
        <Icon
          name="person-outline"
          size={ds.iconSize.lg}
          color={
            compact
              ? vibesTheme.colors.primaryText
              : vibesTheme.colors.accentBlue
          }
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>
          {compact
            ? `Tu perfil está al ${completion.percent}%`
            : "Completá tu perfil"}
        </Text>
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
          {!compact ? (
            <Text style={styles.percent}>{completion.percent}%</Text>
          ) : null}
        </View>
        {completion.missingSummary ? (
          <Text style={styles.missingSummary} numberOfLines={1}>
            {`Falta: ${completion.missingSummary}`}
          </Text>
        ) : null}
      </View>
      {compact ? (
        <View style={styles.completeAction}>
          <Text style={styles.completeText}>Completar</Text>
          <Icon
            name="arrow-forward"
            size={ds.iconSize.md}
            color={vibesTheme.colors.primaryText}
          />
        </View>
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Cerrar sugerencia"
          onPress={(event) => {
            event.stopPropagation();
            dismissForThirtyDays();
          }}
          style={styles.closeButton}
        >
          <Icon
            name="close"
            size={ds.iconSize.sm}
            color={vibesTheme.colors.secondaryText}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  compactCard: {
    borderRadius: ds.radii.pill,
    paddingRight: ds.spacing[4],
    gap: ds.spacing[3],
    borderColor: ds.colors.border.default,
  },
  compactIcon: {
    backgroundColor: vibesTheme.colors.accentBlue,
    width: 40,
    height: 40,
    borderRadius: ds.radii.pill,
  },
  completeAction: { flexDirection: "row", alignItems: "center", gap: ds.spacing[1] },
  completeText: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.label,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: ds.spacing[3],
    paddingLeft: ds.spacing[3],
    paddingRight: ds.spacing[8],
    paddingVertical: ds.spacing[3],
    backgroundColor: vibesTheme.colors.background,
    borderColor: ds.withAlpha(ds.colors.base.inkSoft, ds.opacity.scrim),
    borderWidth: 1,
    borderRadius: ds.radii.lg,
    marginBottom: ds.spacing[4],
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.medium),
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0 },
  missingSummary: {
    marginTop: ds.spacing[1],
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.bodySmall,
  },
  title: {
    color: vibesTheme.colors.primaryText,
    ...ds.textStyles.subtitleMedium,
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
    gap: ds.spacing[3],
    marginTop: ds.spacing[2],
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: ds.radii.pill,
    backgroundColor: ds.withAlpha(ds.colors.base.blue, ds.opacity.scrim),
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: ds.radii.xs,
    backgroundColor: vibesTheme.colors.accentBlue,
  },
  percent: {
    color: vibesTheme.colors.secondaryText,
    ...ds.textStyles.labelMedium,
  },
});
