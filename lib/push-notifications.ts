import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiUrl } from "./api";
import { authHeader } from "./auth";

export const isExpoGo = Constants.executionEnvironment === "storeClient";

export async function getPermissionStatus(): Promise<"granted" | "denied" | "undetermined"> {
  if (isExpoGo) return "undetermined";
  try {
    const Notifications = await import("expo-notifications");
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch {
    return "undetermined";
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (isExpoGo || !Device.isDevice) return null;

  try {
    const Notifications = await import("expo-notifications");

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "PharmaTrack",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2563eb",
      });
    }

    const projectId =
      (Constants.easConfig?.projectId as string | undefined) ??
      (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);
    if (!projectId) throw new Error("EAS projectId nije pronađen u konfiguraciji.");

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    return token;
  } catch (e) {
    throw e instanceof Error ? e : new Error("Nije moguće registrovati push notifikacije.");
  }
}

export async function syncPushTokenWithBackend(token: string): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(apiUrl("/api/v1/notifications/push-token"), {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error("Nije moguće sačuvati push token.");
}
