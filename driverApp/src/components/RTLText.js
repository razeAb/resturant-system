import { Text } from "react-native";
import { useLang } from "../context/LangContext";

// I18nManager.forceRTL() needs a full native app restart to take visual
// effect, which Expo Go never does - so instead of relying on it, every
// screen renders text through this wrapper, which aligns right/left off the
// in-app language directly regardless of what the native layer thinks.
export default function RTLText({ style, ...props }) {
  const { isRTL } = useLang();
  return <Text style={[{ textAlign: isRTL ? "right" : "left", writingDirection: isRTL ? "rtl" : "ltr" }, style]} {...props} />;
}
