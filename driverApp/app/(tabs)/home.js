import { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, Switch, Pressable, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { useLang } from "../../src/context/LangContext";
import { setOnline, fetchAvailableOrders, claimOrder, declineOrder, fetchEarnings } from "../../src/api/driver";
import { getSocket } from "../../src/utils/socket";
import Text from "../../src/components/RTLText";

const POLL_INTERVAL_MS = 5000;
const AVG_SPEED_KMH = 30; // rough approximation until a real routing API is wired up (Phase 2)

const initialsOf = (name) =>
  (name || "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

// mm:ss countdown until the kitchen's prep-time estimate elapses; clamped at 00:00 rather
// than going negative once the order is actually ready.
const formatCountdown = (ms) => {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

export default function HomeScreen() {
  const { driver, refreshDriver, setDriver } = useAuth();
  const { t, isRTL } = useLang();
  const [orders, setOrders] = useState([]);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [actioningId, setActioningId] = useState(null);
  const [error, setError] = useState("");
  const [todaySummary, setTodaySummary] = useState({ today: 0, completedToday: 0 });
  const [now, setNow] = useState(Date.now());

  const loadOrders = useCallback(async () => {
    try {
      const { orders: available } = await fetchAvailableOrders();
      setOrders(available);
      setFeaturedIndex((prev) => (prev < available.length ? prev : 0));
    } catch {
      // Silent - the next poll tick retries.
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const data = await fetchEarnings();
      setTodaySummary({ today: data.today?.total || 0, completedToday: data.today?.count || 0 });
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

  // Drives the live "ready in mm:ss" countdown on the featured order card.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

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

  const featured = orders[featuredIndex] || null;
  const otherCount = Math.max(0, orders.length - 1);
  const cycleFeatured = () => setFeaturedIndex((prev) => (orders.length ? (prev + 1) % orders.length : 0));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <View style={styles.toggleGroup}>
          <Switch
            value={!!driver.online}
            onValueChange={handleToggleOnline}
            disabled={togglingOnline}
            trackColor={{ false: "#ddd", true: "#16a34a" }}
          />
          <Text style={styles.toggleLabel}>{t("dashboard.availableToggle", "אני זמין לקבלת משלוחים")}</Text>
        </View>
        <View style={[styles.identityGroup, isRTL && styles.rowReverse]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsOf(driver.name)}</Text>
          </View>
          <View>
            <Text style={styles.driverName}>{driver.name}</Text>
            <Text style={styles.driverRole}>{t("dashboard.roleDriver", "נהג")}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.statsRow, isRTL && styles.rowReverse]}>
        <View style={styles.statCard}>
          <View style={styles.statIconCircle}>
            <Text style={styles.statIconText}>🛍️</Text>
          </View>
          <Text style={styles.statValue}>{todaySummary.completedToday}</Text>
          <Text style={styles.statLabel}>{t("dashboard.completedToday", "משלוחים שהושלמו היום")}</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconCircle}>
            <Text style={styles.statIconText}>💳</Text>
          </View>
          <Text style={styles.statValue}>₪{todaySummary.today}</Text>
          <Text style={styles.statLabel}>{t("dashboard.todayEarnings", "הכנסות היום")}</Text>
        </View>
      </View>

      {driver.currentOrder ? (
        <Pressable style={styles.activeCard} onPress={() => router.push("/active")}>
          <Text style={styles.activeCardTitle}>{t("delivery.title", "משלוח פעיל")}</Text>
          <Text style={styles.activeCardLink}>{t("dashboard.viewDelivery", "צפה במשלוח")} →</Text>
        </Pressable>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!driver.online ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t("dashboard.goOnlinePrompt", "התחבר כדי לראות משלוחים זמינים")}</Text>
        </View>
      ) : driver.currentOrder ? null : !featured ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t("dashboard.noDeliveries", "אין משלוחים ממתינים כרגע")}</Text>
        </View>
      ) : (
        <>
          <View style={[styles.sectionHeaderRow, isRTL && styles.rowReverse]}>
            <View style={styles.liveDot} />
            <View>
              <Text style={styles.sectionTitle}>{t("dashboard.newDelivery", "משלוח חדש")}</Text>
              <Text style={styles.sectionSubtitle}>{t("dashboard.incomingOrder", "הזמנה נכנסת")}</Text>
            </View>
          </View>

          <FeaturedOrderCard
            item={featured}
            now={now}
            busy={actioningId === featured._id}
            onAccept={() => handleAccept(featured._id)}
            onDecline={() => handleDecline(featured._id)}
            t={t}
            isRTL={isRTL}
          />

          {otherCount > 0 ? (
            <Pressable style={[styles.pagerRow, isRTL && styles.rowReverse]} onPress={cycleFeatured}>
              <Text style={styles.pagerChevron}>{isRTL ? "‹" : "›"}</Text>
              <View style={styles.pagerBadge}>
                <Text style={styles.pagerBadgeText}>{otherCount}</Text>
              </View>
              <Text style={styles.pagerLabel}>{t("dashboard.activeOrders", "הזמנות פעילות")}</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function FeaturedOrderCard({ item, now, busy, onAccept, onDecline, t, isRTL }) {
  const restaurantName = item.restaurant?.name || "";
  const hasDrivingData = Number.isFinite(item.deliveryDrivingDistanceKm);
  const distanceKm = hasDrivingData ? item.deliveryDrivingDistanceKm : item.deliveryDistanceKm;
  const readyAtMs =
    Number.isFinite(item.estimatedTime) && item.delivery?.etaAnchoredAt
      ? new Date(item.delivery.etaAnchoredAt).getTime() + item.estimatedTime * 60000
      : null;
  const countdownLabel = readyAtMs != null ? formatCountdown(readyAtMs - now) : null;
  const isReady = readyAtMs != null && readyAtMs - now <= 0;
  const isCash = item.paymentDetails?.method === "Cash";
  const driverFee = Number.isFinite(item.deliveryFeeBeforeVat) ? item.deliveryFeeBeforeVat : item.deliveryFee;
  const orderNumber = String(item._id).slice(-6).toUpperCase();

  return (
    <View style={styles.orderCard}>
      <View style={[styles.orderTopRow, isRTL && styles.rowReverse]}>
        <View style={[styles.readyRow, isRTL && styles.rowReverse]}>
          <Text style={styles.clockIcon}>🕐</Text>
          <Text style={styles.readyText}>
            {isReady ? t("dashboard.readyNow", "מוכן!") : `${t("dashboard.readyIn", "מוכן בעוד")} ${countdownLabel || "—:—"}`}
          </Text>
        </View>
        {restaurantName ? (
          <View style={[styles.restaurantBadgeRow, isRTL && styles.rowReverse]}>
            <View style={styles.restaurantLogo}>
              <Text style={styles.restaurantLogoText}>🔥</Text>
            </View>
            <View style={styles.restaurantPill}>
              <Text style={styles.restaurantPillText}>{restaurantName.toUpperCase()}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <Text style={styles.orderZone}>{item.deliveryZoneName || t("dashboard.noAddress", "אין כתובת")}</Text>
      {item.customerName ? <Text style={styles.orderCustomer}>{item.customerName}</Text> : null}

      <View style={[styles.infoColsRow, isRTL && styles.rowReverse]}>
        <View style={styles.infoCol}>
          <Text style={styles.infoColLabel}>{t("dashboard.distance", "מרחק")}:</Text>
          <Text style={styles.infoColValue}>{Number.isFinite(distanceKm) ? `${distanceKm.toFixed(1)} ק"מ` : "—"}</Text>
        </View>
        <View style={styles.infoCol}>
          <Text style={styles.infoColLabel}>{t("dashboard.expectedTip", "טיפ צפוי")}:</Text>
          <Text style={styles.infoColValue}>₪{Number.isFinite(driverFee) ? driverFee : 0}</Text>
        </View>
        <View style={styles.infoCol}>
          <Text style={styles.infoColLabel}>{t("earnings.orderPrefix2", "מספר הזמנה")}:</Text>
          <Text style={styles.infoColValue}>#{orderNumber}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={[styles.totalsRow, isRTL && styles.rowReverse]}>
        <View>
          <Text style={styles.totalLabel}>{t("dashboard.totalToPay", "סה\"כ לתשלום")}</Text>
          <Text style={styles.totalValue}>₪{item.totalPrice}</Text>
          <Text style={styles.totalIncludes}>{t("dashboard.includesDelivery", "כולל משלוח")}</Text>
        </View>
        <View style={styles.paymentCol}>
          <Text style={styles.totalLabel}>{t("dashboard.paymentMethod", "אמצעי תשלום")}</Text>
          <View style={[styles.paymentValueRow, isRTL && styles.rowReverse]}>
            <Text style={styles.totalValue}>{isCash ? t("delivery.cash", "מזומן") : t("delivery.card", "אשראי")}</Text>
            <Text style={styles.paymentIcon}>{isCash ? "💵" : "💳"}</Text>
          </View>
        </View>
      </View>

      <Pressable style={styles.acceptButton} onPress={onAccept} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptButtonText}>{t("dashboard.confirmDelivery", "אשר משלוח")} ✓</Text>}
      </Pressable>
      <Pressable style={styles.declineButton} onPress={onDecline} disabled={busy}>
        <Text style={styles.declineButtonText}>{t("dashboard.decline", "דחה")} ✗</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 30 },
  center: { paddingVertical: 60, justifyContent: "center", alignItems: "center" },
  rowReverse: { flexDirection: "row-reverse" },
  error: { color: "#c00", marginBottom: 8 },
  emptyText: { color: "#888", fontSize: 15 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  toggleGroup: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  toggleLabel: { fontSize: 13, color: "#333", fontWeight: "600", flexShrink: 1 },
  identityGroup: { flexDirection: "row", alignItems: "center", gap: 10 },
  driverName: { fontSize: 16, fontWeight: "700", textAlign: "right" },
  driverRole: { color: "#888", fontSize: 12, textAlign: "right" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#f2f2f2", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontWeight: "700", color: "#555" },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 14, alignItems: "center" },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statIconText: { fontSize: 16 },
  statValue: { fontSize: 20, fontWeight: "700" },
  statLabel: { color: "#888", fontSize: 12, marginTop: 4, textAlign: "center" },

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

  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#16a34a" },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  sectionSubtitle: { color: "#888", fontSize: 12, marginTop: 1 },

  orderCard: { borderWidth: 1, borderColor: "#eee", borderRadius: 14, padding: 16, marginBottom: 14, backgroundColor: "#fff" },
  orderTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  readyRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  clockIcon: { fontSize: 13 },
  readyText: { color: "#f97316", fontWeight: "700", fontSize: 13 },
  restaurantBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  restaurantPill: { backgroundColor: "#ffedd5", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  restaurantPillText: { color: "#9a3412", fontSize: 10, fontWeight: "700" },
  restaurantLogo: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  restaurantLogoText: { fontSize: 14 },

  orderZone: { fontSize: 20, fontWeight: "700", textAlign: "right" },
  orderCustomer: { color: "#555", fontSize: 14, marginTop: 2, textAlign: "right" },

  infoColsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  infoCol: { alignItems: "center", flex: 1 },
  infoColLabel: { color: "#888", fontSize: 12 },
  infoColValue: { fontSize: 14, fontWeight: "700", marginTop: 4 },

  divider: { height: 1, backgroundColor: "#eee", marginVertical: 14 },

  totalsRow: { flexDirection: "row", justifyContent: "space-between" },
  paymentCol: { alignItems: "flex-end" },
  totalLabel: { color: "#888", fontSize: 12, textAlign: "right" },
  totalValue: { fontSize: 20, fontWeight: "700", marginTop: 4, textAlign: "right" },
  totalIncludes: { color: "#f97316", fontSize: 11, fontWeight: "600", marginTop: 2, textAlign: "right" },
  paymentValueRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  paymentIcon: { fontSize: 16 },

  acceptButton: {
    backgroundColor: "#16a34a",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginTop: 18,
  },
  acceptButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  declineButton: {
    borderWidth: 1.5,
    borderColor: "#dc2626",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 10,
  },
  declineButtonText: { color: "#dc2626", fontWeight: "700", fontSize: 15 },

  pagerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    padding: 12,
  },
  pagerLabel: { fontSize: 14, fontWeight: "700" },
  pagerBadge: { backgroundColor: "#dcfce7", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  pagerBadgeText: { color: "#166534", fontSize: 12, fontWeight: "700" },
  pagerChevron: { color: "#888", fontSize: 16, fontWeight: "700" },
});
