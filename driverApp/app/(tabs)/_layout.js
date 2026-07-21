import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { useLang } from "../../src/context/LangContext";
import HomeIcon from "../../assets/svg/home-4-svgrepo-com.svg";
import DeliveryIcon from "../../assets/svg/delivery-svgrepo-com.svg";
import EarningsIcon from "../../assets/svg/receipt-svgrepo-com.svg";
import HistoryIcon from "../../assets/svg/history-svgrepo-com.svg";
import ProfileIcon from "../../assets/svg/profile-circle-svgrepo-com.svg";

const TabIcon = (Icon) => ({ color, size }) => <Icon width={size ?? 22} height={size ?? 22} color={color} />;

export default function TabsLayout() {
  const { role, isLoading } = useAuth();
  const { t } = useLang();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (role !== "driver") {
    return <Redirect href="/" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#111", tabBarInactiveTintColor: "#999" }}>
      <Tabs.Screen name="home" options={{ title: t("tabs.home", "בית"), tabBarIcon: TabIcon(HomeIcon) }} />
      <Tabs.Screen name="active" options={{ title: t("tabs.active", "משלוח"), tabBarIcon: TabIcon(DeliveryIcon) }} />
      <Tabs.Screen name="earnings" options={{ title: t("tabs.earnings", "הכנסות"), tabBarIcon: TabIcon(EarningsIcon) }} />
      <Tabs.Screen name="history" options={{ title: t("tabs.history", "היסטוריה"), tabBarIcon: TabIcon(HistoryIcon) }} />
      <Tabs.Screen name="profile" options={{ title: t("tabs.profile", "פרופיל"), tabBarIcon: TabIcon(ProfileIcon) }} />
    </Tabs>
  );
}
