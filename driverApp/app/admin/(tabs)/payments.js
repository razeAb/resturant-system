import { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, Modal } from "react-native";
import { useLang } from "../../../src/context/LangContext";
import { fetchPayments, markPaymentPaid, fetchAllDrivers } from "../../../src/api/admin";
import Text from "../../../src/components/RTLText";

export default function AdminPaymentsScreen() {
  const { t, isRTL } = useLang();
  const [drivers, setDrivers] = useState([]);
  const [driverId, setDriverId] = useState(null);
  const [paidFilter, setPaidFilter] = useState("all"); // all | paid | unpaid
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [driverPickerOpen, setDriverPickerOpen] = useState(false);

  useEffect(() => {
    fetchAllDrivers()
      .then(({ drivers: d }) => setDrivers(d))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const params = {};
      if (driverId) params.driverId = driverId;
      if (paidFilter !== "all") params.paid = paidFilter;
      const { orders: data } = await fetchPayments(params);
      setOrders(data);
      setError("");
    } catch {
      setError(t("admin.payments.loadError", "לא ניתן היה לטעון את התשלומים"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [driverId, paidFilter, t]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const handleMarkPaid = async (orderId) => {
    setBusyId(orderId);
    try {
      await markPaymentPaid(orderId);
      await load();
    } catch {
      setError(t("admin.payments.actionError", "הפעולה נכשלה"));
    } finally {
      setBusyId(null);
    }
  };

  const payoutLabel = (status) =>
    status === "self_collected"
      ? t("admin.payments.paidSelf", "נגבה על ידי השליח")
      : status === "owed"
        ? t("admin.payments.paidOwed", "המסעדה חייבת")
        : status === "paid"
          ? t("admin.payments.paidDone", "שולם")
          : "";

  const selectedDriverName = drivers.find((d) => d._id === driverId)?.name || t("admin.payments.driverFilterAll", "כל השליחים");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("admin.payments.title", "תשלומים")}</Text>

      <View style={[styles.filterRow, isRTL && styles.rowReverse]}>
        <Pressable style={[styles.filterPill, paidFilter === "all" && styles.filterPillActive]} onPress={() => setPaidFilter("all")}>
          <Text style={[styles.filterPillText, paidFilter === "all" && styles.filterPillTextActive]}>
            {t("admin.payments.filterAll", "הכל")}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterPill, paidFilter === "unpaid" && styles.filterPillActive]}
          onPress={() => setPaidFilter("unpaid")}
        >
          <Text style={[styles.filterPillText, paidFilter === "unpaid" && styles.filterPillTextActive]}>
            {t("admin.payments.filterUnpaid", "לא שולם")}
          </Text>
        </Pressable>
        <Pressable style={[styles.filterPill, paidFilter === "paid" && styles.filterPillActive]} onPress={() => setPaidFilter("paid")}>
          <Text style={[styles.filterPillText, paidFilter === "paid" && styles.filterPillTextActive]}>
            {t("admin.payments.filterPaid", "שולם")}
          </Text>
        </Pressable>
      </View>

      <Pressable style={styles.driverFilterButton} onPress={() => setDriverPickerOpen(true)}>
        <Text style={styles.driverFilterButtonText}>{selectedDriverName}</Text>
      </Pressable>

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
          ListEmptyComponent={<Text style={styles.emptyText}>{t("admin.payments.empty", "אין תשלומים להצגה")}</Text>}
          contentContainerStyle={orders.length === 0 ? styles.flexGrow : { paddingBottom: 30 }}
          renderItem={({ item }) => {
            const isCash = item.paymentDetails?.method === "Cash";
            return (
              <View style={styles.card}>
                <View style={[styles.cardHeader, isRTL && styles.rowReverse]}>
                  <Text style={styles.driverName}>{item.delivery?.driver?.name || "-"}</Text>
                  <Text style={styles.amount}>₪{item.delivery?.driverEarning ?? 0}</Text>
                </View>
                <Text style={styles.meta}>
                  {isCash ? t("delivery.cash", "מזומן") : t("delivery.card", "אשראי")} ·{" "}
                  {item.delivery?.deliveredAt ? new Date(item.delivery.deliveredAt).toLocaleDateString() : "-"}
                </Text>
                <View style={[styles.footerRow, isRTL && styles.rowReverse]}>
                  <Text style={[styles.payoutLabel, item.delivery?.driverPayoutStatus === "owed" && styles.payoutLabelOwed]}>
                    {payoutLabel(item.delivery?.driverPayoutStatus)}
                  </Text>
                  {item.delivery?.driverPayoutStatus === "owed" ? (
                    <Pressable style={styles.markPaidButton} onPress={() => handleMarkPaid(item._id)} disabled={busyId === item._id}>
                      {busyId === item._id ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.markPaidButtonText}>{t("admin.payments.markPaid", "סמן כשולם")}</Text>
                      )}
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal visible={driverPickerOpen} transparent animationType="fade" onRequestClose={() => setDriverPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDriverPickerOpen(false)}>
          <View style={styles.modalCard}>
            <Pressable
              style={styles.driverRow}
              onPress={() => {
                setDriverId(null);
                setDriverPickerOpen(false);
              }}
            >
              <Text style={styles.driverRowText}>{t("admin.payments.driverFilterAll", "כל השליחים")}</Text>
            </Pressable>
            {drivers.map((d) => (
              <Pressable
                key={d._id}
                style={styles.driverRow}
                onPress={() => {
                  setDriverId(d._id);
                  setDriverPickerOpen(false);
                }}
              >
                <Text style={styles.driverRowText}>{d.name}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 16 },
  rowReverse: { flexDirection: "row-reverse" },
  flexGrow: { flexGrow: 1 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  filterPill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: "#ddd" },
  filterPillActive: { backgroundColor: "#111", borderColor: "#111" },
  filterPillText: { fontSize: 13, color: "#333", fontWeight: "600" },
  filterPillTextActive: { color: "#fff" },
  driverFilterButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  driverFilterButtonText: { fontSize: 13, fontWeight: "600", color: "#333" },
  error: { color: "#c00", marginBottom: 10 },
  emptyText: { color: "#888", textAlign: "center", marginTop: 30 },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 10, padding: 14, marginBottom: 10, backgroundColor: "#fafafa" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  driverName: { fontWeight: "700", fontSize: 15 },
  amount: { fontWeight: "700", fontSize: 15 },
  meta: { color: "#666", fontSize: 12, marginBottom: 8 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  payoutLabel: { fontSize: 12, color: "#16a34a", fontWeight: "600" },
  payoutLabelOwed: { color: "#b45309" },
  markPaidButton: { backgroundColor: "#111", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  markPaidButtonText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, maxHeight: "70%" },
  driverRow: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#f2f2f2" },
  driverRowText: { fontSize: 15 },
});
