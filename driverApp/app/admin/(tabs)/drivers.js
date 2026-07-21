import { useCallback, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  Switch,
  Linking,
} from "react-native";
import { useLang } from "../../../src/context/LangContext";
import {
  fetchAllDrivers,
  createDriverAdmin,
  updateDriverAdmin,
  forceDriverOffline,
  resetDriverPassword,
  updateDriverZonesAdmin,
  searchSettlementsAdmin,
  fetchSettlementBoundaryAdmin,
  fetchDeliveries,
  assignDriverToDelivery,
} from "../../../src/api/admin";
import Text from "../../../src/components/RTLText";

export default function AdminDriversScreen() {
  const { t, isRTL } = useLang();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", phone: "", username: "", password: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [assignTarget, setAssignTarget] = useState(null);
  const [assignableDeliveries, setAssignableDeliveries] = useState([]);
  const [assigningId, setAssigningId] = useState(null);

  const [zonesTarget, setZonesTarget] = useState(null);
  const [zonesDraft, setZonesDraft] = useState([]);
  const [zoneQuery, setZoneQuery] = useState("");
  const [zoneSearchResults, setZoneSearchResults] = useState([]);
  const [zoneSearching, setZoneSearching] = useState(false);
  const [addingZonePlaceId, setAddingZonePlaceId] = useState(null);
  const [savingZones, setSavingZones] = useState(false);

  const load = useCallback(async () => {
    try {
      const { drivers: data } = await fetchAllDrivers();
      setDrivers(data);
      setError("");
    } catch {
      setError(t("admin.drivers.actionError", "הפעולה נכשלה"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const mergeDriver = (id, updated) => {
    setDrivers((list) => list.map((d) => (d._id === id ? { ...d, ...updated } : d)));
  };

  const handleCreateDriver = async () => {
    setCreateError("");
    if (!createForm.name.trim() || !createForm.username.trim() || createForm.password.length < 4) {
      setCreateError(t("admin.drivers.createValidationError", "שם, שם משתמש וסיסמה (לפחות 4 תווים) נדרשים"));
      return;
    }
    setCreating(true);
    try {
      const { driver } = await createDriverAdmin({
        name: createForm.name.trim(),
        phone: createForm.phone.trim(),
        username: createForm.username.trim(),
        password: createForm.password,
      });
      setDrivers((list) => [{ ...driver, stats: { completed: 0, cancelled: 0, earnings: 0 } }, ...list]);
      setCreateOpen(false);
      setCreateForm({ name: "", phone: "", username: "", password: "" });
    } catch (err) {
      setCreateError(err?.response?.data?.message || t("admin.drivers.actionError", "הפעולה נכשלה"));
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (driver) => {
    setBusyId(driver._id);
    try {
      const { driver: updated } = await updateDriverAdmin(driver._id, { active: driver.active === false });
      mergeDriver(driver._id, updated);
    } catch {
      setError(t("admin.drivers.actionError", "הפעולה נכשלה"));
    } finally {
      setBusyId(null);
    }
  };

  const handleForceOffline = async (driver) => {
    setBusyId(driver._id);
    try {
      const { driver: updated } = await forceDriverOffline(driver._id);
      mergeDriver(driver._id, updated);
    } catch {
      setError(t("admin.drivers.actionError", "הפעולה נכשלה"));
    } finally {
      setBusyId(null);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget || newPassword.length < 4) return;
    setBusyId(resetTarget._id);
    try {
      await resetDriverPassword(resetTarget._id, newPassword);
      setResetTarget(null);
      setNewPassword("");
    } catch {
      setError(t("admin.drivers.actionError", "הפעולה נכשלה"));
    } finally {
      setBusyId(null);
    }
  };

  const openAssignModal = async (driver) => {
    setAssignTarget(driver);
    setAssignableDeliveries([]);
    try {
      const { orders } = await fetchDeliveries("active");
      setAssignableDeliveries(orders.filter((o) => !o.delivery?.driver));
    } catch {
      setAssignableDeliveries([]);
    }
  };

  const handleAssignDelivery = async (orderId) => {
    setAssigningId(orderId);
    try {
      await assignDriverToDelivery(orderId, assignTarget._id);
      setAssignTarget(null);
      await load();
    } catch {
      setError(t("admin.drivers.actionError", "הפעולה נכשלה"));
    } finally {
      setAssigningId(null);
    }
  };

  const openZonesModal = (driver) => {
    setZonesTarget(driver);
    setZonesDraft((driver.zones || []).filter((z) => z.placeId).map((z) => ({ ...z })));
    setZoneQuery("");
    setZoneSearchResults([]);
  };

  useEffect(() => {
    const q = zoneQuery.trim();
    if (q.length < 2) {
      setZoneSearchResults([]);
      return;
    }
    setZoneSearching(true);
    const handle = setTimeout(async () => {
      try {
        setZoneSearchResults(await searchSettlementsAdmin(q));
      } catch {
        setZoneSearchResults([]);
      } finally {
        setZoneSearching(false);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [zoneQuery]);

  const zoneSuggestions = zoneSearchResults.filter((r) => !zonesDraft.some((z) => z.placeId === r.placeId));

  const handleAddZone = async (result) => {
    setAddingZonePlaceId(result.placeId);
    let boundary = null;
    try {
      const res = await fetchSettlementBoundaryAdmin(result.lat, result.lng);
      boundary = res.geojson;
    } catch {
      // Purely cosmetic - the zone still gets added without an outline if this fails.
    }
    setZonesDraft((prev) => [
      ...prev,
      { placeId: result.placeId, name: result.name, lat: result.lat, lng: result.lng, active: true, boundary },
    ]);
    setZoneQuery("");
    setZoneSearchResults([]);
    setAddingZonePlaceId(null);
  };

  const handleToggleZoneActive = (placeId) => {
    setZonesDraft((prev) => prev.map((z) => (z.placeId === placeId ? { ...z, active: z.active === false } : z)));
  };

  const handleRemoveZone = (placeId) => {
    setZonesDraft((prev) => prev.filter((z) => z.placeId !== placeId));
  };

  const handleSaveZones = async () => {
    setSavingZones(true);
    try {
      const { driver: updated } = await updateDriverZonesAdmin(zonesTarget._id, zonesDraft);
      mergeDriver(zonesTarget._id, updated);
      setZonesTarget(null);
    } catch {
      setError(t("admin.drivers.actionError", "הפעולה נכשלה"));
    } finally {
      setSavingZones(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, isRTL && styles.rowReverse]}>
        <Text style={styles.title}>{t("admin.drivers.title", "שליחים")}</Text>
        <Pressable style={styles.addButton} onPress={() => setCreateOpen(true)}>
          <Text style={styles.addButtonText}>{t("admin.drivers.addDriver", "+ הוסף שליח")}</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={drivers}
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
        contentContainerStyle={{ paddingBottom: 30 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.cardHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.driverName}>{item.name}</Text>
              <Text style={item.online ? styles.onlineDot : styles.offlineDot}>{item.online ? "● מחובר" : "○ לא מחובר"}</Text>
            </View>
            <Text style={styles.meta}>
              {item.phone || "-"} {item.vehicleType ? `· ${item.vehicleType}` : ""}
            </Text>
            <Text style={styles.meta}>
              {t("admin.drivers.lastActive", "פעילות אחרונה")}:{" "}
              {item.lastSeenAt ? new Date(item.lastSeenAt).toLocaleString() : t("admin.drivers.never", "מעולם לא")}
            </Text>
            <Text style={styles.zones}>
              {item.zones?.filter((z) => z.active !== false).length
                ? item.zones
                    .filter((z) => z.active !== false)
                    .map((z) => z.name)
                    .join(" · ")
                : "-"}
            </Text>
            <View style={[styles.statsRow, isRTL && styles.rowReverse]}>
              <Text style={styles.statText}>
                {t("admin.drivers.completed", "הושלמו")}: {item.stats?.completed ?? 0}
              </Text>
              <Text style={styles.statText}>
                {t("admin.drivers.cancelled", "בוטלו")}: {item.stats?.cancelled ?? 0}
              </Text>
              <Text style={styles.statText}>
                {t("admin.drivers.earnings", "הכנסות")}: ₪{item.stats?.earnings ?? 0}
              </Text>
            </View>
            <View style={[styles.actionsRow, isRTL && styles.rowReverse]}>
              <Pressable
                style={[styles.actionButton, item.active === false ? styles.actionButtonPositive : styles.actionButtonDanger]}
                onPress={() => toggleActive(item)}
                disabled={busyId === item._id}
              >
                <Text style={styles.actionButtonText}>
                  {item.active === false ? t("profile.active", "פעיל") : t("profile.suspended", "מושבת")}
                </Text>
              </Pressable>
              <Pressable
                style={styles.actionButton}
                onPress={() => item.phone && Linking.openURL(`tel:${item.phone}`)}
                disabled={!item.phone}
              >
                <Text style={styles.actionButtonText}>{t("admin.drivers.callDriver", "התקשר")}</Text>
              </Pressable>
              <Pressable style={styles.actionButton} onPress={() => openZonesModal(item)}>
                <Text style={styles.actionButtonText}>{t("admin.drivers.editZones", "ערוך אזורים")}</Text>
              </Pressable>
              <Pressable
                style={styles.actionButton}
                onPress={() => openAssignModal(item)}
                disabled={!item.online || !!item.currentOrder}
              >
                <Text style={styles.actionButtonText}>{t("admin.drivers.assignDelivery", "שייך משלוח")}</Text>
              </Pressable>
              <Pressable
                style={styles.actionButton}
                onPress={() => handleForceOffline(item)}
                disabled={busyId === item._id || !item.online}
              >
                <Text style={styles.actionButtonText}>{t("admin.drivers.forceOffline", "נתק שליח")}</Text>
              </Pressable>
              <Pressable style={styles.actionButton} onPress={() => setResetTarget(item)}>
                <Text style={styles.actionButtonText}>{t("admin.drivers.resetPassword", "אפס סיסמה")}</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCreateOpen(false)}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("admin.drivers.addDriver", "+ הוסף שליח")}</Text>
            {createError ? <Text style={styles.error}>{createError}</Text> : null}
            <TextInput
              value={createForm.name}
              onChangeText={(v) => setCreateForm((f) => ({ ...f, name: v }))}
              placeholder={t("admin.drivers.namePlaceholder", "שם מלא")}
              style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
            />
            <TextInput
              value={createForm.phone}
              onChangeText={(v) => setCreateForm((f) => ({ ...f, phone: v }))}
              placeholder={t("admin.drivers.phonePlaceholder", "טלפון")}
              style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
            />
            <TextInput
              value={createForm.username}
              onChangeText={(v) => setCreateForm((f) => ({ ...f, username: v }))}
              placeholder={t("admin.drivers.usernamePlaceholder", "שם משתמש")}
              autoCapitalize="none"
              style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
            />
            <TextInput
              value={createForm.password}
              onChangeText={(v) => setCreateForm((f) => ({ ...f, password: v }))}
              placeholder={t("admin.drivers.passwordPlaceholder", "סיסמה")}
              secureTextEntry
              style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
            />
            <Pressable style={styles.saveButton} onPress={handleCreateDriver} disabled={creating}>
              {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{t("profile.save", "שמור")}</Text>}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!resetTarget} transparent animationType="fade" onRequestClose={() => setResetTarget(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setResetTarget(null)}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>{resetTarget?.name}</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t("admin.drivers.newPasswordPlaceholder", "סיסמה חדשה")}
              secureTextEntry
              style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
            />
            <Pressable
              style={styles.saveButton}
              onPress={handleResetPassword}
              disabled={busyId === resetTarget?._id || newPassword.length < 4}
            >
              {busyId === resetTarget?._id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>{t("profile.save", "שמור")}</Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!assignTarget} transparent animationType="fade" onRequestClose={() => setAssignTarget(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAssignTarget(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{assignTarget?.name}</Text>
            {assignableDeliveries.length === 0 ? (
              <Text style={styles.emptyText}>{t("admin.drivers.noDeliveriesAvailable", "אין משלוחים זמינים לשיוך")}</Text>
            ) : (
              assignableDeliveries.map((o) => (
                <Pressable
                  key={o._id}
                  style={styles.driverRow}
                  onPress={() => handleAssignDelivery(o._id)}
                  disabled={assigningId === o._id}
                >
                  <Text style={styles.driverRowText}>
                    #{o._id.slice(-6)} · {o.deliveryZoneName || o.deliveryAddress?.text} · ₪{o.totalPrice}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!zonesTarget} transparent animationType="fade" onRequestClose={() => setZonesTarget(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setZonesTarget(null)}>
          <Pressable style={[styles.modalCard, styles.zonesModalCard]}>
            <Text style={styles.modalTitle}>{zonesTarget?.name}</Text>
            <View style={styles.searchWrap}>
              <TextInput
                value={zoneQuery}
                onChangeText={setZoneQuery}
                placeholder={t("admin.drivers.searchPlaceholder", "חפש עיר או כפר...")}
                style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
              />
              {zoneQuery.trim().length >= 2 ? (
                <View style={styles.suggestions}>
                  {zoneSearching ? (
                    <ActivityIndicator style={{ padding: 12 }} />
                  ) : zoneSuggestions.length === 0 ? (
                    <Text style={styles.noResults}>{t("admin.drivers.noMatches", "אין תוצאות")}</Text>
                  ) : (
                    zoneSuggestions.map((r) => (
                      <Pressable
                        key={r.placeId}
                        style={styles.suggestionRow}
                        onPress={() => handleAddZone(r)}
                        disabled={!!addingZonePlaceId}
                      >
                        {addingZonePlaceId === r.placeId ? (
                          <ActivityIndicator size="small" />
                        ) : (
                          <Text style={styles.suggestionText}>{r.name}</Text>
                        )}
                      </Pressable>
                    ))
                  )}
                </View>
              ) : null}
            </View>

            <ScrollView style={styles.zonesList}>
              {zonesDraft.length === 0 ? (
                <Text style={styles.emptyText}>{t("admin.drivers.noZonesSelected", "עדיין לא נבחרו אזורים")}</Text>
              ) : (
                zonesDraft.map((z) => (
                  <View key={z.placeId} style={[styles.zoneRow, isRTL && styles.rowReverse]}>
                    <Text style={[styles.zoneName, z.active === false && styles.zoneNameDisabled]}>{z.name}</Text>
                    <Switch value={z.active !== false} onValueChange={() => handleToggleZoneActive(z.placeId)} />
                    <Pressable onPress={() => handleRemoveZone(z.placeId)} hitSlop={8}>
                      <Text style={styles.removeX}>✕</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>

            <Pressable style={styles.saveButton} onPress={handleSaveZones} disabled={savingZones}>
              {savingZones ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>{t("admin.drivers.save", "שמור")}</Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  rowReverse: { flexDirection: "row-reverse" },
  title: { fontSize: 24, fontWeight: "700" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  addButton: { backgroundColor: "#111", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  addButtonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  error: { color: "#c00", marginBottom: 10 },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 10, padding: 14, marginBottom: 10, backgroundColor: "#fafafa" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  driverName: { fontSize: 16, fontWeight: "700" },
  onlineDot: { color: "#16a34a", fontSize: 12, fontWeight: "600" },
  offlineDot: { color: "#999", fontSize: 12, fontWeight: "600" },
  meta: { color: "#666", fontSize: 13, marginBottom: 2 },
  zones: { color: "#555", fontSize: 13, marginBottom: 8 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 10 },
  statText: { fontSize: 12, color: "#888" },
  actionsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionButton: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  actionButtonDanger: { backgroundColor: "#fee2e2", borderColor: "#fca5a5" },
  actionButtonPositive: { backgroundColor: "#dcfce7", borderColor: "#86efac" },
  actionButtonText: { fontSize: 12, fontWeight: "600", color: "#111" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 14, padding: 20 },
  zonesModalCard: { maxHeight: "80%" },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 12 },
  saveButton: { backgroundColor: "#111", borderRadius: 8, padding: 12, alignItems: "center" },
  saveButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  emptyText: { color: "#888", padding: 8 },
  driverRow: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#f2f2f2" },
  driverRowText: { fontSize: 15 },
  searchWrap: { position: "relative", zIndex: 5, marginBottom: 10 },
  suggestions: {
    position: "absolute",
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    maxHeight: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 10,
  },
  suggestionRow: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: "#f2f2f2" },
  suggestionText: { fontSize: 15 },
  noResults: { padding: 12, color: "#999", fontSize: 13 },
  zonesList: { maxHeight: 220 },
  zoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  zoneName: { flex: 1, fontSize: 15 },
  zoneNameDisabled: { color: "#aaa", textDecorationLine: "line-through" },
  removeX: { color: "#999", fontSize: 16, paddingHorizontal: 4 },
});
