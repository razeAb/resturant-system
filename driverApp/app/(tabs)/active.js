import { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, ScrollView, Switch, Linking, Platform, Modal } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { useLang } from "../../src/context/LangContext";
import {
  fetchMyOrders,
  fetchRestaurant,
  markArrived,
  markPickedUp,
  markDelivered,
  markCustomerUnavailable,
} from "../../src/api/driver";
import Text from "../../src/components/RTLText";

const openMaps = (lat, lng, label) => {
  const query = encodeURIComponent(label || `${lat},${lng}`);
  const url = Platform.select({
    ios: `maps://?daddr=${lat},${lng}&q=${query}`,
    android: `google.navigation:q=${lat},${lng}`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  });
  Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`));
};

export default function ActiveDeliveryScreen() {
  const { driver, isLoading: authLoading, refreshDriver } = useAuth();
  const { t, isRTL } = useLang();
  const [order, setOrder] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cashCollected, setCashCollected] = useState(false);
  const [error, setError] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      const [{ orders }, restaurantData] = await Promise.all([fetchMyOrders(), fetchRestaurant()]);
      const active = orders.find((o) =>
        ["claimed", "arrived_at_restaurant", "picked_up"].includes(o.delivery?.status)
      );
      setOrder(active || null);
      setRestaurant(restaurantData);
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

  const isCash = order.paymentDetails?.method === "Cash";

  const paymentLabel = isCash ? t("delivery.cash", "מזומן") : order.paymentDetails?.method === "Card" ? t("delivery.card", "אשראי") : t("delivery.unknown", "לא ידוע");

  const statusLabel =
    order.delivery?.status === "claimed"
      ? t("delivery.statusClaimed", "נלקח")
      : order.delivery?.status === "arrived_at_restaurant"
        ? t("delivery.statusArrived", "הגיע למסעדה")
        : order.delivery?.status === "picked_up"
          ? t("delivery.statusPickedUp", "נאסף")
          : order.delivery?.status === "delivered"
            ? t("delivery.statusDelivered", "נמסר")
            : order.delivery?.status;

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

  const customerPhone = order.user?.phone || order.phone || "";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("delivery.title", "משלוח פעיל")}</Text>
      <Text style={styles.orderNumber}>
        {t("delivery.orderNumber", "מספר הזמנה")}: #{order._id.slice(-6)}
      </Text>

      {order.delivery?.status === "claimed" || order.delivery?.status === "arrived_at_restaurant" ? (
        <View style={styles.card}>
          <Text style={styles.label}>{t("dashboard.restaurantLabel", "מסעדה")}</Text>
          <Text style={styles.value}>{restaurant?.name}</Text>
          <Text style={styles.notes}>{restaurant?.address?.text}</Text>
          <View style={[styles.navRow, isRTL && styles.rowReverse]}>
            {Number.isFinite(restaurant?.address?.lat) && (
              <Pressable
                style={styles.navButton}
                onPress={() => openMaps(restaurant.address.lat, restaurant.address.lng, restaurant.name)}
              >
                <Text style={styles.navButtonText}>{t("delivery.navigateToRestaurant", "נווט למסעדה")}</Text>
              </Pressable>
            )}
            {restaurant?.phone ? (
              <Pressable style={styles.navButtonSecondary} onPress={() => Linking.openURL(`tel:${restaurant.phone}`)}>
                <Text style={styles.navButtonSecondaryText}>{t("delivery.callRestaurant", "התקשר למסעדה")}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.label}>{t("delivery.address", "כתובת")}</Text>
        <Text style={styles.value}>{order.deliveryAddress?.text || t("dashboard.noAddress", "אין כתובת")}</Text>
        {order.deliveryAddress?.notes ? <Text style={styles.notes}>{order.deliveryAddress.notes}</Text> : null}
        {order.delivery?.status === "picked_up" && Number.isFinite(order.deliveryAddress?.lat) ? (
          <Pressable
            style={[styles.navButton, { marginTop: 10 }]}
            onPress={() => openMaps(order.deliveryAddress.lat, order.deliveryAddress.lng, order.deliveryAddress.text)}
          >
            <Text style={styles.navButtonText}>{t("delivery.navigateToCustomer", "נווט ללקוח")}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t("delivery.total", "סה\"כ")}</Text>
        <Text style={styles.value}>₪{order.totalPrice}</Text>
        <Text style={styles.label}>{t("delivery.payment", "תשלום")}</Text>
        <Text style={styles.value}>{paymentLabel}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t("delivery.status", "סטטוס")}</Text>
        <Text style={styles.value}>{statusLabel}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {order.delivery?.status === "claimed" && (
        <Pressable style={styles.button} onPress={handleArrived} disabled={actionLoading}>
          {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("delivery.arrivedButton", "הגעתי למסעדה")}</Text>}
        </Pressable>
      )}

      {order.delivery?.status === "arrived_at_restaurant" && (
        <Pressable style={styles.button} onPress={handlePickedUp} disabled={actionLoading}>
          {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("delivery.markPickedUp", "סמן כנאסף")}</Text>}
        </Pressable>
      )}

      {order.delivery?.status === "picked_up" && (
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
              <Switch value={cashCollected} onValueChange={setCashCollected} />
            </View>
          )}
          <Pressable style={styles.button} onPress={handleDelivered} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("delivery.markDelivered", "סמן כנמסר")}</Text>}
          </Pressable>
          <Pressable style={styles.unavailableButton} onPress={() => setSheetOpen(true)} disabled={actionLoading}>
            <Text style={styles.unavailableButtonText}>{t("delivery.unavailableButton", "לקוח לא זמין")}</Text>
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
  title: { fontSize: 24, fontWeight: "700" },
  orderNumber: { color: "#888", marginBottom: 16 },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 10, padding: 14, marginBottom: 14, backgroundColor: "#fafafa" },
  label: { color: "#888", fontSize: 12, marginTop: 8 },
  value: { fontSize: 16, fontWeight: "600" },
  notes: { color: "#555", marginTop: 4 },
  navRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  navButton: { flex: 1, backgroundColor: "#f97316", borderRadius: 8, padding: 10, alignItems: "center" },
  navButtonText: { color: "#fff", fontWeight: "600" },
  navButtonSecondary: { flex: 1, borderWidth: 1, borderColor: "#111", borderRadius: 8, padding: 10, alignItems: "center" },
  navButtonSecondaryText: { color: "#111", fontWeight: "600" },
  error: { color: "#c00", marginBottom: 12 },
  button: { backgroundColor: "#111", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  cashRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  collectNotice: { color: "#b45309", fontWeight: "700", fontSize: 15, marginBottom: 10 },
  paidNotice: { color: "#16a34a", fontWeight: "700", fontSize: 15, marginBottom: 10 },
  unavailableButton: { borderWidth: 1, borderColor: "#c00", borderRadius: 8, padding: 12, alignItems: "center", marginTop: 10 },
  unavailableButtonText: { color: "#c00", fontWeight: "600" },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 30 },
  sheetTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10, textAlign: "center" },
  sheetRow: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: "#f2f2f2" },
  sheetRowText: { fontSize: 16, textAlign: "center", color: "#111" },
  sheetRowDanger: { color: "#c00" },
  sheetCancel: { paddingVertical: 14, marginTop: 6 },
  sheetCancelText: { fontSize: 16, textAlign: "center", color: "#888", fontWeight: "600" },
});
