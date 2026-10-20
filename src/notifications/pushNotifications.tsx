import { vibesTheme } from "../theme/vibesTheme";
import { useCommunityUnreadQuery } from "../queries/communityReceipts.queries";
import { useEffect, useRef, type MutableRefObject } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "../auth/auth.queries";
import { supabase } from "../lib/supabase";
import { showToast } from "../utils/toast";
import { dmKeys, matchKeys, useMatchesQuery } from "../queries/matches.queries";
import { eventMessageKeys, myEventGroupsKeys } from "../queries/events.queries";
import { useUserPreferencesQuery, userPreferencesKeys } from "../queries/userPreferences.queries";
import { getDeviceTimeZone } from "./preferences";

const isChatNotificationData = (
  data: Record<string, unknown> | null
): data is Record<string, unknown> =>
  data?.type === "direct_message" || data?.type === "event_message";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const rawData = notification.request.content.data;
    const data =
      rawData && typeof rawData === "object"
        ? (rawData as Record<string, unknown>)
        : null;
    const isChatNotification = isChatNotificationData(data);

    return {
      shouldShowBanner: !isChatNotification,
      shouldShowList: !isChatNotification,
      shouldPlaySound: !isChatNotification,
      shouldSetBadge: true,
    };
  },
});

type PushNotificationsBootstrapProps = {
  navigateFromNotification: (data: Record<string, unknown>) => void;
  getCurrentRoute: () => {
    name?: string;
    params?: Record<string, unknown>;
  } | null;
};

const getNotificationData = (
  response: Notifications.NotificationResponse | null
) => {
  if (!response) return null;

  const rawData = response.notification.request.content.data;
  if (
    rawData &&
    typeof rawData === "object" &&
    Object.keys(rawData).length > 0
  ) {
    return rawData as Record<string, unknown>;
  }

  // iOS: con APNs directo, expo solo expone userInfo.body como content.data.
  // Si viene vacío, usamos el payload crudo del trigger.
  const trigger = response.notification.request.trigger as {
    payload?: unknown;
  } | null;
  const payload = trigger?.payload;
  if (!payload || typeof payload !== "object") return null;
  const { aps: _aps, body, ...rest } = payload as Record<string, unknown>;
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return Object.keys(rest).length > 0 ? rest : null;
};

const upsertPushToken = async (token: Notifications.DevicePushToken) => {
  const tokenValue =
    typeof token.data === "string" ? token.data : String(token.data);

  const { error } = await supabase.functions.invoke("register-push-token", {
    body: {
      token: tokenValue,
      platform: Platform.OS === "ios" ? "ios" : "android",
      provider: Platform.OS === "ios" ? "apns" : "fcm",
      apnsEnvironment:
        Platform.OS === "ios" ? (__DEV__ ? "sandbox" : "production") : null,
    },
  });

  if (error) {
    throw error;
  }

  // Reinstalls and dev/TestFlight/App Store builds each register a new token,
  // and the old ones stay active, so one event reached the same phone several
  // times (e.g. the "quiere conectar con vos" push). Keep only this device's
  // current token per platform. Best effort: a failure must not block push.
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return;
  const { error: cleanupError } = await supabase
    .from("push_tokens")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("platform", Platform.OS === "ios" ? "ios" : "android")
    .eq("is_active", true)
    .neq("token", tokenValue);
  if (cleanupError) {
    console.warn("[push] failed to deactivate stale push tokens", cleanupError);
  }
};

export const deactivateUserPushTokens = async (userId: string) => {
  const { error } = await supabase
    .from("push_tokens")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    throw error;
  }
};

const registerPushToken = async (userId: string) => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: vibesTheme.colors.accentMustard,
    });
  }

  const permissions = await Notifications.getPermissionsAsync();
  let status =
    Platform.OS === "ios"
      ? permissions.ios?.status ===
          Notifications.IosAuthorizationStatus.AUTHORIZED ||
        permissions.ios?.status ===
          Notifications.IosAuthorizationStatus.PROVISIONAL ||
        permissions.ios?.status ===
          Notifications.IosAuthorizationStatus.EPHEMERAL
        ? "granted"
        : permissions.status
      : permissions.status;
  const needsBadgePermission =
    Platform.OS === "ios" && permissions.ios?.allowsBadge !== true;

  if (status !== "granted" || needsBadgePermission) {
    const request = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    status =
      Platform.OS === "ios"
        ? request.ios?.status ===
            Notifications.IosAuthorizationStatus.AUTHORIZED ||
          request.ios?.status ===
            Notifications.IosAuthorizationStatus.PROVISIONAL ||
          request.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
          ? "granted"
          : request.status
        : request.status;
  }

  if (status !== "granted") {
    console.log("[push] notifications permission not granted");
    return;
  }

  if (!Device.isDevice) {
    console.log(
      "[push] permissions granted, skipping token registration on simulator/emulator"
    );
    return;
  }

  const deviceToken = await Notifications.getDevicePushTokenAsync();
  await upsertPushToken(deviceToken);
};

