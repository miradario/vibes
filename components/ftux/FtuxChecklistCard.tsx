import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../Typography";
import { vibesTheme } from "../../src/theme/vibesTheme";
import { useI18n } from "../../src/i18n";
import {
  CHECKLIST_ITEMS,
  STEP_ROUTE,
  checklistProgress,
  isChecklistVisible,
  type FtuxTourStep,
} from "../../src/ftux/ftuxMachine";
import { dispatchFtux, useFtuxState } from "../../src/ftux/ftuxStore";
import { useFtuxProfileCompletion } from "./useFtuxProfileCompletion";

const colors = vibesTheme.colors;

/**
 * "Tus primeros pasos" on Home: lets people skip or pause the Vibi tour and
 * resume any step later. Items tick with the real action, not with the tip.
 */
export default function FtuxChecklistCard({
  userId,
  accountCreatedAt,
}: {
  userId?: string;
  accountCreatedAt?: string | null;
}) {
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const state = useFtuxState(userId, accountCreatedAt);
  const completion = useFtuxProfileCompletion(state && state.status !== "ineligible" ? userId : undefined);
  if (!userId || !state || !isChecklistVisible(state, completion.complete)) return null;
  const { done, count, total } = checklistProgress(state, completion.complete);
  const resume = (step: FtuxTourStep) => {
    dispatchFtux(userId, { type: "RESUME", step });
    navigation.navigate(STEP_ROUTE[step]);
  };
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          {t("ftux.checklist.title", { done: count, total }).toLocaleUpperCase()}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("ftux.checklist.hideLabel")}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => dispatchFtux(userId, { type: "HIDE_CHECKLIST" })}
        >
          <Text style={styles.hide}>{t("ftux.checklist.hide")}</Text>
        </TouchableOpacity>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: total, now: count }}
        style={styles.track}
      >
        <View style={[styles.fill, { width: `${(count / total) * 100}%` }]} />
      </View>
      {CHECKLIST_ITEMS.map(({ step }, index) => {
        const checked = done[index];
        return (
          <TouchableOpacity
            key={step}
            accessibilityRole="checkbox"
            accessibilityState={{ checked, disabled: checked }}
            accessibilityHint={checked ? undefined : t("ftux.checklist.resumeHint")}
            disabled={checked}
            activeOpacity={0.75}
            onPress={() => resume(step)}
            style={[styles.row, index > 0 && styles.rowDivider]}
          >
            <Ionicons
              name={checked ? "checkmark-circle" : "ellipse-outline"}
              size={24}
              color={checked ? colors.accentBlue : colors.secondaryText}
            />
            <Text style={[styles.rowText, checked && styles.rowTextDone]}>
              {t(`ftux.checklist.${step}`)}
            </Text>
            {checked ? null : (
              <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: vibesTheme.spacing.md,
    padding: vibesTheme.spacing.md,
    borderRadius: vibesTheme.radii.md,
    borderWidth: 1,
    borderColor: "rgba(57, 120, 184, 0.24)",
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    flex: 1,
    color: colors.accentBlue,
    fontFamily: vibesTheme.fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.4,
  },
  hide: {
    color: colors.secondaryText,
    fontFamily: vibesTheme.fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  track: {
    height: 8,
    borderRadius: 4,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: "rgba(57, 120, 184, 0.14)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.accentBlue,
  },
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  rowText: {
    flex: 1,
    color: colors.primaryText,
    fontFamily: vibesTheme.fonts.regular,
    fontSize: 16,
    lineHeight: 22,
  },
  rowTextDone: {
    color: colors.secondaryText,
    textDecorationLine: "line-through",
  },
});
