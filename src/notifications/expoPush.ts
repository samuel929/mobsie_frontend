import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return null;

  const existing = await Notifications.getPermissionsAsync();
  const permissions = existing.status === "granted"
    ? existing
    : await Notifications.requestPermissionsAsync();
  if (permissions.status !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "School updates",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) throw new Error("An EAS project ID is required for Expo push notifications.");

  const response = await Notifications.getExpoPushTokenAsync({ projectId });
  return response.data;
