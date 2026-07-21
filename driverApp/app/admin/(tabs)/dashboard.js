import { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { useLang } from "../../../src/context/LangContext";
import { useAuth } from "../../../src/context/AuthContext";
import { fetchDashboard } from "../../../src/api/admin";
import Text from "../../../src/components/RTLText";

const POLL_INTERVAL_MS = 15000;

export default function AdminDashboardScreen() {
  const { t, isRTL } = useLang();
  const { logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await fetchDashboard());
      setError("");
    } catch {
      setError(t("admin.dashboard.loadError", "לא ניתן היה לטעון את לוח הבקרה"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Waiting deliveries outnumbering available drivers is exactly the kind of problem
  // this screen should make impossible to miss.
  const understaffed = (data?.deliveriesWaiting || 0) > (data?.driversAvailable || 0);

  const tiles = [
    { key: "driversOnline", label: t("admin.dashboard.driversOnline", "שליחים מחוברים"), value: data?.driversOnline ?? 0 },
    { key: "driversDelivering", label: t("admin.dashboard.driversDelivering", "שליחים במשלוח"), value: data?.driversDelivering ?? 0 },
    { key: "driversAvailable", label: t("admin.dashboard.driversAvailable", "שליחים פנויים"), value: data?.driversAvailable ?? 0 },
    {
      key: "deliveriesWaiting",
      label: t("admin.dashboard.deliveriesWaiting", "משלוחים ממתינים לשליח"),
      value: data?.deliveriesWaiting ?? 0,
      warn: understaffed,
    },
    { key: "activeDeliveries", label: t("admin.dashboard.activeDeliveries", "משלוחים פעילים"), value: data?.activeDeliveries ?? 0 },
    { key: "completedToday", label: t("admin.dashboard.completedToday", "הושלמו היום"), value: data?.completedToday ?? 0 },
    { key: "failedToday", label: t("admin.dashboard.failedToday", "בוטלו/נכשלו היום"), value: data?.failedToday ?? 0 },
    { key: "totalFeesToday", label: t("admin.dashboard.totalFeesToday", 'סה"כ דמי משלוח היום'), value: `₪${data?.totalFeesToday ?? 0}` },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      <View style={[styles.header, isRTL && styles.rowReverse]}>
        <Text style={styles.title}>{t("admin.dashboard.title", "לוח בקרה")}</Text>
        <Pressable style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>{t("menu.logOut", "התנתקות")}</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.grid}>
        {tiles.map((tile) => (
          <View key={tile.key} style={[styles.tile, tile.warn && styles.tileWarn]}>
            <Text style={styles.tileValue}>{tile.value}</Text>
            <Text style={styles.tileLabel}>{tile.label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  rowReverse: { flexDirection: "row-reverse" },
  title: { fontSize: 24, fontWeight: "700" },
  logoutButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#fee2e2" },
  logoutText: { color: "#c00", fontWeight: "600", fontSize: 13 },
  error: { color: "#c00", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "47%", backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 14 },
  tileWarn: { backgroundColor: "#fef3c7", borderColor: "#fbbf24" },
  tileValue: { fontSize: 26, fontWeight: "700" },
  tileLabel: { color: "#888", fontSize: 12, marginTop: 4 },
});
