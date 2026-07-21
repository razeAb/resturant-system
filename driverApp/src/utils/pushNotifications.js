import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";

const NEW_DELIVERY_VIBRATION_PATTERN = [0, 400, 200, 400, 200, 400];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("delivery-requests", {
    name: "Delivery requests",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: NEW_DELIVERY_VIBRATION_PATTERN,
    sound: "default",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

// Returns an Expo push token to send to the backend, or null if permission
// was denied, running on a simulator, or no EAS projectId is configured yet.
export async function registerForPushNotificationsAsync() {
  await ensureAndroidChannel();

  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    ({ status: finalStatus } = await Notifications.requestPermissionsAsync());
  }
  if (finalStatus !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId || projectId === "REPLACE_WITH_EAS_PROJECT_ID") {
    console.warn("No EAS projectId configured (app.json extra.eas.projectId) - skipping push token registration. Run `eas init` first.");
    return null;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    return token;
  } catch (err) {
    console.warn("Failed to get Expo push token:", err?.message || err);
    return null;
  }
}
