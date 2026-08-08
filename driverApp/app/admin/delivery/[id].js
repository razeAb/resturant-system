import { useCallback, useEffect, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking, Alert, Modal } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import { useLang } from "../../../src/context/LangContext";
import {
  fetchDeliveryDetail,
  fetchAllDrivers,
  assignDriverToDelivery,
  unassignDriver,
  cancelDelivery,
  setDeliveryStatus,
} from "../../../src/api/admin";
import { buildDeliveryMapHtml } from "../../../src/utils/deliveryMapHtml";
import Text from "../../../src/components/RTLText";

const STATUS_OPTIONS = ["unassigned", "claimed", "arrived_at_restaurant", "picked_up", "delivered", "customer_unavailable", "canceled"];

const STATUS_KEY = {
  unassigned: "statusBroadcasting",
  claimed: "statusClaimed",
  arrived_at_restaurant: "statusArrived",
  picked_up: "statusPickedUp",
  delivered: "statusDelivered",
  canceled: "statusCanceled",
  customer_unavailable: "statusCustomerUnavailable",
};

const TIMELINE_FIELDS = [
  { key: "claimedAt", label: "Claimed" },
  { key: "arrivedAt", label: "Arrived" },
  { key: "pickedUpAt", label: "Picked up" },
  { key: "deliveredAt", label: "Delivered" },
];