// Once a pair matches, the earlier "quiere conectar con vos" push from that
// person is stale; remove it from the notification tray. Only dismisses
// already-delivered entries, never changes how notifications are shown.
const dismissSupersededConnectionRequests = async (otherUserId: string) => {
  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      presented
        .filter((item) => {
          const data = item.request.content.data as Record<string, unknown> | null;
          return data?.type === "connection_request" && data?.senderId === otherUserId;
        })
        .map((item) => Notifications.dismissNotificationAsync(item.request.identifier))
    );
  } catch (error) {
    console.warn("[push] failed to dismiss superseded connection requests", error);
  }
};

const refreshCommunityFromPush = (
  queryClient: ReturnType<typeof useQueryClient>,
  data: Record<string, unknown> | null
) => {
  // Data-only refresh for group-chat pushes; never changes how a
  // notification is displayed (Android/iOS presentation untouched).
  if (!data || typeof data.groupId !== "string") return;
  void queryClient.invalidateQueries({ queryKey: ["communityMessages"] });
  void queryClient.invalidateQueries({ queryKey: ["communityGroups"] });
  void queryClient.invalidateQueries({ queryKey: ["communityUnread"] });
};

const handleNotificationResponse = (
  response: Notifications.NotificationResponse | null,
  navigateFromNotification: (data: Record<string, unknown>) => void,
  lastHandledIdRef: MutableRefObject<string | null>
) => {
  if (!response) return;

  const responseId = response.notification.request.identifier;
  if (!responseId || lastHandledIdRef.current === responseId) return;

  lastHandledIdRef.current = responseId;
  navigateFromNotification(getNotificationData(response) ?? {});
};

// Launch response, read once per app process: a tap that opened the app
// from closed is logged as cold_start even if the listener also reports it.
let launchResponseIdPromise: Promise<string | null> | null = null;
const getLaunchResponseId = () => {
  launchResponseIdPromise ??= Notifications.getLastNotificationResponseAsync()
    .then((response) => response?.notification.request.identifier ?? null)
    .catch(() => null);
  return launchResponseIdPromise;
};
const loggedOpenIds = new Set<string>();

const pickString = (data: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value) return value;
    if (typeof value === "number") return String(value);
  }
  return null;
};

type PendingOpen = { row: Record<string, string | null>; queuedAt: number };
const PENDING_OPENS_KEY = "vibes.pendingNotificationOpens";
// A tap waits this long for a session (restored or new login) before it is dropped.
const PENDING_OPEN_MAX_AGE_MS = 60 * 60 * 1000;
let pendingOpens: PendingOpen[] = [];
let pendingOpensLoaded: Promise<void> | null = null;
let flushingOpens = false;
let flushAgain = false;

const savePendingOpens = () =>
  AsyncStorage.setItem(PENDING_OPENS_KEY, JSON.stringify(pendingOpens)).catch(() => undefined);

const loadPendingOpens = () => {
  pendingOpensLoaded ??= AsyncStorage.getItem(PENDING_OPENS_KEY)
    .then((stored) => {
      const parsed = stored ? (JSON.parse(stored) as PendingOpen[]) : [];
      const known = new Set(pendingOpens.map((item) => item.row.notification_identifier));
      pendingOpens = [
        ...(Array.isArray(parsed) ? parsed : []).filter(
          (item) => item?.row?.notification_identifier && !known.has(item.row.notification_identifier)
        ),
        ...pendingOpens,
      ];
      pendingOpens.forEach((item) => loggedOpenIds.add(String(item.row.notification_identifier)));
    })
    .catch(() => undefined);
  return pendingOpensLoaded;
};

const clearPendingOpens = async () => {
  await loadPendingOpens();
  pendingOpens = [];
  await savePendingOpens();
};

