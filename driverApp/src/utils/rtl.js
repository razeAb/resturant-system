import { I18nManager, Platform } from "react-native";
import * as Updates from "expo-updates";

// React Native only picks up a forceRTL() change after the JS bundle reloads,
// so switching languages (he <-> en, which differ in writing direction)
// needs an explicit reload for the layout to actually mirror.
export async function applyRTLForLanguage(lang) {
  const shouldBeRTL = lang === "he";
  if (I18nManager.isRTL === shouldBeRTL) return;

  I18nManager.allowRTL(true);
  I18nManager.forceRTL(shouldBeRTL);

  if (Platform.OS === "web") return;

  try {
    await Updates.reloadAsync();
  } catch {
    // Not running in a build that supports reloadAsync (e.g. plain Metro/dev
    // client edge cases) - the new direction still takes effect next launch.
  }
}
