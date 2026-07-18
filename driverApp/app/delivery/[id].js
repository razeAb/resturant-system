import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, Switch } from "react-native";
import { Redirect, useLocalSearchParams, router } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { fetchMyOrders, markPickedUp, markDelivered } from "../../src/api/driver";

export default function ActiveDeliveryScreen() {
  const { id } = useLocalSearchParams();
  const { driver, isLoading: authLoading, refreshDriver } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cashCollected, setCashCollected] = useState(false);
  const [error, setError] = useState("");

  const loadOrder = useCallback(async () => {
    try {
      const { orders } = await fetchMyOrders();
      const active = orders.find((o) => o._id === id) || orders.find((o) => ["claimed", "picked_up"].includes(o.delivery?.status));
      setOrder(active || null);
    } catch {
      setError("Could not load delivery details");
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  if (!driver) {
    return <Redirect href="/" />;
  }

  if (!order) {
    return <Redirect href="/dashboard" />;
  }

  const isCash = order.paymentDetails?.method === "Cash";

  const handlePickedUp = async () => {
    setActionLoading(true);
    setError("");
    try {
      const { order: updated } = await markPickedUp(order._id);
      setOrder(updated);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not mark picked up");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelivered = async () => {
    if (isCash && !cashCollected) {
      setError("Confirm cash collected before finishing");
      return;
    }
    setActionLoading(true);
    setError("");
    try {
      await markDelivered(order._id, cashCollected);
      await refreshDriver();
      router.replace("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not mark delivered");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Active Delivery</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Address</Text>
        <Text style={styles.value}>{order.deliveryAddress?.text || "No address"}</Text>
        {order.deliveryAddress?.notes ? <Text style={styles.notes}>{order.deliveryAddress.notes}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Total</Text>
        <Text style={styles.value}>₪{order.totalPrice}</Text>
        <Text style={styles.label}>Payment</Text>
        <Text style={styles.value}>{order.paymentDetails?.method || "Unknown"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{order.delivery?.status}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {order.delivery?.status === "claimed" && (
        <Pressable style={styles.button} onPress={handlePickedUp} disabled={actionLoading}>
          {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Mark Picked Up</Text>}
        </Pressable>
      )}

      {order.delivery?.status === "picked_up" && (
        <>
          {isCash && (
            <View style={styles.cashRow}>
              <Text style={styles.value}>Cash collected</Text>
              <Switch value={cashCollected} onValueChange={setCashCollected} />
            </View>
          )}
          <Pressable style={styles.button} onPress={handleDelivered} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Mark Delivered</Text>}
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingTop: 60, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 20 },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 10, padding: 14, marginBottom: 14, backgroundColor: "#fafafa" },
  label: { color: "#888", fontSize: 12, marginTop: 8 },
  value: { fontSize: 16, fontWeight: "600" },
  notes: { color: "#555", marginTop: 4 },
  error: { color: "#c00", marginBottom: 12 },
  button: { backgroundColor: "#111", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  cashRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
});