export default function AdminDeliveryDetailScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useLang();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [statusOpen, setStatusOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const { order: data } = await fetchDeliveryDetail(id);
      setOrder(data);
      setError("");
    } catch {
      setError(t("admin.deliveryDetail.actionError", "הפעולה נכשלה"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const showActionError = (err) => {
    Alert.alert(t("admin.deliveryDetail.actionError", "הפעולה נכשלה"), err?.response?.data?.message || "");
  };

  const openAssignModal = async () => {
    setAssignOpen(true);
    try {
      const { drivers } = await fetchAllDrivers();
      setAvailableDrivers(drivers.filter((d) => d.online && !d.currentOrder && d.active !== false));
    } catch {
      setAvailableDrivers([]);
    }
  };

  const handleAssign = async (driverId) => {
    setActionLoading(true);
    try {
      await assignDriverToDelivery(id, driverId);
      setAssignOpen(false);
      await load();
    } catch (err) {
      showActionError(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnassign = async () => {
    setActionLoading(true);
    try {
      await unassignDriver(id);
      await load();
    } catch (err) {
      showActionError(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(t("admin.deliveryDetail.confirmCancel", "לבטל את המשלוח?"), "", [
      { text: t("unavailable.cancel", "ביטול"), style: "cancel" },
      {
        text: t("admin.deliveryDetail.cancel", "בטל משלוח"),
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            await cancelDelivery(id);
            await load();
          } catch (err) {
            showActionError(err);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleStatusChange = async (status) => {
    setStatusOpen(false);
    setActionLoading(true);
    try {
      await setDeliveryStatus(id, status);
      await load();
    } catch (err) {
      showActionError(err);
    } finally {
      setActionLoading(false);
    }
  };

  const mapHtml = useMemo(
    () =>
      buildDeliveryMapHtml({
        restaurantLat: order?.restaurant?.address?.lat,
        restaurantLng: order?.restaurant?.address?.lng,
        customerLat: order?.deliveryAddress?.lat,
        customerLng: order?.deliveryAddress?.lng,
      }),
    [order]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  const isCash = order.paymentDetails?.method === "Cash";
  const statusKey = STATUS_KEY[order.delivery?.status] || "statusBroadcasting";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("admin.deliveryDetail.title", "פרטי משלוח")}</Text>
      <Text style={styles.orderNumber}>#{order._id.slice(-6)}</Text>

      <View style={styles.mapWrap}>
        <WebView source={{ html: mapHtml }} style={styles.map} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t("admin.deliveryDetail.restaurant", "מסעדה")}</Text>
        <Text style={styles.value}>{order.restaurant?.name}</Text>
        <Text style={styles.notes}>{order.restaurant?.address?.text}</Text>
        {order.restaurant?.phone ? (
          <Pressable style={styles.callButton} onPress={() => Linking.openURL(`tel:${order.restaurant.phone}`)}>
            <Text style={styles.callButtonText}>{t("admin.deliveryDetail.callRestaurant", "התקשר למסעדה")}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t("admin.deliveryDetail.customer", "לקוח")}</Text>
        <Text style={styles.value}>{order.customerName || "-"}</Text>
        <Text style={styles.notes}>{order.deliveryAddress?.text}</Text>
        {order.phone ? (
          <Pressable style={styles.callButton} onPress={() => Linking.openURL(`tel:${order.phone}`)}>
            <Text style={styles.callButtonText}>{t("admin.deliveryDetail.callCustomer", "התקשר ללקוח")}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t("delivery.total", 'סה"כ')}</Text>
        <Text style={styles.value}>
          ₪{order.totalPrice} · {isCash ? t("delivery.cash", "מזומן") : t("delivery.card", "אשראי")}
        </Text>
        <Text style={styles.label}>{t("delivery.status", "סטטוס")}</Text>
        <Text style={styles.value}>{t(`admin.deliveries.${statusKey}`, order.delivery?.status)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t("admin.deliveryDetail.assignedDriver", "שליח משויך")}</Text>
        {order.delivery?.driver ? (
          <>
            <Text style={styles.value}>{order.delivery.driver.name}</Text>
            {order.delivery.driver.phone ? (
              <Pressable style={styles.callButton} onPress={() => Linking.openURL(`tel:${order.delivery.driver.phone}`)}>
                <Text style={styles.callButtonText}>{t("admin.deliveryDetail.callDriver", "התקשר לשליח")}</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.secondaryButton} onPress={handleUnassign} disabled={actionLoading}>
              <Text style={styles.secondaryButtonText}>{t("admin.deliveryDetail.unassign", "בטל שיוך")}</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.primaryButton} onPress={openAssignModal} disabled={actionLoading}>
            <Text style={styles.primaryButtonText}>{t("admin.deliveryDetail.assignDriver", "שייך שליח")}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t("admin.deliveryDetail.timeline", "היסטוריית אירועים")}</Text>
        {TIMELINE_FIELDS.filter((f) => order.delivery?.[f.key]).map((f) => (
          <Text key={f.key} style={styles.timelineRow}>
            {f.label}: {new Date(order.delivery[f.key]).toLocaleString()}
          </Text>
        ))}
      </View>

      <Pressable style={styles.secondaryButton} onPress={() => setStatusOpen(true)} disabled={actionLoading}>
        <Text style={styles.secondaryButtonText}>{t("admin.deliveryDetail.changeStatus", "שנה סטטוס")}</Text>
      </Pressable>

      <Pressable style={styles.dangerButton} onPress={handleCancel} disabled={actionLoading}>
        {actionLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.dangerButtonText}>{t("admin.deliveryDetail.cancel", "בטל משלוח")}</Text>
        )}
      </Pressable>

      <Modal visible={assignOpen} transparent animationType="fade" onRequestClose={() => setAssignOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAssignOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("admin.deliveryDetail.assignDriver", "שייך שליח")}</Text>
            {availableDrivers.length === 0 ? (
              <Text style={styles.emptyText}>{t("admin.deliveryDetail.noDriverAvailable", "אין שליחים פנויים לשיוך")}</Text>
            ) : (
              availableDrivers.map((d) => (
                <Pressable key={d._id} style={styles.driverRow} onPress={() => handleAssign(d._id)} disabled={actionLoading}>
                  <Text style={styles.driverRowText}>{d.name}</Text>
                </Pressable>
              ))
            )}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={statusOpen} transparent animationType="fade" onRequestClose={() => setStatusOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setStatusOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("admin.deliveryDetail.changeStatus", "שנה סטטוס")}</Text>
            {STATUS_OPTIONS.map((s) => (
              <Pressable key={s} style={styles.driverRow} onPress={() => handleStatusChange(s)} disabled={actionLoading}>
                <Text style={styles.driverRowText}>{t(`admin.deliveries.${STATUS_KEY[s] || s}`, s)}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, paddingBottom: 40, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "700" },
  orderNumber: { color: "#888", marginBottom: 12 },
  error: { color: "#c00" },
  mapWrap: { height: 180, borderRadius: 12, overflow: "hidden", backgroundColor: "#f2f2f2", marginBottom: 14 },
  map: { flex: 1 },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 10, padding: 14, marginBottom: 12, backgroundColor: "#fafafa" },
  label: { color: "#888", fontSize: 12, marginTop: 6 },
  value: { fontSize: 16, fontWeight: "600" },
  notes: { color: "#555", marginTop: 2 },
  callButton: { backgroundColor: "#f97316", borderRadius: 8, padding: 10, alignItems: "center", marginTop: 10 },
  callButtonText: { color: "#fff", fontWeight: "600" },
  primaryButton: { backgroundColor: "#111", borderRadius: 8, padding: 12, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "600" },
  secondaryButton: { borderWidth: 1, borderColor: "#111", borderRadius: 8, padding: 12, alignItems: "center", marginTop: 10, marginBottom: 10 },
  secondaryButtonText: { color: "#111", fontWeight: "600" },
  dangerButton: { backgroundColor: "#c00", borderRadius: 8, padding: 14, alignItems: "center" },
  dangerButtonText: { color: "#fff", fontWeight: "700" },
  timelineRow: { fontSize: 13, color: "#555", marginTop: 4 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, maxHeight: "70%" },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  emptyText: { color: "#888", padding: 8 },
  driverRow: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#f2f2f2" },
  driverRowText: { fontSize: 15 },
});
