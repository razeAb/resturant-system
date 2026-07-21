import { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, Switch, FlatList, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { useLang } from "../../src/context/LangContext";
import { setOnline, fetchAvailableOrders, claimOrder, declineOrder, fetchEarnings } from "../../src/api/driver";
import { getSocket } from "../../src/utils/socket";
import Text from "../../src/components/RTLText";

const POLL_INTERVAL_MS = 5000;
const AVG_SPEED_KMH = 30; // rough approximation until a real routing API is wired up (Phase 2)

export default function HomeScreen() {
  const { driver, refreshDriver, setDriver } = useAuth();
  const { t, isRTL } = useLang();
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [actioningId, setActioningId] = useState(null);
  const [error, setError] = useState("");
  const [todaySummary, setTodaySummary] = useState({ today: 0, completedToday: 0 });

  const loadOrders = useCallback(async () => {
    try {
      const { orders: available } = await fetchAvailableOrders();
      setOrders(available);
    } catch {
      // Silent - the next poll tick retries.
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const data = await fetchEarnings();
      setTodaySummary({ today: data.today || 0, completedToday: data.completedToday || 0 });
    } catch {
      // Non-critical for the home screen - stays at last known value.
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (!driver?.online || driver?.currentOrder) {
      setOrders([]);
      return;
    }
    loadOrders();
    const interval = setInterval(loadOrders, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [driver?.online, driver?.currentOrder, loadOrders]);

  // The Expo push notification (see src/utils/pushNotifications.js) is what
  // makes noise/vibrates; this socket listener just keeps the list itself
  // in sync instantly instead of waiting for the next poll tick.
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !driver?.online || driver?.currentOrder) return;

    const handleNewDelivery = () => loadOrders();
    const handleClaimed = ({ orderId }) => {
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
    };

    socket.on("delivery:new", handleNewDelivery);
    socket.on("delivery:claimed", handleClaimed);
    return () => {
      socket.off("delivery:new", handleNewDelivery);
      socket.off("delivery:claimed", handleClaimed);
    };
  }, [driver?.online, driver?.currentOrder, loadOrders]);

  if (!driver) return null;

  const handleToggleOnline = async (value) => {
    setTogglingOnline(true);
    setError("");
    try {
      const { driver: updated } = await setOnline(value);
      setDriver(updated);
    } catch {
      setError(t("dashboard.onlineToggleError", "לא ניתן היה לעדכן את הסטטוס"));
    } finally {
      setTogglingOnline(false);
    }
  };

  const handleAccept = async (orderId) => {
    setActioningId(orderId);
    setError("");
    try {
      await claimOrder(orderId);
      await refreshDriver();
      router.push("/active");
    } catch (err) {
      setError(err?.response?.data?.message || t("dashboard.claimError", "לא ניתן היה לקחת את ההזמנה"));
      loadOrders();
    } finally {
      setActioningId(null);
    }
  };

  const handleDecline = async (orderId) => {
    setActioningId(orderId);
    setError("");
    try {
      await declineOrder(orderId);
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
    } catch {
      setError(t("dashboard.declineError", "לא ניתן היה לדחות את ההזמנה"));
    } finally {
      setActioningId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadOrders(), loadSummary()]);
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL && styles.rowReverse]}>
        <View>
          <Text style={styles.greeting}>
            {t("dashboard.greeting", "שלום")}, {driver.name}
          </Text>
          <Text style={styles.subtitle}>{driver.online ? t("dashboard.online", "מחובר") : t("dashboard.offline", "לא מחובר")}</Text>
        </View>
        <Switch value={!!driver.online} onValueChange={handleToggleOnline} disabled={togglingOnline} />
      </View>

      <View style={[styles.statsRow, isRTL && styles.rowReverse]}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₪{todaySummary.today}</Text>
          <Text style={styles.statLabel}>{t("dashboard.todayEarnings", "הכנסות היום")}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{todaySummary.completedToday}</Text>
          <Text style={styles.statLabel}>{t("dashboard.completedToday", "משלוחים שהושלמו היום")}</Text>
        </View>
      </View>

      {driver.currentOrder ? (
        <Pressable style={styles.activeCard} onPress={() => router.push("/active")}>
          <Text style={styles.activeCardTitle}>{t("delivery.title", "משלוח פעיל")}</Text>
          <Text style={styles.activeCardLink}>{t("dashboard.viewDelivery", "צפה במשלוח")} →</Text>
        </Pressable>
      ) : null}

      <Text style={styles.zonesLabel}>{t("dashboard.yourZones", "האזורים שלך")}</Text>
      <Text style={styles.zonesValue}>
        {driver.zones?.some((z) => z.placeId && z.active !== false)
          ? driver.zones
              .filter((z) => z.placeId && z.active !== false)
              .map((z) => z.name)
              .join(" · ")
          : t("dashboard.noZonesYet", "לא נבחרו אזורים עדיין")}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!driver.online ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t("dashboard.goOnlinePrompt", "התחבר כדי לראות משלוחים זמינים")}</Text>
        </View>
      ) : driver.currentOrder ? null : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>{t("dashboard.noDeliveries", "אין משלוחים ממתינים כרגע")}</Text>
            </View>
          }
          contentContainerStyle={orders.length === 0 ? styles.flexGrow : undefined}
          renderItem={({ item }) => {
            const etaMin = Number.isFinite(item.deliveryDistanceKm) ? Math.round((item.deliveryDistanceKm / AVG_SPEED_KMH) * 60) : null;
            const isCash = item.paymentDetails?.method === "Cash";
            const busy = actioningId === item._id;
            return (
              <View style={styles.orderCard}>
                <Text style={styles.orderAddress}>{item.deliveryZoneName || t("dashboard.noAddress", "אין כתובת")}</Text>
                <Text style={styles.orderMeta}>{item.deliveryAddress?.text || t("dashboard.noAddress", "אין כתובת")}</Text>
                <View style={[styles.orderDetailsRow, isRTL && styles.rowReverse]}>
                  {Number.isFinite(item.deliveryDistanceKm) ? (
                    <Text style={styles.orderDetail}>
                      {t("dashboard.distance", "מרחק")}: {item.deliveryDistanceKm.toFixed(1)} ק"מ
                    </Text>
                  ) : null}
                  {etaMin != null ? (
                    <Text style={styles.orderDetail}>
                      {t("dashboard.estimatedDriveTime", "זמן נהיגה משוער")}: ~{etaMin} {t("dashboard.min", "דק'")}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.orderPrice}>
                  ₪{item.totalPrice} · {isCash ? t("delivery.cash", "מזומן") : t("delivery.card", "אשראי")}
                </Text>
                {isCash ? (
                  <Text style={styles.orderCollect}>
                    {t("dashboard.amountToCollect", "לגבות מהלקוח")}: ₪{item.totalPrice}
                  </Text>
                ) : null}
                <View style={[styles.actionsRow, isRTL && styles.rowReverse]}>
                  <Pressable style={styles.declineButton} onPress={() => handleDecline(item._id)} disabled={busy}>
                    <Text style={styles.declineButtonText}>{t("dashboard.decline", "דחה")}</Text>
                  </Pressable>
                  <Pressable style={styles.acceptButton} onPress={() => handleAccept(item._id)} disabled={busy}>
                    {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptButtonText}>{t("dashboard.accept", "אשר")}</Text>}
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  flexGrow: { flexGrow: 1 },
  rowReverse: { flexDirection: "row-reverse" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  greeting: { fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#666", marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#eee", borderRadius: 10, padding: 12 },
  statValue: { fontSize: 20, fontWeight: "700" },
  statLabel: { color: "#888", fontSize: 12, marginTop: 2 },
  activeCard: {
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activeCardTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  activeCardLink: { color: "#f97316", fontWeight: "600" },
  zonesLabel: { color: "#888", fontSize: 12, marginBottom: 2 },
  zonesValue: { fontSize: 14, marginBottom: 14 },
  emptyText: { color: "#888", fontSize: 15 },
  error: { color: "#c00", marginBottom: 8 },
  orderCard: { borderWidth: 1, borderColor: "#eee", borderRadius: 10, padding: 14, marginBottom: 12, backgroundColor: "#fafafa" },
  orderAddress: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  orderMeta: { color: "#555", marginBottom: 8 },
  orderDetailsRow: { flexDirection: "row", gap: 14, marginBottom: 6 },
  orderDetail: { color: "#555", fontSize: 13 },
  orderPrice: { fontWeight: "600", fontSize: 15, marginTop: 4 },
  orderCollect: { color: "#b45309", fontWeight: "600", marginTop: 2 },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  declineButton: { flex: 1, borderWidth: 1, borderColor: "#c00", borderRadius: 8, padding: 10, alignItems: "center" },
  declineButtonText: { color: "#c00", fontWeight: "600" },
  acceptButton: { flex: 1, backgroundColor: "#111", borderRadius: 8, padding: 10, alignItems: "center" },
  acceptButtonText: { color: "#fff", fontWeight: "600" },
});
