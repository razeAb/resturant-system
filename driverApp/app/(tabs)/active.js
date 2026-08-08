import { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, ScrollView, Switch, Linking, Modal } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { useLang } from "../../src/context/LangContext";
import {
  fetchMyOrders,
  markArrived,
  markPickedUp,
  markDelivered,
  markCustomerUnavailable,
} from "../../src/api/driver";
import Text from "../../src/components/RTLText";

// Waze is the standard navigation app for drivers here; falls back to the Waze web link
// (which itself offers to open/install the app) if the native app isn't installed.
const openWaze = (lat, lng) => {
  Linking.openURL(`waze://?ll=${lat},${lng}&navigate=yes`).catch(() =>
    Linking.openURL(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`)
  );
};

export default function ActiveDeliveryScreen() {
  const { driver, isLoading: authLoading, refreshDriver } = useAuth();
  const { t, isRTL } = useLang();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cashCollected, setCashCollected] = useState(false);
  const [error, setError] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      const { orders } = await fetchMyOrders();
      const active = orders.find((o) =>
        ["claimed", "arrived_at_restaurant", "picked_up"].includes(o.delivery?.status)
      );
      setOrder(active || null);
    } catch {
      setError(t("delivery.loadError", "לא ניתן היה לטעון את פרטי המשלוח"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  if (authLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!driver) return null;

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>{t("delivery.noActiveDelivery", "אין משלוח פעיל כרגע")}</Text>
      </View>
    );
  }

  const restaurant = order.restaurant;
  const isCash = order.paymentDetails?.method === "Cash";
  const paymentLabel = isCash ? t("delivery.cash", "מזומן") : order.paymentDetails?.method === "Card" ? t("delivery.card", "אשראי") : t("delivery.unknown", "לא ידוע");
  const isPickedUp = order.delivery?.status === "picked_up";
  const isPreArrival = order.delivery?.status === "claimed" || order.delivery?.status === "arrived_at_restaurant";

  // The kitchen's prep-time estimate is a fixed minutes value anchored to when it was set
  // (delivery.etaAnchoredAt), not minutes-from-now - so "ready by" is that anchor + estimate.
  const readyByLabel =
    Number.isFinite(order.estimatedTime) && order.delivery?.etaAnchoredAt
      ? new Date(new Date(order.delivery.etaAnchoredAt).getTime() + order.estimatedTime * 60000).toLocaleTimeString(
          "he-IL",
          { hour: "2-digit", minute: "2-digit" }
        )
      : null;

  const itemLineTotal = (item) => {
    const additionsTotal = (item.additions || []).reduce((sum, a) => sum + (Number(a.price) || 0), 0);
    return ((Number(item.price) || 0) + additionsTotal) * (item.quantity || 1);
  };
  const itemsSubtotal = (order.items || []).reduce((sum, item) => sum + itemLineTotal(item), 0);
  const itemsCount = (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
  const driverEarning = order.feeUndetermined ? null : Number.isFinite(order.deliveryFeeBeforeVat) ? order.deliveryFeeBeforeVat : order.deliveryFee;

  const handleArrived = async () => {
    setActionLoading(true);
    setError("");
    try {
      const { order: updated } = await markArrived(order._id);
      setOrder(updated);
    } catch (err) {
      setError(err?.response?.data?.message || t("delivery.arrivedError", "לא ניתן היה לסמן הגעה"));
    } finally {
      setActionLoading(false);
    }
  };

  const handlePickedUp = async () => {
    setActionLoading(true);
    setError("");
    try {
      const { order: updated } = await markPickedUp(order._id);
      setOrder(updated);
    } catch (err) {
      setError(err?.response?.data?.message || t("delivery.pickedUpError", "לא ניתן היה לסמן כנאסף"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelivered = async () => {
    if (isCash && !cashCollected) {
      setError(t("delivery.confirmCashFirst", "אשר קבלת מזומן לפני הסיום"));
      return;
    }
    setActionLoading(true);
    setError("");
    try {
      await markDelivered(order._id, cashCollected);
      await refreshDriver();
      router.replace("/home");
    } catch (err) {
      setError(err?.response?.data?.message || t("delivery.deliveredError", "לא ניתן היה לסמן כנמסר"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportProblem = async () => {
    setSheetOpen(false);
    setActionLoading(true);
    setError("");
    try {
      await markCustomerUnavailable(order._id);
      await refreshDriver();
      router.replace("/home");
    } catch (err) {
      setError(err?.response?.data?.message || t("unavailable.reportError", "לא ניתן היה לדווח על התקלה"));
    } finally {
      setActionLoading(false);
    }
  };

  const customerPhone = order.phone || "";

  // wa.me requires international format with no leading zero/plus/separators - Israeli
  // numbers are stored locally (05XXXXXXXX), so 0 -> 972 and strip everything else.
  const openWhatsApp = (phone) => {
    const digits = String(phone || "").replace(/\D/g, "");
    if (!digits) return;
    const intl = digits.startsWith("972") ? digits : digits.startsWith("0") ? `972${digits.slice(1)}` : digits;
    Linking.openURL(`https://wa.me/${intl}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.header, isRTL && styles.rowReverse]}>
        {restaurant?.phone ? (
          <Pressable style={styles.headerCallButton} onPress={() => Linking.openURL(`tel:${restaurant.phone}`)}>
            <Text style={styles.headerCallIcon}>📞</Text>
          </Pressable>
        ) : (
          <View style={styles.headerCallButton} />
        )}
        <View style={styles.headerTitleGroup}>
          <Text style={styles.title}>{t("delivery.title", "משלוח פעיל")}</Text>
          <Text style={styles.orderNumber}>
            {t("delivery.orderNumber", "מספר הזמנה")}: #{order._id.slice(-6)}
          </Text>
        </View>
      </View>

      {isPreArrival ? (
        <View style={styles.card}>
          <View style={[styles.restaurantHeaderRow, isRTL && styles.rowReverse]}>
            <View style={styles.restaurantLogo}>
              <Text style={styles.restaurantLogoText}>🔥</Text>
            </View>
            <View style={styles.restaurantInfo}>
              <Text style={styles.label}>{t("dashboard.restaurantLabel", "מסעדה")}</Text>
              <Text style={styles.restaurantName}>{restaurant?.name}</Text>
              {restaurant?.address?.text ? (
                <Text style={styles.notesWithIcon}>📍 {restaurant.address.text}</Text>
              ) : null}
              {readyByLabel ? (
                <Text style={styles.readyByLabel}>
                  🕐 {t("delivery.readyBy", "הזמנה צפויה להיות מוכנה בשעה")} {readyByLabel}
                </Text>
              ) : null}
            </View>
          </View>
          {Number.isFinite(restaurant?.address?.lat) && (
            <Pressable style={styles.navButtonFull} onPress={() => openWaze(restaurant.address.lat, restaurant.address.lng)}>
              <Text style={styles.navButtonText}>🧭 {t("delivery.navigateToRestaurant", "נווט למסעדה")}</Text>
            </Pressable>
          )}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.label}>{t("delivery.customer", "לקוח")}</Text>
        <Text style={styles.customerName}>{order.customerName || t("delivery.unknownCustomer", "לקוח")}</Text>
        {customerPhone ? <Text style={styles.notesWithIcon}>{customerPhone} 📞</Text> : null}
        {order.deliveryAddress?.text ? <Text style={styles.notesWithIcon}>📍 {order.deliveryAddress.text}</Text> : null}
        {order.deliveryAddress?.notes ? <Text style={styles.notes}>{order.deliveryAddress.notes}</Text> : null}

        {customerPhone ? (
          <View style={[styles.navRow, isRTL && styles.rowReverse]}>
            <Pressable style={styles.navButtonSecondary} onPress={() => openWhatsApp(customerPhone)}>
              <Text style={styles.navButtonSecondaryText}>💬 {t("delivery.whatsappCustomer", "וואטסאפ")}</Text>
            </Pressable>
            <Pressable style={styles.navButton} onPress={() => Linking.openURL(`tel:${customerPhone}`)}>
              <Text style={styles.navButtonText}>📞 {t("delivery.callCustomer", "התקשר ללקוח")}</Text>
            </Pressable>
          </View>
        ) : null}

        {isPickedUp && Number.isFinite(order.deliveryAddress?.lat) ? (
          <Pressable style={[styles.navButtonFull, { marginTop: 10 }]} onPress={() => openWaze(order.deliveryAddress.lat, order.deliveryAddress.lng)}>
            <Text style={styles.navButtonText}>🧭 {t("delivery.navigateToCustomer", "נווט ללקוח")}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={[styles.itemsHeaderRow, isRTL && styles.rowReverse]}>
          <View>
            <Text style={styles.label}>{t("earnings.orderItemsTotal", "סה\"כ פריטים")}</Text>
            <Text style={styles.itemsCountValue}>
              {itemsCount} {t("delivery.itemsSuffix", itemsCount === 1 ? "פריט" : "פריטים")}
            </Text>
          </View>
          <Text style={styles.label}>{t("delivery.orderItems", "מוצרים בהזמנה")}</Text>
        </View>

        {(order.items || []).map((item, idx) => (
          <View key={idx} style={styles.itemRow}>
            <View style={[styles.itemHeaderRow, isRTL && styles.rowReverse]}>
              <Text style={styles.itemPrice}>₪{itemLineTotal(item)}</Text>
              <Text style={styles.itemTitle}>
                {item.quantity || 1}x {item.title}
              </Text>
            </View>
            {item.additions?.length ? (
              <Text style={styles.itemDetail}>
                {t("delivery.additions", "תוספות")}: {item.additions.map((a) => `${a.addition}${a.price ? ` (+₪${a.price})` : ""}`).join(", ")}
              </Text>
            ) : null}
            {item.vegetables?.length ? (
              <Text style={styles.itemDetail}>
                {t("delivery.vegetables", "ירקות")}: {item.vegetables.join(", ")}
              </Text>
            ) : null}
            {item.sauces?.length ? (
              <Text style={styles.itemDetail}>
                {t("delivery.sauces", "רטבים")}: {item.sauces.join(", ")}
              </Text>
            ) : null}
            {item.comment ? (
              <Text style={styles.itemDetail}>
                {t("delivery.itemComment", "הערה")}: {item.comment}
              </Text>
            ) : null}
          </View>
        ))}
        {order.comment ? (
          <Text style={styles.orderComment}>
            {t("delivery.orderComment", "הערה להזמנה")}: {order.comment}
          </Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={[styles.paymentBadge, isCash ? styles.paymentBadgeCash : styles.paymentBadgeCard]}>{paymentLabel}</Text>

        <View style={[styles.paymentSummaryRow, isRTL && styles.rowReverse]}>
          <View style={styles.paymentBreakdownCol}>
            <View style={[styles.breakdownRow, isRTL && styles.rowReverse]}>
              <Text style={styles.breakdownValue}>₪{itemsSubtotal}</Text>
              <Text style={styles.breakdownLabel}>{t("earnings.itemsSubtotal", "סכום המוצרים")}</Text>
            </View>
            <View style={[styles.breakdownRow, isRTL && styles.rowReverse]}>
              <Text style={styles.breakdownValue}>₪{order.deliveryFee}</Text>
              <Text style={styles.breakdownLabel}>{t("dashboard.deliveryFeeLabel", "דמי משלוח")}</Text>
            </View>
            <View style={styles.divider} />
            <View style={[styles.breakdownRow, isRTL && styles.rowReverse]}>
              <Text style={styles.breakdownValueBold}>₪{order.totalPrice}</Text>
              <Text style={styles.breakdownLabel}>{t("delivery.orderTotalLabel", "סה\"כ להזמנה")}</Text>
            </View>
          </View>

          <View style={styles.earningCol}>
            <Text style={styles.earningLabel}>{t("delivery.paymentSummary", "סיכום תשלום")}</Text>
            <Text style={styles.earningSubLabel}>{t("delivery.youReceive", "התשלום שיתקבל")}</Text>
            <Text style={styles.earningValue}>{driverEarning != null ? `₪${driverEarning}` : t("delivery.feePending", "יתואם בטלפון")}</Text>
          </View>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {order.delivery?.status === "claimed" && (
        <Pressable style={styles.button} onPress={handleArrived} disabled={actionLoading}>
          {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("delivery.arrivedButton", "הגעתי למסעדה")} ✓</Text>}
        </Pressable>
      )}

      {order.delivery?.status === "arrived_at_restaurant" && (
        <Pressable style={styles.button} onPress={handlePickedUp} disabled={actionLoading}>
          {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("delivery.markPickedUp", "סמן כנאסף")} ✓</Text>}
        </Pressable>
      )}

      {isPickedUp && (
        <>
          {isCash ? (
            <Text style={styles.collectNotice}>
              {t("delivery.collectPrefix", "יש לגבות מהלקוח")}: ₪{order.totalPrice}
            </Text>
          ) : (
            <Text style={styles.paidNotice}>{t("delivery.alreadyPaid", "ההזמנה שולמה מראש")}</Text>
          )}
          {isCash && (
            <View style={[styles.cashRow, isRTL && styles.rowReverse]}>
              <Text style={styles.value}>{t("delivery.cashCollected", "מזומן נאסף")}</Text>
              <Switch value={cashCollected} onValueChange={setCashCollected} trackColor={{ false: "#ddd", true: "#16a34a" }} />
            </View>
          )}
          <Pressable style={styles.button} onPress={handleDelivered} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("delivery.markDelivered", "ההזמנה נמסרה")} ✓</Text>}
          </Pressable>
          <Pressable style={styles.unavailableButton} onPress={() => setSheetOpen(true)} disabled={actionLoading}>
            <Text style={styles.unavailableButtonText}>{t("delivery.reportProblemButton", "דווח על בעיה")} ⚠</Text>
          </Pressable>
        </>
      )}

      <Modal visible={sheetOpen} transparent animationType="fade" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheetOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t("unavailable.title", "לקוח לא זמין")}</Text>
            {customerPhone ? (
              <Pressable style={styles.sheetRow} onPress={() => Linking.openURL(`tel:${customerPhone}`)}>
                <Text style={styles.sheetRowText}>{t("unavailable.callCustomer", "התקשר ללקוח")}</Text>
              </Pressable>
            ) : null}
            {customerPhone ? (
              <Pressable style={styles.sheetRow} onPress={() => Linking.openURL(`sms:${customerPhone}`)}>
                <Text style={styles.sheetRowText}>{t("unavailable.sendMessage", "שלח הודעה")}</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.sheetRow} onPress={() => setSheetOpen(false)}>
              <Text style={styles.sheetRowText}>{t("unavailable.wait", "המתן כמה דקות")}</Text>
            </Pressable>
            {restaurant?.phone ? (
              <Pressable style={styles.sheetRow} onPress={() => Linking.openURL(`tel:${restaurant.phone}`)}>
                <Text style={styles.sheetRowText}>{t("unavailable.contactRestaurant", "צור קשר עם המסעדה")}</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.sheetRow} onPress={handleReportProblem}>
              <Text style={[styles.sheetRowText, styles.sheetRowDanger]}>{t("unavailable.reportProblem", "דווח על תקלה")}</Text>
            </Pressable>
            <Pressable style={styles.sheetCancel} onPress={() => setSheetOpen(false)}>
              <Text style={styles.sheetCancelText}>{t("unavailable.cancel", "ביטול")}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingTop: 60, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  rowReverse: { flexDirection: "row-reverse" },
  emptyText: { color: "#888", fontSize: 15 },

  header: { justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  headerCallButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCallIcon: { fontSize: 16 },
  headerTitleGroup: { flex: 1, alignItems: "flex-end" },
  title: { fontSize: 22, fontWeight: "700" },
  orderNumber: { color: "#888", fontSize: 12, marginTop: 2 },

  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 16, marginBottom: 14, backgroundColor: "#fff" },
  label: { color: "#888", fontSize: 12 },
  value: { fontSize: 16, fontWeight: "600" },
  notes: { color: "#555", marginTop: 4, fontSize: 13 },
  notesWithIcon: { color: "#555", marginTop: 4, fontSize: 13, textAlign: "right" },
  readyByLabel: { color: "#f97316", fontWeight: "700", marginTop: 8, fontSize: 13 },

  restaurantHeaderRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  restaurantLogo: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  restaurantLogoText: { fontSize: 22 },
  restaurantInfo: { flex: 1, alignItems: "flex-end" },
  restaurantName: { fontSize: 18, fontWeight: "700", textAlign: "right" },

  customerName: { fontSize: 17, fontWeight: "700", textAlign: "right" },

  navRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  navButton: { flex: 1, backgroundColor: "#f97316", borderRadius: 8, padding: 12, alignItems: "center" },
  navButtonText: { color: "#fff", fontWeight: "700" },
  navButtonFull: { backgroundColor: "#f97316", borderRadius: 8, padding: 14, alignItems: "center" },
  navButtonSecondary: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, alignItems: "center" },
  navButtonSecondaryText: { color: "#111", fontWeight: "700" },

  itemsHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  itemsCountValue: { fontSize: 15, fontWeight: "700", marginTop: 2 },
  itemRow: { marginTop: 10, borderTopWidth: 1, borderTopColor: "#f2f2f2", paddingTop: 10 },
  itemHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  itemTitle: { fontSize: 15, fontWeight: "700", flex: 1, textAlign: "right" },
  itemPrice: { fontSize: 15, fontWeight: "700", color: "#111" },
  itemDetail: { color: "#666", fontSize: 13, marginTop: 4, textAlign: "right" },
  orderComment: { color: "#b45309", fontWeight: "600", marginTop: 10 },

  paymentBadge: {
    alignSelf: "center",
    fontSize: 15,
    fontWeight: "800",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  paymentBadgeCash: { color: "#9a3412", backgroundColor: "#ffedd5" },
  paymentBadgeCard: { color: "#166534", backgroundColor: "#dcfce7" },

  paymentSummaryRow: { flexDirection: "row", justifyContent: "space-between" },
  paymentBreakdownCol: { flex: 1, justifyContent: "center" },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  breakdownLabel: { color: "#888", fontSize: 13 },
  breakdownValue: { fontSize: 14, fontWeight: "600" },
  breakdownValueBold: { fontSize: 15, fontWeight: "800" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 6 },

  earningCol: { flex: 1, alignItems: "flex-end" },
  earningLabel: { color: "#888", fontSize: 12 },
  earningSubLabel: { color: "#888", fontSize: 12, marginTop: 2 },
  earningValue: { fontSize: 34, fontWeight: "800", color: "#111", marginTop: 4 },

  error: { color: "#c00", marginBottom: 12 },
  button: { backgroundColor: "#16a34a", borderRadius: 10, padding: 15, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  cashRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  collectNotice: { color: "#b45309", fontWeight: "700", fontSize: 15, marginBottom: 10 },
  paidNotice: { color: "#16a34a", fontWeight: "700", fontSize: 15, marginBottom: 10 },
  unavailableButton: { borderWidth: 1.5, borderColor: "#dc2626", borderRadius: 10, padding: 13, alignItems: "center", marginTop: 10 },
  unavailableButtonText: { color: "#dc2626", fontWeight: "700", fontSize: 15 },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 30 },
  sheetTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10, textAlign: "center" },
  sheetRow: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: "#f2f2f2" },
  sheetRowText: { fontSize: 16, textAlign: "center", color: "#111" },
  sheetRowDanger: { color: "#c00" },
  sheetCancel: { paddingVertical: 14, marginTop: 6 },
  sheetCancelText: { fontSize: 16, textAlign: "center", color: "#888", fontWeight: "600" },
});
