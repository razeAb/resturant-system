import { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator, FlatList, RefreshControl } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { useLang } from "../../src/context/LangContext";
import { fetchMyOrders, fetchRestaurant } from "../../src/api/driver";
import Text from "../../src/components/RTLText";

const TERMINAL_STATUSES = ["delivered", "customer_unavailable", "returned_to_restaurant", "canceled"];

const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString() : "");

export default function HistoryScreen() {
  const { driver } = useAuth();
  const { t, isRTL } = useLang();
  const [items, setItems] = useState([]);
  const [restaurantName, setRestaurantName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [{ orders }, restaurant] = await Promise.all([fetchMyOrders(), fetchRestaurant()]);
      setRestaurantName(restaurant?.name || "");
      setItems(orders.filter((o) => TERMINAL_STATUSES.includes(o.delivery?.status)));
      setError("");
    } catch {
      setError(t("history.loadError", "לא ניתן היה לטעון את ההיסטוריה"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  if (!driver) return null;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const statusLabel = (status) =>
    status === "delivered"
      ? t("delivery.statusDelivered", "נמסר")
      : status === "customer_unavailable"
        ? t("delivery.statusCustomerUnavailable", "לקוח לא זמין")
        : status === "returned_to_restaurant"
          ? t("delivery.statusReturned", "הוחזר למסעדה")
          : status;

  const paymentLabel = (method) =>
    method === "Cash" ? t("delivery.cash", "מזומן") : method === "Card" ? t("delivery.card", "אשראי") : t("delivery.unknown", "לא ידוע");

  return (
    <FlatList
      style={styles.container}
      data={items}
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
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>{t("history.title", "היסטוריית משלוחים")}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t("history.noHistory", "אין היסטוריית משלוחים עדיין")}</Text>
        </View>
      }
      contentContainerStyle={!items.length ? styles.flexGrow : { paddingBottom: 20 }}
      renderItem={({ item }) => (
        <View style={[styles.row, isRTL && styles.rowReverse]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{restaurantName}</Text>
            <Text style={styles.rowSub}>{item.deliveryZoneName}</Text>
            <Text style={styles.rowSub}>{fmtDateTime(item.delivery?.deliveredAt || item.createdAt)}</Text>
          </View>
          <View style={{ alignItems: isRTL ? "flex-start" : "flex-end" }}>
            <Text style={styles.rowAmount}>₪{item.totalPrice}</Text>
            <Text style={styles.rowSub}>{paymentLabel(item.paymentDetails?.method)}</Text>
            <Text style={styles.rowStatus}>{statusLabel(item.delivery?.status)}</Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },
  flexGrow: { flexGrow: 1 },
  rowReverse: { flexDirection: "row-reverse" },
  title: { fontSize: 24, fontWeight: "700", paddingTop: 60, paddingHorizontal: 20, marginBottom: 10 },
  error: { color: "#c00", paddingHorizontal: 20, marginBottom: 8 },
  emptyText: { color: "#888", fontSize: 15 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f2f2f2",
  },
  rowTitle: { fontSize: 15, fontWeight: "600" },
  rowSub: { color: "#888", fontSize: 12, marginTop: 2 },
  rowAmount: { fontSize: 16, fontWeight: "700" },
  rowStatus: { color: "#555", fontSize: 12, marginTop: 2, fontWeight: "600" },
});
