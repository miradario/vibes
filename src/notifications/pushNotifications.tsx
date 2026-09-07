import { useEffect, useRef, type MutableRefObject } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "../auth/auth.queries";
import { supabase } from "../lib/supabase";
import { showToast } from "../utils/toast";
import { dmKeys, matchKeys, useMatchesQuery } from "../queries/matches.queries";
import { eventMessageKeys, myEventGroupsKeys } from "../queries/events.queries";
import { useUserPreferencesQuery } from "../queries/userPreferences.queries";

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
  return rawData && typeof rawData === "object"
    ? (rawData as Record<string, unknown>)
    : null;
};

const upsertPushToken = async (token: Notifications.DevicePushToken) => {
  const tokenValue =
    typeof token.data === "string" ? token.data : String(token.data);

  const { error } = await supabase.functions.invoke("register-push-token", {
    body: {
      token: tokenValue,
      platform: Platform.OS === "ios" ? "ios" : "android",
      provider: Platform.OS === "ios" ? "apns" : "fcm",
    },
  });

  if (error) {
    throw error;
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
      lightColor: "#FFC3A0",
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
  const { data: matches = [] } = useMatchesQuery();
  const preferencesQuery = useUserPreferencesQuery(userId);
  const notificationsEnabled = preferencesQuery.data?.notificationsEnabled;
  const lastHandledResponseIdRef = useRef<string | null>(null);

  useEffect(() => {
    const directUnreadCount = matches.filter((item) => item.hasUnread).length;

    if (!userId) {
      void Notifications.setBadgeCountAsync(0).catch((error) => {
        console.warn("[push] failed to clear badge without session", error);
      });
      return;
    }

    void Notifications.setBadgeCountAsync(directUnreadCount).catch((error) => {
      console.warn("[push] failed to sync app badge", error);
    });
  }, [matches, userId]);

  useEffect(() => {
    if (!userId) return;
    if (!preferencesQuery.isFetched) return;

    let isActive = true;

    if (notificationsEnabled === false) {
      void Notifications.setBadgeCountAsync(0).catch((error) => {
        if (!isActive) return;
        console.warn(
          "[push] failed to clear badge when notifications disabled",
          error
        );
      });

      void deactivateUserPushTokens(userId).catch((error) => {
        if (!isActive) return;
        console.warn("[push] failed to deactivate user push tokens", error);
      });

      return () => {
        isActive = false;
      };
    }

    void registerPushToken(userId).catch((error) => {
      if (!isActive) return;
      console.warn("[push] failed to register device push token", error);
    });

    const tokenSubscription = Notifications.addPushTokenListener((token) => {
      void upsertPushToken(token).catch((error) => {
        console.warn("[push] failed to refresh device push token", error);
      });
    });

    return () => {
      isActive = false;
      tokenSubscription.remove();
    };
  }, [notificationsEnabled, preferencesQuery.isFetched, userId]);

  useEffect(() => {
    const receivedSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const rawData = notification.request.content.data;
        const data =
          rawData && typeof rawData === "object"
            ? (rawData as Record<string, unknown>)
            : null;

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
        handleNotificationResponse(
          response,
          navigateFromNotification,
          lastHandledResponseIdRef
        );
      });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      handleNotificationResponse(
        response,
        navigateFromNotification,
        lastHandledResponseIdRef
      );
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [getCurrentRoute, navigateFromNotification, queryClient, userId]);

  return null;
};
