import { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, TextInput, ScrollView, Switch } from "react-native";
import { WebView } from "react-native-webview";
import { useAuth } from "../../src/context/AuthContext";
import { useLang } from "../../src/context/LangContext";
import { updateMyZones, updateMyProfile, searchSettlements, fetchSettlementBoundary } from "../../src/api/driver";
import { buildZoneMapHtml } from "../../src/utils/zoneMapHtml";
import Text from "../../src/components/RTLText";

export default function ProfileScreen() {
  const { driver, isLoading, setDriver, logout } = useAuth();
  const { t, lang, setLang, isRTL } = useLang();
  // Drops any pre-migration zone entries that lack a placeId (old string-based zones
  // cast to empty subdocuments) - they carry no usable name/location, so they'd render
  // as blank rows with colliding keys and can't be matched to anything anyway.
  const [zones, setZones] = useState(() => (driver?.zones || []).filter((z) => z.placeId).map((z) => ({ ...z })));
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingPlaceId, setAddingPlaceId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [vehicleType, setVehicleType] = useState(driver?.vehicleType || "");
  const [vehiclePlate, setVehiclePlate] = useState(driver?.vehiclePlate || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Debounced live search against Google Places (+ fallbacks), independent of anything
  // the restaurant has configured - the driver can add literally any city or village.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        setSearchResults(await searchSettlements(q));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [query]);

  const suggestions = useMemo(
    () => searchResults.filter((r) => !zones.some((z) => z.placeId === r.placeId)),
    [searchResults, zones]
  );

  const zoneMapHtml = useMemo(() => buildZoneMapHtml(zones), [zones]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!driver) return null;

  const handleAddZone = async (result) => {
    setAddingPlaceId(result.placeId);
    setSaved(false);
    // Purely cosmetic - if the boundary lookup fails, the zone still gets added and the
    // map just falls back to a plain pin for it.
    let boundary = null;
    try {
      const res = await fetchSettlementBoundary(result.lat, result.lng);
      boundary = res.geojson;
    } catch (err) {
      console.warn("Could not fetch a boundary outline for", result.name, err?.message);
    }
    setZones((prev) => [
      ...prev,
      { placeId: result.placeId, name: result.name, lat: result.lat, lng: result.lng, active: true, boundary },
    ]);
    setQuery("");
    setSearchResults([]);
    setAddingPlaceId(null);
  };

  const handleToggleZoneActive = (placeId) => {
    setZones((prev) => prev.map((z) => (z.placeId === placeId ? { ...z, active: z.active === false } : z)));
    setSaved(false);
  };

  const handleRemoveZone = (placeId) => {
    setZones((prev) => prev.filter((z) => z.placeId !== placeId));
    setSaved(false);
  };

  const handleSaveZones = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const { driver: updated } = await updateMyZones(zones);
      setDriver(updated);
      setZones((updated.zones || []).filter((z) => z.placeId).map((z) => ({ ...z })));
      setSaved(true);
    } catch (err) {
      setError(err?.response?.data?.message || t("profile.saveError", "לא ניתן היה לשמור את האזורים"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError("");
    setProfileSaved(false);
    try {
      const { driver: updated } = await updateMyProfile({ vehicleType, vehiclePlate });
      setDriver(updated);
      setProfileSaved(true);
    } catch (err) {
      setProfileError(err?.response?.data?.message || t("profile.profileSaveError", "לא ניתן היה לשמור את הפרטים"));
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.driverInfo}>
        <Text style={styles.driverName}>{driver.name}</Text>
        <Text style={styles.driverMeta}>@{driver.username}</Text>
        {driver.phone ? <Text style={styles.driverMeta}>{driver.phone}</Text> : null}
        <View style={[styles.statusRow, isRTL && styles.rowReverse]}>
          <Text style={styles.label}>{t("profile.accountStatus", "סטטוס חשבון")}</Text>
          <View style={[styles.statusBadge, driver.active === false && styles.statusBadgeSuspended]}>
            <Text style={styles.statusBadgeText}>
              {driver.active === false ? t("profile.suspended", "מושבת") : t("profile.active", "פעיל")}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("profile.vehicleType", "סוג רכב")}</Text>
        {profileError ? <Text style={styles.error}>{profileError}</Text> : null}
        {profileSaved ? <Text style={styles.success}>{t("profile.profileSaved", "הפרטים נשמרו")}</Text> : null}
        <TextInput
          value={vehicleType}
          onChangeText={(v) => {
            setVehicleType(v);
            setProfileSaved(false);
          }}
          placeholder={t("profile.vehicleTypePlaceholder", "לדוגמה: קטנוע, רכב")}
          style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
        />
        <Text style={styles.label}>{t("profile.vehiclePlate", "מספר רישוי")}</Text>
        <TextInput
          value={vehiclePlate}
          onChangeText={(v) => {
            setVehiclePlate(v);
            setProfileSaved(false);
          }}
          style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
        />
        <Pressable style={styles.saveProfileButton} onPress={handleSaveProfile} disabled={savingProfile}>
          {savingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{t("profile.saveProfile", "שמור פרטים")}</Text>}
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("menu.language", "שפה")}</Text>
        <View style={styles.langToggle}>
          <Pressable style={[styles.langPill, lang === "he" && styles.langPillActive]} onPress={() => setLang("he")}>
            <Text style={[styles.langPillText, lang === "he" && styles.langPillTextActive]}>עברית</Text>
          </Pressable>
          <Pressable style={[styles.langPill, lang === "en" && styles.langPillActive]} onPress={() => setLang("en")}>
            <Text style={[styles.langPillText, lang === "en" && styles.langPillTextActive]}>English</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("profile.title", "אזורי עבודה")}</Text>

        <View style={styles.mapWrap}>
          <WebView source={{ html: zoneMapHtml }} style={styles.map} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {saved ? <Text style={styles.success}>{t("profile.saved", "האזורים נשמרו")}</Text> : null}

        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("profile.searchPlaceholder", "חפש עיר או כפר...")}
            style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
          />
          {query.trim().length >= 2 ? (
            <View style={styles.suggestions}>
              {searching ? (
                <ActivityIndicator style={{ padding: 12 }} />
              ) : suggestions.length === 0 ? (
                <Text style={styles.noResults}>{t("profile.noMatches", "אין תוצאות")}</Text>
              ) : (
                suggestions.map((r) => (
                  <Pressable
                    key={r.placeId}
                    style={styles.suggestionRow}
                    onPress={() => handleAddZone(r)}
                    disabled={!!addingPlaceId}
                  >
                    {addingPlaceId === r.placeId ? (
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

        {zones.length === 0 ? (
          <Text style={styles.emptyText}>{t("profile.noZonesSelected", "עדיין לא נבחרו אזורים")}</Text>
        ) : (
          zones.map((z) => (
            <View key={z.placeId} style={[styles.zoneRow, isRTL && styles.rowReverse]}>
              <Text style={[styles.zoneName, z.active === false && styles.zoneNameDisabled]}>{z.name}</Text>
              <Switch value={z.active !== false} onValueChange={() => handleToggleZoneActive(z.placeId)} />
              <Pressable onPress={() => handleRemoveZone(z.placeId)} hitSlop={8}>
                <Text style={styles.removeX}>✕</Text>
              </Pressable>
            </View>
          ))
        )}

        <Pressable style={styles.saveButton} onPress={handleSaveZones} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {t("profile.save", "שמור")} ({zones.length} {t("profile.selected", "נבחרו")})
            </Text>
          )}
        </Pressable>
      </View>

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>{t("menu.logOut", "התנתקות")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  rowReverse: { flexDirection: "row-reverse" },
  driverInfo: { paddingHorizontal: 20, marginBottom: 10 },
  driverName: { fontSize: 22, fontWeight: "700" },
  driverMeta: { color: "#666", marginTop: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  statusBadge: { backgroundColor: "#dcfce7", borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12 },
  statusBadgeSuspended: { backgroundColor: "#fee2e2" },
  statusBadgeText: { fontSize: 12, fontWeight: "600", color: "#166534" },
  section: { paddingHorizontal: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: "#f2f2f2", marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  label: { color: "#888", fontSize: 12, marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 15 },
  error: { color: "#c00", marginBottom: 6 },
  success: { color: "#16a34a", marginBottom: 6 },
  emptyText: { color: "#888", marginVertical: 8 },
  saveProfileButton: { backgroundColor: "#111", borderRadius: 8, padding: 12, alignItems: "center", marginTop: 14 },
  langToggle: { flexDirection: "row", gap: 8 },
  langPill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: "#ddd" },
  langPillActive: { backgroundColor: "#111", borderColor: "#111" },
  langPillText: { fontSize: 14, color: "#333", fontWeight: "600" },
  langPillTextActive: { color: "#fff" },
  mapWrap: { height: 200, borderRadius: 12, overflow: "hidden", backgroundColor: "#f2f2f2", marginBottom: 12 },
  map: { flex: 1 },
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
  saveButton: { backgroundColor: "#111", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  logoutButton: { paddingVertical: 20, alignItems: "center", marginTop: 20, borderTopWidth: 1, borderTopColor: "#f2f2f2" },
  logoutText: { color: "#c00", fontWeight: "600", fontSize: 16 },
});
