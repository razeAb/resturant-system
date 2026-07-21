import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useLang } from "../../../src/context/LangContext";

// No dedicated SVGs for these yet - simple emoji tint, matching how the driver tabs
// looked before the SVG icon set was added.
const TabIcon = (emoji) => ({ color }) => <Text style={{ fontSize: 20, opacity: color === "#111" ? 1 : 0.4 }}>{emoji}</Text>;

export default function AdminTabsLayout() {
  const { t } = useLang();

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#111", tabBarInactiveTintColor: "#999" }}>
      <Tabs.Screen name="dashboard" options={{ title: t("admin.tabs.dashboard", "לוח בקרה"), tabBarIcon: TabIcon("📊") }} />
      <Tabs.Screen name="deliveries" options={{ title: t("admin.tabs.deliveries", "משלוחים"), tabBarIcon: TabIcon("📦") }} />
      <Tabs.Screen name="drivers" options={{ title: t("admin.tabs.drivers", "שליחים"), tabBarIcon: TabIcon("🚚") }} />
      <Tabs.Screen name="payments" options={{ title: t("admin.tabs.payments", "תשלומים"), tabBarIcon: TabIcon("💰") }} />
    </Tabs>
  );
}