// Sends queued taps once there is a session; keeps them (up to the max age)
// while there is none or the insert fails. Duplicates (23505) count as sent.
const flushPendingOpens = async () => {
  if (flushingOpens) {
    flushAgain = true;
    return;
  }
  flushingOpens = true;
  try {
    await loadPendingOpens();
    const now = Date.now();
    pendingOpens = pendingOpens.filter((item) => now - item.queuedAt < PENDING_OPEN_MAX_AGE_MS);
    if (!pendingOpens.length) return;
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    const sent = new Set<PendingOpen>();
    for (const item of [...pendingOpens]) {
      const { error } = await supabase
        .from("notification_opens")
        .insert({ ...item.row, user_id: userId });
      if (error && error.code !== "23505") {
        console.warn("[push] failed to log notification open", error.message);
      } else {
        sent.add(item);
      }
    }
    pendingOpens = pendingOpens.filter((item) => !sent.has(item));
  } catch (error) {
    console.warn("[push] failed to log notification open", error);
  } finally {
    await savePendingOpens();
    flushingOpens = false;
    if (flushAgain) {
      flushAgain = false;
      void flushPendingOpens();
    }
  }
};

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") void clearPendingOpens();
  else if (session?.user) void flushPendingOpens();
});

// Fire-and-forget tap log for push metrics; never blocks or breaks navigation.
// The tap is queued first, so one that happens before the session is restored
// is sent once a user is signed in. The table's unique
// (user_id, notification_identifier) drops repeats.
const logNotificationOpen = async (
  response: Notifications.NotificationResponse,
  appStateAtTap: "foreground" | "background"
) => {
  try {
    const identifier = response.notification.request.identifier;
    await loadPendingOpens();
    if (!identifier || loggedOpenIds.has(identifier)) return;
    loggedOpenIds.add(identifier);
    const launchId = await getLaunchResponseId();
    const data = getNotificationData(response) ?? {};
    const reengagementKind = pickString(data, ["reengagementKind"]);
    pendingOpens.push({
      queuedAt: Date.now(),
      row: {
        notification_identifier: identifier.slice(0, 300),
        notification_type: reengagementKind
          ? `reengagement_${reengagementKind}`
          : pickString(data, ["type"]) ?? "unknown",
        notification_ref: pickString(data, [
          "reengagementId", "reminderId", "messageId", "swipeId", "matchId", "user_id",
        ]),
        reengagement_id: pickString(data, ["reengagementId"]),
        app_state: launchId === identifier ? "cold_start" : appStateAtTap,
        platform: Platform.OS === "ios" ? "ios" : "android",
        app_version: Application.nativeApplicationVersion ?? null,
      },
    });
    await savePendingOpens();
    await flushPendingOpens();
  } catch (error) {
    console.warn("[push] failed to log notification open", error);
  }
};

const isCurrentChatRoute = (
  route: { name?: string; params?: Record<string, unknown> } | null,
  data: Record<string, unknown>
) => {
  if (!route) return false;

  if (data.type === "direct_message" && route.name === "Chat") {
    return route.params?.matchId === data.matchId;
  }

  if (data.type === "event_message" && route.name === "EventChat") {
    const event = route.params?.event as { id?: unknown } | undefined;
    return event?.id === data.eventId;
  }

  return false;
};

