import { useEffect, useRef, type MutableRefObject } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useAuthSession } from "../auth/auth.queries";
import { supabase } from "../lib/supabase";
import { useUserPreferencesQuery } from "../queries/userPreferences.queries";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type PushNotificationsBootstrapProps = {
  navigateToMessages: () => void;
};

const upsertPushToken = async (userId: string, token: Notifications.DevicePushToken) => {
  const tokenValue = typeof token.data === "string" ? token.data : String(token.data);

  const { error } = await supabase.from("push_tokens").upsert(
    {
      user_id: userId,
      token: tokenValue,
      platform: Platform.OS === "ios" ? "ios" : "android",
      provider: Platform.OS === "ios" ? "apns" : "fcm",
      is_active: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  );

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
  let status = permissions.status;

  if (status !== "granted") {
    const request = await Notifications.requestPermissionsAsync();
    status = request.status;
  }

  if (status !== "granted") {
    console.log("[push] notifications permission not granted");
    return;
  }

  if (!Device.isDevice) {
    console.log("[push] permissions granted, skipping token registration on simulator/emulator");
    return;
  }

  const deviceToken = await Notifications.getDevicePushTokenAsync();
  await upsertPushToken(userId, deviceToken);
};

const handleNotificationResponse = (
  response: Notifications.NotificationResponse | null,
  navigateToMessages: () => void,
  lastHandledIdRef: MutableRefObject<string | null>,
) => {
  if (!response) return;

  const responseId = response.notification.request.identifier;
  if (!responseId || lastHandledIdRef.current === responseId) return;

  lastHandledIdRef.current = responseId;
  navigateToMessages();
};

export const PushNotificationsBootstrap = ({
  navigateToMessages,
}: PushNotificationsBootstrapProps) => {
  const { data: session } = useAuthSession();
  const userId = session?.user?.id;
  const preferencesQuery = useUserPreferencesQuery(userId);
  const notificationsEnabled = preferencesQuery.data?.notificationsEnabled;
  const lastHandledResponseIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    if (!preferencesQuery.isFetched) return;

    let isActive = true;

    if (notificationsEnabled === false) {
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
      void upsertPushToken(userId, token).catch((error) => {
        console.warn("[push] failed to refresh device push token", error);
      });
    });

    return () => {
      isActive = false;
      tokenSubscription.remove();
    };
  }, [notificationsEnabled, preferencesQuery.isFetched, userId]);

  useEffect(() => {
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handleNotificationResponse(
          response,
          navigateToMessages,
          lastHandledResponseIdRef,
        );
      },
    );

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      handleNotificationResponse(response, navigateToMessages, lastHandledResponseIdRef);
    });

    return () => {
      responseSubscription.remove();
    };
  }, [navigateToMessages]);

  return null;
};
