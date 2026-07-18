import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Switch, FlatList, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { Redirect, router } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { setOnline, fetchAvailableOrders, claimOrder } from "../src/api/driver";

const POLL_INTERVAL_MS = 5000;

export default function DashboardScreen() {
  const { driver, isLoading, logout, refreshDriver, setDriver } = useAuth();
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [claimingId, setClaimingId] = useState(null);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      const { orders: available } = await fetchAvailableOrders();
      setOrders(available);
    } catch {
      // Silent - the next poll tick retries.
    }
  }, []);

  useEffect(() => {
    if (!driver?.online || driver?.currentOrder) {
      setOrders([]);
      return;
    }
    loadOrders();
    const interval = setInterval(loadOrders, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [driver?.online, driver?.currentOrder, loadOrders]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!driver) {
    return <Redirect href="/" />;
  }

  if (driver.currentOrder) {
    const orderId = typeof driver.currentOrder === "string" ? driver.currentOrder : driver.currentOrder._id;
    return <Redirect href={`/delivery/${orderId}`} />;
  }

  const handleToggleOnline = async (value) => {
    setTogglingOnline(true);
    setError("");
    try {
      const { driver: updated } = await setOnline(value);
      setDriver(updated);
    } catch {
      setError("Could not update online status");
    } finally {
      setTogglingOnline(false);
    }
  };

  const handleClaim = async (orderId) => {
    setClaimingId(orderId);
    setError("");
    try {
      await claimOrder(orderId);
      await refreshDriver();
      router.replace(`/delivery/${orderId}`);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not claim order");
      loadOrders();
    } finally {
      setClaimingId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi, {driver.name}</Text>
          <Text style={styles.subtitle}>{driver.online ? "Online" : "Offline"}</Text>
        </View>
        <Switch value={!!driver.online} onValueChange={handleToggleOnline} disabled={togglingOnline} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!driver.online ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Go online to see available deliveries</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No deliveries waiting right now</Text>
            </View>
          }
          contentContainerStyle={orders.length === 0 ? styles.flexGrow : undefined}
          renderItem={({ item }) => (
            <View style={styles.orderCard}>
              <Text style={styles.orderAddress}>{item.deliveryAddress?.text || "No address"}</Text>
              <Text style={styles.orderMeta}>
                ₪{item.totalPrice} · ETA {item.estimatedTime ?? "?"} min
              </Text>
              <Pressable style={styles.claimButton} onPress={() => handleClaim(item._id)} disabled={claimingId === item._id}>
                {claimingId === item._id ? <ActivityIndicator color="#fff" /> : <Text style={styles.claimButtonText}>Claim Delivery</Text>}
              </Pressable>
            </View>
          )}
        />
      )}

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  flexGrow: { flexGrow: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  greeting: { fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#666", marginTop: 2 },
  emptyText: { color: "#888", fontSize: 15 },
  error: { color: "#c00", marginBottom: 8 },
  orderCard: { borderWidth: 1, borderColor: "#eee", borderRadius: 10, padding: 14, marginBottom: 12, backgroundColor: "#fafafa" },
  orderAddress: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  orderMeta: { color: "#555", marginBottom: 10 },
  claimButton: { backgroundColor: "#111", borderRadius: 8, padding: 10, alignItems: "center" },
  claimButtonText: { color: "#fff", fontWeight: "600" },
  logoutButton: { paddingVertical: 16, alignItems: "center" },
  logoutText: { color: "#c00", fontWeight: "600" },
});