export const PushNotificationsBootstrap = ({
  navigateFromNotification,
  getCurrentRoute,
}: PushNotificationsBootstrapProps) => {
  const { data: session } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;
  const { data: unread = [] } = useCommunityUnreadQuery();
  const preferencesQuery = useUserPreferencesQuery(userId);
  const notificationsEnabled = preferencesQuery.data?.notificationsEnabled;
  const lastHandledResponseIdRef = useRef<string | null>(null);
  const appStateRef = useRef({ state: AppState.currentState as string, since: 0 });

  useEffect(() => {
    if (!userId || !preferencesQuery.isSuccess) return;
    let active = true;
    let saving = false;
    const syncTimeZone = async () => {
      const timeZone = getDeviceTimeZone();
      const cached = queryClient.getQueryData<Record<string, unknown>>(userPreferencesKeys.byUser(userId));
      if (saving || cached?.challengeReminderTimezone === timeZone) return;
      saving = true;
      try {
        const { error } = await supabase.from("user_preferences").upsert({
          user_id: userId, challenge_reminder_timezone: timeZone,
        }, { onConflict: "user_id" });
        if (error) throw error;
        if (active) queryClient.setQueryData(userPreferencesKeys.byUser(userId), (previous: Record<string, unknown> | undefined) => ({
          ...previous, challengeReminderTimezone: timeZone,
        }));
      } catch (error) {
        console.warn("[push] failed to sync reminder time zone", error);
      } finally { saving = false; }
    };
    void syncTimeZone();
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") void syncTimeZone();
    });
    return () => { active = false; subscription.remove(); };
  }, [userId, preferencesQuery.isSuccess, queryClient]);


  useEffect(() => {
    const directUnreadCount = unread.reduce(
      (total, row) => total + Number(row.unread_count),
      0
    );

    if (!userId || notificationsEnabled === false) {
      void Notifications.setBadgeCountAsync(0).catch((error) => {
        console.warn("[push] failed to clear badge without session", error);
      });
      return;
    }

    void Notifications.setBadgeCountAsync(directUnreadCount).catch((error) => {
      console.warn("[push] failed to sync app badge", error);
    });
  }, [unread, userId, notificationsEnabled]);

  useEffect(() => {
    if (!userId || Platform.OS === "web") return;
    if (!preferencesQuery.isSuccess) return;

    let isActive = true;

    if (notificationsEnabled === false) {
      void Notifications.setBadgeCountAsync(0).catch((error) => {
        if (!isActive) return;
        console.warn(
          "[push] failed to clear badge when notifications disabled",
          error
        );
      });

      return () => {
        isActive = false;
      };
    }

    void registerPushToken(userId).catch((error) => {
      if (!isActive) return;
      console.warn("[push] failed to register device push token", error);
    });

    const appStateSubscription = AppState.addEventListener("change", state => {
      if (state === "active") void registerPushToken(userId).catch(error => {
        console.warn("[push] failed to register after returning to app", error);
      });
    });
    const tokenSubscription = Notifications.addPushTokenListener((token) => {
      void upsertPushToken(token).catch((error) => {
        console.warn("[push] failed to refresh device push token", error);
      });
    });

    return () => {
      isActive = false;
      tokenSubscription.remove();
      appStateSubscription.remove();
    };
  }, [notificationsEnabled, preferencesQuery.isSuccess, preferencesQuery.dataUpdatedAt, userId]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    // A tap from background can arrive just after AppState turns "active",
    // so "foreground" needs the app to have been active for a moment.
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && appStateRef.current.state !== "active") {
        appStateRef.current = { state, since: Date.now() };
      } else if (state !== "active") {
        appStateRef.current = { state, since: Date.now() };
      }
    });

    const receivedSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const rawData = notification.request.content.data;
        const data =
          rawData && typeof rawData === "object"
            ? (rawData as Record<string, unknown>)
            : null;

        refreshCommunityFromPush(queryClient, data);
        if (data?.type === "new_match" && typeof data.otherUserId === "string") {
          void dismissSupersededConnectionRequests(data.otherUserId);
        }
        if (!isChatNotificationData(data)) return;

        if (
          data.type === "direct_message" &&
          typeof data.matchId === "string"
        ) {
          queryClient.invalidateQueries({
            queryKey: dmKeys.byMatch(data.matchId),
          });
          queryClient.invalidateQueries({ queryKey: matchKeys.all });
        }

        if (data.type === "event_message" && typeof data.eventId === "string") {
          queryClient.invalidateQueries({
            queryKey: eventMessageKeys.byEvent(data.eventId),
          });
          if (userId) {
            queryClient.invalidateQueries({
              queryKey: myEventGroupsKeys.all(userId),
            });
          } else {
            queryClient.invalidateQueries({ queryKey: ["myEventGroups"] });
          }
        }

        if (isCurrentChatRoute(getCurrentRoute(), data)) return;

        showToast("Nuevo mensaje", {
          type: "info",
          text1: "Nuevo mensaje",
          text2: "Recibiste una notificación de chat.",
          visibilityTime: 2600,
          onPress: () => navigateFromNotification(data),
        });
      }
    );

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const { state, since } = appStateRef.current;
        void logNotificationOpen(
          response,
          state === "active" && Date.now() - since > 1500 ? "foreground" : "background"
        );
        refreshCommunityFromPush(queryClient, getNotificationData(response));
        handleNotificationResponse(
          response,
          navigateFromNotification,
          lastHandledResponseIdRef
        );
      });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) void logNotificationOpen(response, "background");
      handleNotificationResponse(
        response,
        navigateFromNotification,
        lastHandledResponseIdRef
      );
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
      appStateSubscription.remove();
    };
  }, [getCurrentRoute, navigateFromNotification, queryClient, userId]);

  return null;
};
