import { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator, FlatList, RefreshControl } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { useLang } from "../../src/context/LangContext";
import { fetchEarnings } from "../../src/api/driver";
import Text from "../../src/components/RTLText";

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "");

export default function EarningsScreen() {
  const { driver } = useAuth();
  const { t, isRTL } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

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

  if (!driver) return null;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const payoutLabel = (status) =>
    status === "self_collected"
      ? t("earnings.paidSelf", "נגבה על ידך")
      : status === "owed"
        ? t("earnings.paidOwed", "המסעדה חייבת לך")
        : status === "paid"
          ? t("earnings.paidDone", "שולם")
          : "";

  return (
    <FlatList
      style={styles.container}
      data={data?.deliveries || []}
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
          <Text style={styles.title}>{t("earnings.title", "הכנסות")}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={[styles.statsRow, isRTL && styles.rowReverse]}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>₪{data?.today || 0}</Text>
              <Text style={styles.statLabel}>{t("earnings.today", "היום")}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>₪{data?.week || 0}</Text>
              <Text style={styles.statLabel}>{t("earnings.week", "השבוע")}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>₪{data?.month || 0}</Text>
              <Text style={styles.statLabel}>{t("earnings.month", "החודש")}</Text>
            </View>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t("earnings.noDeliveriesYet", "אין עדיין משלוחים")}</Text>
        </View>
      }
      contentContainerStyle={!data?.deliveries?.length ? styles.flexGrow : { paddingBottom: 20 }}
      renderItem={({ item }) => (
        <View style={[styles.row, isRTL && styles.rowReverse]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{item.restaurantName}</Text>
            <Text style={styles.rowSub}>{fmtDate(item.deliveredAt)}</Text>
          </View>
          <View style={{ alignItems: isRTL ? "flex-start" : "flex-end" }}>
            <Text style={styles.rowAmount}>₪{item.amount}</Text>
            <Text style={styles.rowStatus}>{payoutLabel(item.payoutStatus)}</Text>
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
  title: { fontSize: 24, fontWeight: "700", paddingTop: 60, paddingHorizontal: 20 },
  error: { color: "#c00", paddingHorizontal: 20, marginTop: 8 },
  emptyText: { color: "#888", fontSize: 15 },
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginTop: 16, marginBottom: 10 },
  statCard: { flex: 1, backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#eee", borderRadius: 10, padding: 12, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: { color: "#888", fontSize: 12, marginTop: 2 },
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
  rowStatus: { color: "#888", fontSize: 12, marginTop: 2 },
});
