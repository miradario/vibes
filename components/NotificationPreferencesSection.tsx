import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./Typography";
import Icon from "./Icon";
import AnimatedSheetModal from "./AnimatedSheetModal";
import { useAuthSession } from "../src/auth/auth.queries";
import {
  useUserPreferencesQuery,
  userPreferencesKeys,
} from "../src/queries/userPreferences.queries";
import { supabase } from "../src/lib/supabase";
import { mapUserPreferencesRow } from "../src/api/mappers/userPreferences.mapper";
import { useI18n } from "../src/i18n";
import { vibesTheme } from "../src/theme/vibesTheme";
import {
  eventReminderTimings,
  getChallengeReminderTime,
  getDeviceTimeZone,
  reminderTimeToDate,
  reminderTimeFromDate,
  getReminderTiming,
  notificationCategories,
  reminderTimingLabel,
} from "../src/notifications/preferences";

const colors = vibesTheme.colors;

export default function NotificationPreferencesSection() {
  const { t } = useI18n();
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();
  const query = useUserPreferencesQuery(userId);
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const [timingVisible, setTimingVisible] = useState(false);
  const [challengeTimeVisible, setChallengeTimeVisible] = useState(false);
  const [draftTime, setDraftTime] = useState("20:00");
  const [pending, setPending] = useState<Record<string, unknown> | null>(null);
  const [saved, setSaved] = useState(false);
  const savingRef = useRef(false);
  const [permission, setPermission] =
    useState<Notifications.NotificationPermissionsStatus | null>(null);
  const [permissionFailed, setPermissionFailed] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const prefs = { ...query.data, ...pending };
  const enabled = prefs.notificationsEnabled !== false;
  const timing = getReminderTiming(prefs.eventReminderTiming);
  const challengeTime = getChallengeReminderTime(prefs.challengeReminderTime);
  const busy = pending !== null || !query.isSuccess || !userId;
  const count = notificationCategories.filter(
    ({ key }) => prefs[key] !== false
  ).length;
  const permissionGranted =
    permission?.granted ||
    permission?.ios?.status ===
      Notifications.IosAuthorizationStatus.PROVISIONAL ||
    permission?.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL;

  useEffect(() => {
    if (!enabled) {
      setExpanded(false);
      setTimingVisible(false);
      setChallengeTimeVisible(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    let active = true;
    const refresh = async () => {
      try {
        const result = await Notifications.getPermissionsAsync();
        if (active) {
          setPermission(result);
          setPermissionFailed(false);
        }
      } catch {
        if (active) setPermissionFailed(true);
      }
    };
    void refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const save = async (
    column: string,
    key: string,
    value: boolean | string,
    extra: Record<string, string> = {}
  ) => {
    if (savingRef.current || busy || !userId) return;
    savingRef.current = true;
    setSaved(false);
    setPending({ [key]: value });
    try {
      // Do not use the legacy store's missing-column fallback: push preferences
      // must reach the server, otherwise the UI would falsely report success.
      await queryClient.cancelQueries({
        queryKey: userPreferencesKeys.byUser(userId),
      });
      const { data, error } = await supabase
        .from("user_preferences")
        .upsert(
          { user_id: userId, [column]: value, ...extra },
          { onConflict: "user_id" }
        )
        .select("*")
        .single();
      if (error) throw error;
      queryClient.setQueryData(
        userPreferencesKeys.byUser(userId),
        mapUserPreferencesRow(data)
      );
      setSaved(true);
    } catch {
      Alert.alert(t("common.error"), t("configuration.saveError"));
    } finally {
      setPending(null);
      savingRef.current = false;
    }
  };

  const openChallengeTime = () => {
    setDraftTime(challengeTime);
    setChallengeTimeVisible(true);
  };
  const confirmChallengeTime = (time: string) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return;
    setChallengeTimeVisible(false);
    void save("challenge_reminder_time", "challengeReminderTime", time, {
      challenge_reminder_timezone: getDeviceTimeZone(),
    });
  };

  const permissionAction = async () => {
    if (requestingPermission) return;
    setRequestingPermission(true);
    try {
      if (permission?.canAskAgain) {
        const result = await Notifications.requestPermissionsAsync();
        setPermission(result);
        // Registration listens for returning to the app and preference refreshes.
        await query.refetch();
      } else {
        await Linking.openSettings();
      }
    } catch {
      Alert.alert(t("common.error"), t("configuration.permissionError"));
    } finally {
      setRequestingPermission(false);
    }
  };

  const toggle = (
    label: string,
    value: boolean,
    onChange: (value: boolean) => void
  ) => (
    <Switch
      accessibilityLabel={label}
      value={value}
      disabled={busy}
      onValueChange={onChange}
      trackColor={{ false: colors.secondaryText, true: colors.accentMustard }}
      thumbColor={colors.surface}
      ios_backgroundColor={colors.secondaryText}
    />
  );

  return (
    <View style={s.section}>
      <View style={s.heading}>
        <Icon
          name="notifications-outline"
          size={18}
          color={colors.secondaryText}
        />
        <Text style={s.sectionTitle}>{t("configuration.notifications")}</Text>
      </View>
      {!query.isSuccess ? (
        <View style={s.card}>
          {query.isError ? (
            <>
              <Text style={s.description}>{t("configuration.loadError")}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void query.refetch()}
                style={s.action}
              >
                <Text style={s.link}>{t("configuration.retry")}</Text>
              </Pressable>
            </>
          ) : (
            <View style={s.row}>
              <ActivityIndicator color={colors.primaryText} />
              <Text style={s.description}>{t("configuration.loading")}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={s.card}>
          <View style={s.row}>
            <Text style={[s.label, s.flex]}>{t("configuration.receive")}</Text>
            {toggle(
              t("configuration.receive"),
              enabled,
              (value) =>
                void save(
                  "notifications_enabled",
                  "notificationsEnabled",
                  value
                )
            )}
          </View>
          <View style={s.divider} />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded, disabled: !enabled }}
            disabled={!enabled}
            onPress={() => setExpanded((value) => !value)}
            style={s.row}
          >
            <View style={s.flex}>
              <Text style={s.label}>{t("configuration.personalize")}</Text>
              {!expanded ? (
                <Text style={s.description}>
                  {enabled
                    ? t("configuration.summary", { count })
                    : t("configuration.allOff")}
                </Text>
              ) : null}
            </View>
            <Icon
              name={expanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={colors.secondaryText}
            />
          </Pressable>
          {expanded && enabled ? (
            <View>
              {notificationCategories.map((category) => (
                <View key={category.key} style={s.category}>
                  <View style={s.row}>
                    <View style={s.flex}>
                      <Text style={s.label}>
                        {t(`configuration.${category.label}`)}
                      </Text>
                      {category.label === "challenges" ? (
                        <Text style={s.description}>
                          {t("configuration.challengeHint")}
                        </Text>
                      ) : null}
                    </View>
                    {toggle(
                      t(`configuration.${category.label}`),
                      prefs[category.key] !== false,
                      (value) => void save(category.column, category.key, value)
                    )}
                  </View>
                  {category.label === "challenges" &&
                  prefs.notificationChallenges !== false ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={busy}
                      onPress={openChallengeTime}
                      style={s.timing}
                    >
                      <View style={s.flex}>
                        <Text style={s.description}>
                          {t("configuration.dailyReminder")}
                        </Text>
                        <Text style={s.label}>
                          {t("configuration.dailyAt", { time: challengeTime })}
                        </Text>
                      </View>
                      <Icon
                        name="chevron-forward"
                        size={18}
                        color={colors.primaryText}
                      />
                    </Pressable>
                  ) : null}
                  {category.label === "events" &&
                  prefs.notificationEvents !== false ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={busy}
                      onPress={() => setTimingVisible(true)}
                      style={s.timing}
                    >
                      <View style={s.flex}>
                        <Text style={s.description}>
                          {t("configuration.remindMe")}
                        </Text>
                        <Text style={s.label}>
                          {t(`configuration.${reminderTimingLabel[timing]}`)}
                        </Text>
                      </View>
                      <Icon
                        name="chevron-forward"
                        size={18}
                        color={colors.primaryText}
                      />
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      )}
      <Text accessibilityLiveRegion="polite" style={s.status}>
        {pending
          ? t("configuration.saving")
          : saved
          ? t("configuration.autoSaved")
          : ""}
      </Text>
      {Platform.OS === "web" ? (
        <Text style={s.description}>{t("configuration.webHint")}</Text>
      ) : permission && !permissionGranted ? (
        <View style={s.permission}>
          <Text style={s.label}>
            {t(
              permission.canAskAgain
                ? "configuration.permissionUndecided"
                : "configuration.permissionBlocked"
            )}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={requestingPermission}
            onPress={() => void permissionAction()}
            style={s.action}
          >
            <Text style={s.link}>
              {t(
                permission.canAskAgain
                  ? "configuration.allow"
                  : "configuration.openSettings"
              )}
            </Text>
          </Pressable>
        </View>
      ) : permissionFailed ? (
        <Text style={s.description}>{t("configuration.permissionError")}</Text>
      ) : null}
      <AnimatedSheetModal
        visible={timingVisible}
        onClose={() => setTimingVisible(false)}
        sheetStyle={[s.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
      >
        <View style={s.row}>
          <Text accessibilityRole="header" style={[s.sheetTitle, s.flex]}>
            {t("configuration.remindMe")}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.cancel")}
            onPress={() => setTimingVisible(false)}
            style={s.close}
          >
            <Icon name="close" size={24} color={colors.primaryText} />
          </Pressable>
        </View>
        {eventReminderTimings.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ checked: timing === option }}
            disabled={busy}
            onPress={() => {
              setTimingVisible(false);
              if (option !== timing)
                void save(
                  "event_reminder_timing",
                  "eventReminderTiming",
                  option
                );
            }}
            style={[s.option, timing === option && s.selected]}
          >
            <Text style={[s.label, s.flex]}>
              {t(`configuration.${reminderTimingLabel[option]}`)}
            </Text>
            {timing === option ? (
              <Icon name="checkmark" size={22} color={colors.primaryText} />
            ) : null}
          </Pressable>
        ))}
      </AnimatedSheetModal>
      {Platform.OS === "android" && challengeTimeVisible ? (
        <DateTimePicker
          value={reminderTimeToDate(draftTime)}
          mode="time"
          is24Hour
          onChange={(event, date) => {
            if (event.type === "set" && date)
              confirmChallengeTime(reminderTimeFromDate(date));
            else setChallengeTimeVisible(false);
          }}
        />
      ) : null}
      <AnimatedSheetModal
        visible={challengeTimeVisible && Platform.OS !== "android"}
        onClose={() => setChallengeTimeVisible(false)}
        sheetStyle={[s.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
      >
        <View style={s.row}>
          <Text accessibilityRole="header" style={[s.sheetTitle, s.flex]}>
            {t("configuration.dailyReminder")}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.cancel")}
            onPress={() => setChallengeTimeVisible(false)}
            style={s.close}
          >
            <Icon name="close" size={24} color={colors.primaryText} />
          </Pressable>
        </View>
        {Platform.OS === "web" ? (
          <TextInput
            accessibilityLabel={t("configuration.reminderTime")}
            value={draftTime}
            onChangeText={setDraftTime}
            placeholder="20:00"
            maxLength={5}
            style={s.timeInput}
            placeholderTextColor={colors.secondaryText}
          />
        ) : challengeTimeVisible ? (
          <DateTimePicker
            accessibilityLabel={t("configuration.reminderTime")}
            value={reminderTimeToDate(draftTime)}
            mode="time"
            display="spinner"
            locale="es-AR"
            is24Hour
            textColor={colors.primaryText}
            accentColor={colors.accentMustard}
            themeVariant="light"
            onChange={(_event, date) => {
              if (date) setDraftTime(reminderTimeFromDate(date));
            }}
          />
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={busy || !/^([01]\d|2[0-3]):[0-5]\d$/.test(draftTime)}
          onPress={() => confirmChallengeTime(draftTime)}
          style={[
            s.confirmTime,
            (busy || !/^([01]\d|2[0-3]):[0-5]\d$/.test(draftTime)) &&
              s.disabled,
          ]}
        >
          <Text style={[s.label, { color: colors.surface }]}>{t("common.save")}</Text>
        </Pressable>
      </AnimatedSheetModal>
    </View>
  );
}

const s = StyleSheet.create({
  timeInput: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.secondaryText,
    borderRadius: 16,
    padding: 16,
    fontSize: 22,
    color: colors.primaryText,
  },
  confirmTime: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentMustard,
    borderRadius: 16,
  },
  disabled: { opacity: 0.5 },
  section: { marginTop: 18, gap: 12 },
  heading: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: {
    fontSize: 18,
    color: colors.primaryText,
    fontFamily: vibesTheme.fonts.thin,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    padding: 18,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
  flex: { flex: 1 },
  label: { fontSize: 16, lineHeight: 22, color: colors.primaryText },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.secondaryText,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.primaryText,
    opacity: 0.08,
    marginVertical: 14,
  },
  category: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: 12,
    marginTop: 12,
  },
  timing: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(57, 120, 184, 0.12)",
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
  },
  status: { fontSize: 12, color: colors.secondaryText, minHeight: 16 },
  permission: {
    backgroundColor: "rgba(244, 163, 64, 0.16)",
    padding: 16,
    borderRadius: 16,
  },
  action: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  link: {
    fontSize: 14,
    color: colors.primaryText,
    textDecorationLine: "underline",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
  },
  sheetTitle: { fontSize: 22, color: colors.primaryText },
  close: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.secondaryText,
  },
  selected: {
    backgroundColor: colors.accentBlue,
    borderColor: colors.primaryText,
  },
});
