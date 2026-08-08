import { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { router } from "expo-router";
import { useLang } from "../../../src/context/LangContext";
import { fetchDeliveries } from "../../../src/api/admin";
import Text from "../../../src/components/RTLText";

const POLL_INTERVAL_MS = 8000;

const STATUS_KEY = {
  unassigned: "statusBroadcasting",
  claimed: "statusClaimed",
  arrived_at_restaurant: "statusArrived",
  picked_up: "statusPickedUp",
  delivered: "statusDelivered",
  canceled: "statusCanceled",
  customer_unavailable: "statusCustomerUnavailable",
};

function minutesSince(iso) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

export default function AdminDeliveriesScreen() {
  const { t, isRTL } = useLang();
  const [filter, setFilter] = useState("active");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const { orders: data } = await fetchDeliveries(filter);
      setOrders(data);
      setError("");
    } catch {
      setError(t("admin.deliveries.loadError", "לא ניתן היה לטעון את המשלוחים"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, t]);

  useEffect(() => {
    setLoading(true);
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("admin.deliveries.title", "משלוחים פעילים")}</Text>

      <View style={[styles.filterRow, isRTL && styles.rowReverse]}>
        <Pressable style={[styles.filterPill, filter === "active" && styles.filterPillActive]} onPress={() => setFilter("active")}>
          <Text style={[styles.filterPillText, filter === "active" && styles.filterPillTextActive]}>
            {t("admin.deliveries.filterActive", "פעילים")}
          </Text>
        </Pressable>
        <Pressable style={[styles.filterPill, filter === "today" && styles.filterPillActive]} onPress={() => setFilter("today")}>
          <Text style={[styles.filterPillText, filter === "today" && styles.filterPillTextActive]}>
            {t("admin.deliveries.filterToday", "היום")}
          </Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          ListEmptyComponent={<Text style={styles.emptyText}>{t("admin.deliveries.empty", "אין משלוחים להצגה")}</Text>}
          contentContainerStyle={orders.length === 0 ? styles.flexGrow : { paddingBottom: 30 }}
          renderItem={({ item }) => {
            const statusKey = STATUS_KEY[item.delivery?.status] || "statusBroadcasting";
            return (
              <Pressable style={styles.card} onPress={() => router.push(`/admin/delivery/${item._id}`)}>
                <View style={[styles.cardHeader, isRTL && styles.rowReverse]}>
                  <Text style={styles.orderNumber}>#{item._id.slice(-6)}</Text>
                  <Text style={styles.statusBadge}>{t(`admin.deliveries.${statusKey}`, item.delivery?.status)}</Text>
                </View>
                <Text style={styles.zoneName}>{item.deliveryZoneName || item.deliveryAddress?.text}</Text>
                <View style={[styles.cardFooter, isRTL && styles.rowReverse]}>
                  <Text style={styles.driverName}>{item.delivery?.driver?.name || t("admin.deliveries.unassigned", "ללא שליח")}</Text>
                  <Text style={styles.waiting}>
                    {t("admin.deliveries.waitingSince", "ממתין")} {minutesSince(item.createdAt)} {t("dashboard.min", "דק'")}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 16 },
  rowReverse: { flexDirection: "row-reverse" },
  flexGrow: { flexGrow: 1 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  filterPill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: "#ddd" },
  filterPillActive: { backgroundColor: "#111", borderColor: "#111" },
  filterPillText: { fontSize: 13, color: "#333", fontWeight: "600" },
  filterPillTextActive: { color: "#fff" },
  error: { color: "#c00", marginBottom: 10 },
  emptyText: { color: "#888", textAlign: "center", marginTop: 30 },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 10, padding: 14, marginBottom: 10, backgroundColor: "#fafafa" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  orderNumber: { fontWeight: "700" },
  statusBadge: { fontSize: 12, fontWeight: "600", color: "#f97316" },
  zoneName: { fontSize: 15, marginBottom: 8 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between" },
  driverName: { fontSize: 13, color: "#555" },
  waiting: { fontSize: 12, color: "#888" },
});
