import { useCallback, useEffect, useMemo, useState } from "react";
import { View, StyleSheet, ActivityIndicator, FlatList, RefreshControl, TextInput, Pressable, Platform, Modal } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "../../src/context/AuthContext";
import { useLang } from "../../src/context/LangContext";
import { fetchEarnings } from "../../src/api/driver";
import Text from "../../src/components/RTLText";

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("he-IL") : "");
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : "");
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

// Only Cash and Card are real payment methods in this app - no Bit/Apple Pay to filter by.
const PAYMENT_FILTERS = [
  { key: "all", label: "הכל" },
  { key: "Cash", label: "מזומן", icon: "💵" },
  { key: "Card", label: "כרטיס אשראי", icon: "💳" },
];

function PeriodCard({ label, period, changeLabel, highlighted, ordersSuffix }) {
  const total = period?.total || 0;
  const count = period?.count || 0;
  const changePct = period?.changePct;
  const isUp = typeof changePct === "number" && changePct >= 0;
  return (
    <View style={[styles.statCard, highlighted && styles.statCardHighlighted]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>₪{total}</Text>
      <Text style={styles.statCount}>
        {count} {ordersSuffix}
      </Text>
      {typeof changePct === "number" ? (
        <Text style={[styles.statChange, isUp ? styles.statChangeUp : styles.statChangeDown]}>
          {isUp ? "▲" : "▼"} {Math.abs(changePct)}% {changeLabel}
        </Text>
      ) : null}
    </View>
  );
}

export default function EarningsScreen() {
  const { driver } = useAuth();
  const { t, isRTL } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [activePicker, setActivePicker] = useState(null); // "from" | "to" | null
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpand = (orderId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const load = useCallback(async () => {
    try {
      const result = await fetchEarnings();
      setData(result);
      setError("");
    } catch {
      setError(t("earnings.loadError", "לא ניתן היה לטעון את ההכנסות"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredDeliveries = useMemo(() => {
    const list = data?.deliveries || [];
    const q = search.trim().toLowerCase();
    return list.filter((item) => {
      if (paymentFilter !== "all" && item.paymentMethod !== paymentFilter) return false;
      if (q && !`${item.restaurantName} ${item.orderNumber}`.toLowerCase().includes(q)) return false;
      const ts = item.timestamp ? new Date(item.timestamp) : null;
      if (fromDate && (!ts || ts < startOfDay(fromDate))) return false;
      if (toDate && (!ts || ts > endOfDay(toDate))) return false;
      return true;
    });
  }, [data, paymentFilter, search, fromDate, toDate]);

  const dateRangeSummary = useMemo(() => {
    if (!fromDate && !toDate) return null;
    const total = filteredDeliveries.filter((d) => d.status === "delivered").reduce((sum, d) => sum + d.amount, 0);
    return { total, count: filteredDeliveries.length };
  }, [filteredDeliveries, fromDate, toDate]);

  if (!driver) return null;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const statusInfo = (item) => {
    if (item.status === "cancelled") {
      const label =
        item.deliveryStatus === "customer_unavailable"
          ? t("delivery.statusCustomerUnavailable", "לקוח לא זמין")
          : item.deliveryStatus === "returned_to_restaurant"
            ? t("delivery.statusReturned", "הוחזר למסעדה")
            : t("earnings.statusCancelled", "בוטלה");
      return { label, badge: styles.badgeCancelled, text: styles.badgeCancelledText };
    }
    return item.payoutStatus === "owed"
      ? { label: t("earnings.statusPending", "ממתין"), badge: styles.badgePending, text: styles.badgePendingText }
      : { label: t("earnings.statusPaid", "שולם"), badge: styles.badgePaid, text: styles.badgePaidText };
  };

  const paymentLabel = (method) => (method === "Cash" ? t("delivery.cash", "מזומן") : method === "Card" ? t("delivery.card", "כרטיס אשראי") : method || "");
  const paymentIcon = (method) => (method === "Cash" ? "💵" : method === "Card" ? "💳" : "");

  // iOS has no native popup dialog for this - the library just renders whatever `display`
  // is inline wherever it's placed, which is why "inline"/full-calendar looked broken sitting
  // in the page flow. Android's "default" already opens its own native dialog on its own.
  // Spinner mode fires onChange continuously while scrolling, so only Android's onChange
  // (a single confirm/cancel event) should auto-close the picker.
  const handlePickerChange = (which) => (event, selected) => {
    if (Platform.OS === "android") {
      setActivePicker(null);
      if (event.type === "dismissed" || !selected) return;
    }
    if (selected) {
      if (which === "from") setFromDate(selected);
      else setToDate(selected);
    }
  };

  return (
    <FlatList
      style={styles.container}
      data={filteredDeliveries}
      keyExtractor={(item) => String(item.orderId)}
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
          <View style={styles.header}>
            <Text style={styles.title}>{t("earnings.title", "הכנסות")}</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.statsRow}>
            <PeriodCard
              highlighted
              label={t("earnings.today", "היום")}
              period={data?.today}
              changeLabel={t("earnings.vsYesterday", "מהיום אתמול")}
              ordersSuffix={t("earnings.ordersSuffix", "הזמנות")}
            />
            <PeriodCard
              label={t("earnings.week", "השבוע")}
              period={data?.week}
              changeLabel={t("earnings.vsLastWeek", "מהשבוע שעבר")}
              ordersSuffix={t("earnings.ordersSuffix", "הזמנות")}
            />
            <PeriodCard
              label={t("earnings.month", "החודש")}
              period={data?.month}
              changeLabel={t("earnings.vsLastMonth", "מהחודש שעבר")}
              ordersSuffix={t("earnings.ordersSuffix", "הזמנות")}
            />
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <TextInput
                style={styles.searchInput}
                placeholder={t("earnings.searchPlaceholder", "חיפוש הזמנה...")}
                placeholderTextColor="#999"
                value={search}
                onChangeText={setSearch}
                textAlign={isRTL ? "right" : "left"}
              />
              <Text style={styles.searchIcon}>🔍</Text>
            </View>
          </View>

          <View style={[styles.chipsRow, isRTL && styles.rowReverse]}>
            {PAYMENT_FILTERS.map((f) => {
              const active = paymentFilter === f.key;
              return (
                <Pressable key={f.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setPaymentFilter(f.key)}>
                  {f.icon ? <Text style={active ? styles.chipTextActive : styles.chipText}>{f.icon} </Text> : null}
                  <Text style={active ? styles.chipTextActive : styles.chipText}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.dateRow, isRTL && styles.rowReverse]}>
            <Pressable style={styles.dateChip} onPress={() => setActivePicker("from")}>
              <Text style={fromDate ? styles.dateChipTextActive : styles.dateChipText}>
                {fromDate ? fmtDate(fromDate) : t("earnings.fromDate", "מתאריך")}
              </Text>
            </Pressable>
            <Pressable style={styles.dateChip} onPress={() => setActivePicker("to")}>
              <Text style={toDate ? styles.dateChipTextActive : styles.dateChipText}>{toDate ? fmtDate(toDate) : t("earnings.toDate", "עד תאריך")}</Text>
            </Pressable>
            {fromDate || toDate ? (
              <Pressable
                style={styles.dateClear}
                onPress={() => {
                  setFromDate(null);
                  setToDate(null);
                }}
              >
                <Text style={styles.dateClearText}>✕</Text>
              </Pressable>
            ) : null}
          </View>

          {dateRangeSummary ? (
            <View style={styles.rangeSummary}>
              <Text style={styles.rangeSummaryText}>
                {dateRangeSummary.count} {t("earnings.ordersSuffix", "הזמנות")} · ₪{dateRangeSummary.total}
              </Text>
            </View>
          ) : null}

          {activePicker && Platform.OS === "android" ? (
            <DateTimePicker
              value={(activePicker === "from" ? fromDate : toDate) || new Date()}
              mode="date"
              display="default"
              onChange={handlePickerChange(activePicker)}
            />
          ) : null}

          {activePicker && Platform.OS === "ios" ? (
            <Modal transparent animationType="fade" onRequestClose={() => setActivePicker(null)}>
              <Pressable style={styles.pickerBackdrop} onPress={() => setActivePicker(null)}>
                <Pressable style={styles.pickerSheet} onPress={(e) => e.stopPropagation()}>
                  <DateTimePicker
                    value={(activePicker === "from" ? fromDate : toDate) || new Date()}
                    mode="date"
                    display="spinner"
                    accentColor="#111"
                    locale="he"
                    onChange={handlePickerChange(activePicker)}
                  />
                  <Pressable style={styles.pickerDoneButton} onPress={() => setActivePicker(null)}>
                    <Text style={styles.pickerDoneText}>{t("common.done", "סיום")}</Text>
                  </Pressable>
                </Pressable>
              </Pressable>
            </Modal>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t("earnings.noDeliveriesYet", "אין עדיין משלוחים")}</Text>
        </View>
      }
      contentContainerStyle={!filteredDeliveries.length ? styles.flexGrow : { paddingBottom: 20 }}
      renderItem={({ item }) => {
        const status = statusInfo(item);
        const expanded = expandedIds.has(item.orderId);
        return (
          <Pressable style={styles.card} onPress={() => toggleExpand(item.orderId)}>
            <View style={[styles.cardRow, isRTL && styles.rowReverse]}>
              <View style={styles.cardLeft}>
                <Text style={styles.timeText}>{fmtTime(item.timestamp)}</Text>
                <Text style={styles.dateText}>{fmtDate(item.timestamp)}</Text>
                <View style={[styles.badge, status.badge]}>
                  <Text style={[styles.badgeText, status.text]}>{status.label}</Text>
                </View>
              </View>
              <View style={styles.cardMiddle}>
                <Text style={styles.restaurantName} numberOfLines={1}>
                  {item.restaurantName}
                </Text>
                <Text style={styles.orderNumber}>
                  {t("earnings.orderPrefix", "משלוח")} #{item.orderNumber}
                </Text>
                {item.zoneName ? (
                  <Text style={styles.zoneName} numberOfLines={1}>
                    📍 {item.zoneName}
                  </Text>
                ) : null}
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.amount}>₪{item.amount}</Text>
                {item.paymentMethod ? (
                  <Text style={styles.paymentLabel}>
                    {paymentLabel(item.paymentMethod)} {paymentIcon(item.paymentMethod)}
                  </Text>
                ) : null}
              </View>
            </View>

            {expanded ? (
              <View style={styles.detailsSection}>
                {item.customerName ? (
                  <Text style={styles.detailLine}>
                    {t("earnings.customer", "לקוח")}: {item.customerName}
                    {item.phone ? ` · ${item.phone}` : ""}
                  </Text>
                ) : null}
                {item.deliveryAddress?.text ? <Text style={styles.detailLine}>{t("delivery.address", "כתובת")}: {item.deliveryAddress.text}</Text> : null}
                {Number.isFinite(item.totalPrice) ? (
                  <Text style={styles.detailLine}>
                    {t("delivery.total", "סה\"כ הזמנה")}: ₪{item.totalPrice}
                  </Text>
                ) : null}

                {item.items?.length ? (
                  <View style={styles.detailItems}>
                    <Text style={styles.detailItemsTitle}>{t("delivery.orderItems", "מוצרים בהזמנה")}</Text>
                    {item.items.map((it, idx) => (
                      <View key={idx} style={styles.detailItemRow}>
                        <Text style={styles.detailItemText}>
                          {it.quantity || 1}x {it.title}
                        </Text>
                        {it.additions?.length ? (
                          <Text style={styles.detailItemSub}>{t("delivery.additions", "תוספות")}: {it.additions.map((a) => a.addition || a.name).join(", ")}</Text>
                        ) : null}
                        {it.comment ? <Text style={styles.detailItemSub}>{it.comment}</Text> : null}
                      </View>
                    ))}
                  </View>
                ) : null}

                <Pressable style={styles.collapseButton} onPress={() => toggleExpand(item.orderId)}>
                  <Text style={styles.collapseButtonText}>{t("earnings.collapse", "סגור")} ▲</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.expandHint}>{t("earnings.tapForDetails", "הקש להצגת פרטים")} ▼</Text>
            )}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },
  flexGrow: { flexGrow: 1 },
  rowReverse: { flexDirection: "row-reverse" },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: { fontSize: 26, fontWeight: "700" },
  error: { color: "#c00", paddingHorizontal: 20, marginTop: 8 },
  emptyText: { color: "#888", fontSize: 15 },

  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginTop: 16, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 10, alignItems: "center" },
  statCardHighlighted: { borderColor: "#16a34a", borderWidth: 1.5 },
  statLabel: { color: "#888", fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 17, fontWeight: "700" },
  statCount: { color: "#888", fontSize: 11, marginTop: 2 },
  statChange: { fontSize: 10, marginTop: 4, textAlign: "center" },
  statChangeUp: { color: "#16a34a" },
  statChangeDown: { color: "#c00" },

  searchRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginBottom: 12, alignItems: "center" },
  searchBox: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fafafa",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 14 },
  searchIcon: { fontSize: 14, marginStart: 6 },

  chipsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 12, flexWrap: "wrap" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: "#111", borderColor: "#111" },
  chipText: { fontSize: 13, color: "#333", fontWeight: "600" },
  chipTextActive: { fontSize: 13, color: "#fff", fontWeight: "600" },

  dateRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 8, alignItems: "center" },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  dateChipText: { fontSize: 13, color: "#555" },
  dateChipTextActive: { fontSize: 13, color: "#111", fontWeight: "700" },
  dateClear: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#f2f2f2" },
  dateClearText: { fontSize: 13, color: "#555" },

  rangeSummary: { paddingHorizontal: 20, marginBottom: 16 },
  rangeSummaryText: { fontSize: 13, color: "#555", fontWeight: "600" },

  pickerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  pickerSheet: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 20, paddingTop: 8 },
  pickerDoneButton: { backgroundColor: "#111", borderRadius: 8, padding: 14, alignItems: "center", marginHorizontal: 20, marginTop: 8 },
  pickerDoneText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  cardRow: { flexDirection: "row", gap: 10 },
  cardLeft: { minWidth: 60 },
  timeText: { fontSize: 13, fontWeight: "700" },
  dateText: { color: "#888", fontSize: 11, marginTop: 2 },
  badge: { alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  badgePaid: { backgroundColor: "#dcfce7" },
  badgePaidText: { color: "#166534" },
  badgePending: { backgroundColor: "#ffedd5" },
  badgePendingText: { color: "#9a3412" },
  badgeCancelled: { backgroundColor: "#fee2e2" },
  badgeCancelledText: { color: "#991b1b" },
  cardMiddle: { flex: 1 },
  restaurantName: { fontSize: 15, fontWeight: "700" },
  orderNumber: { color: "#888", fontSize: 12, marginTop: 2 },
  zoneName: { color: "#888", fontSize: 12, marginTop: 2 },
  cardRight: { alignItems: "flex-end", justifyContent: "center" },
  amount: { fontSize: 17, fontWeight: "700" },
  paymentLabel: { color: "#888", fontSize: 12, marginTop: 4 },

  expandHint: { color: "#aaa", fontSize: 11, textAlign: "center", marginTop: 10 },
  detailsSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#eee" },
  detailLine: { color: "#333", fontSize: 13, marginBottom: 6 },
  detailItems: { marginTop: 4 },
  detailItemsTitle: { color: "#888", fontSize: 12, fontWeight: "700", marginBottom: 6 },
  detailItemRow: { marginBottom: 8 },
  detailItemText: { fontSize: 13, fontWeight: "600" },
  detailItemSub: { color: "#666", fontSize: 12, marginTop: 1 },
  collapseButton: { alignItems: "center", paddingVertical: 10, marginTop: 4 },
  collapseButtonText: { color: "#555", fontSize: 13, fontWeight: "600" },
});
