import React, { useEffect, useRef, useState } from "react";
import api from "../api";
import SideMenu from "../layouts/SideMenu";
import DeliveryAddressPicker from "../components/cart/DeliveryAddressPicker";
import { Menu, X } from "lucide-react";
import { useLang } from "../context/LangContext";

const ZONE_COLORS = ["#22c55e", "#f97316", "#3b82f6", "#eab308", "#ec4899", "#14b8a6", "#a855f7", "#ef4444"];

export default function RestaurantSettings() {
  const { t, dir } = useLang();
  const [name, setName] = useState("");
  const [address, setAddress] = useState(null); // { lat, lng, text, notes }
  const [zones, setZones] = useState([]); // [{ name, lat, lng, boundary }]
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", tone: "neutral" });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [settlementBoundary, setSettlementBoundary] = useState(null);

  const [zoneQuery, setZoneQuery] = useState("");
  const [zoneSuggestions, setZoneSuggestions] = useState([]);
  const [searchingZone, setSearchingZone] = useState(false);
  const [addingZoneName, setAddingZoneName] = useState(null);
  const zoneSearchTimer = useRef(null);

  useEffect(() => {
    api
      .get("/api/restaurant")
      .then((res) => {
        const r = res.data;
        setName(r.name || "");
        if (Number.isFinite(r.address?.lat) && Number.isFinite(r.address?.lng)) {
          setAddress({ lat: r.address.lat, lng: r.address.lng, text: r.address.text || "" });
        }
        setZones(Array.isArray(r.deliveryZones) ? r.deliveryZones : []);
      })
      .catch((err) => {
        console.error("Failed to load restaurant settings", err);
        setMsg({ text: t("restaurantSettings.loadError", "שגיאה בטעינת נתוני המסעדה"), tone: "error" });
      })
      .finally(() => setLoading(false));
  }, []);

  // Draws the real village/town boundary (from OSM) around the pin, purely as a visual
  // reference for where the restaurant itself sits relative to the delivery zones below.
  useEffect(() => {
    if (!Number.isFinite(address?.lat) || !Number.isFinite(address?.lng)) return;
    const token = localStorage.getItem("token");
    api
      .get("/api/restaurant/settlement-boundary", {
        params: { lat: address.lat, lng: address.lng },
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setSettlementBoundary(res.data))
      .catch(() => setSettlementBoundary(null));
  }, [address?.lat, address?.lng]);

  // Debounced settlement search as the admin types in the "add delivery area" box.
  useEffect(() => {
    clearTimeout(zoneSearchTimer.current);
    if (!zoneQuery.trim()) {
      setZoneSuggestions([]);
      return;
    }
    setSearchingZone(true);
    zoneSearchTimer.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get("/api/restaurant/search-settlements", {
          params: { q: zoneQuery.trim() },
          headers: { Authorization: `Bearer ${token}` },
        });
        setZoneSuggestions(res.data || []);
      } catch (err) {
        console.error("Failed to search settlements", err);
        setZoneSuggestions([]);
      } finally {
        setSearchingZone(false);
      }
    }, 350);
    return () => clearTimeout(zoneSearchTimer.current);
  }, [zoneQuery]);

  const handleResolveLocation = async () => {
    if (!locationInput.trim()) return;
    setResolvingLocation(true);
    setMsg({ text: "", tone: "neutral" });
    try {
      const token = localStorage.getItem("token");
      const res = await api.post(
        "/api/restaurant/resolve-location",
        { input: locationInput.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAddress({ lat: res.data.lat, lng: res.data.lng, text: res.data.text || locationInput.trim() });
      setMsg({ text: t("restaurantSettings.locationFoundSuccess", "המיקום נמצא — ניתן לדייק ע\"י גרירת הסיכה על המפה"), tone: "success" });
    } catch (err) {
      console.error("Failed to resolve location", err);
      setMsg({
        text: err.response?.data?.message || t("restaurantSettings.locationNotFoundError", "לא הצלחנו למצוא את המיקום הזה, נסה להזיז את הסיכה ידנית"),
        tone: "error",
      });
    } finally {
      setResolvingLocation(false);
    }
  };

  const handleAddZone = async (suggestion) => {
    if (zones.some((z) => z.name === suggestion.name)) {
      setZoneQuery("");
      setZoneSuggestions([]);
      return;
    }
    setAddingZoneName(suggestion.name);
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/api/restaurant/settlement-boundary", {
        params: { lat: suggestion.lat, lng: suggestion.lng },
        headers: { Authorization: `Bearer ${token}` },
      });
      setZones((prev) => [...prev, { name: suggestion.name, lat: suggestion.lat, lng: suggestion.lng, boundary: res.data.geojson }]);
      setZoneQuery("");
      setZoneSuggestions([]);
    } catch (err) {
      console.error("Failed to fetch boundary for settlement", err);
      setMsg({ text: `${t("restaurantSettings.zoneBoundaryError", "לא הצלחנו למצוא את גבולות")} "${suggestion.name}"`, tone: "error" });
    } finally {
      setAddingZoneName(null);
    }
  };

  const handleRemoveZone = (index) => {
    setZones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!address?.lat || !address?.lng) {
      setMsg({ text: t("restaurantSettings.selectLocationError", "אנא בחר את מיקום המסעדה על גבי המפה"), tone: "error" });
      return;
    }
    setSaving(true);
    setMsg({ text: "", tone: "neutral" });
    try {
      const token = localStorage.getItem("token");
      const res = await api.put(
        "/api/restaurant",
        {
          name,
          address: { text: address.text, lat: address.lat, lng: address.lng },
          deliveryZones: zones.map((z) => ({ name: z.name, lat: z.lat, lng: z.lng, boundary: z.boundary })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // The backend auto-adds the restaurant's own settlement as a zone if it wasn't
      // already in the list, so refresh from the response to reflect that immediately.
      setZones(Array.isArray(res.data?.restaurant?.deliveryZones) ? res.data.restaurant.deliveryZones : zones);
      setMsg({ text: t("restaurantSettings.saveSuccess", "השינויים נשמרו בהצלחה"), tone: "success" });
    } catch (err) {
      console.error("Failed to save restaurant settings", err);
      setMsg({ text: err.response?.data?.message || t("restaurantSettings.saveError", "שגיאה בשמירת הנתונים"), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const mapZones = zones.map((z, i) => ({ name: z.name, geojson: z.boundary, color: ZONE_COLORS[i % ZONE_COLORS.length] }));

  return (
    <div className="min-h-screen bg-[#0f1415] text-white flex" dir={dir}>
      <div className="hidden md:block">
        <SideMenu logoSrc="/developerTag.jpeg" brand="Hungry" />
      </div>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      {isSidebarOpen && (
        <div className="md:hidden">
          <SideMenu onClose={() => setIsSidebarOpen(false)} logoSrc="/developerTag.jpeg" brand="Hungry" />
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-[#11131a] border-b border-white/10 sticky top-0 z-20">
          <div className="h-full px-4 md:px-6 flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
              onClick={() => setIsSidebarOpen(true)}
              aria-label={t("restaurantSettings.openMenu", "פתח תפריט")}
            >
              <Menu size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-base md:text-lg font-semibold">{t("restaurantSettings.title", "הגדרות מסעדה")}</h1>
              <p className="text-white/50 text-xs">{t("restaurantSettings.subtitle", "מיקום המסעדה ואזורי משלוח")}</p>
            </div>
          </div>
        </header>

        <div className="px-4 md:px-6 mt-4 space-y-4 pb-8">
          {msg.text && (
            <div
              className={`rounded-2xl p-3 text-sm border ${
                msg.tone === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                  : msg.tone === "error"
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-200"
                  : "bg-white/5 border-white/10 text-white/80"
              }`}
            >
              {msg.text}
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl bg-white/5 border border-white/10 h-64 animate-pulse" />
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <section className="bg-[#17181d] border border-white/10 rounded-2xl p-4">
                <h3 className="text-sm text-white/80 mb-3">{t("restaurantSettings.restaurantNameTitle", "שם המסעדה")}</h3>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </section>

              <section className="bg-[#17181d] border border-white/10 rounded-2xl p-4">
                <h3 className="text-sm text-white/80 mb-3">{t("restaurantSettings.locationTitle", "מיקום המסעדה")}</h3>
                <p className="text-[12px] text-white/40 mb-2">
                  {t("restaurantSettings.locationDesc", "מיקום זה משמש כנקודת ההתייחסות של המסעדה על המפה.")}
                </p>

                <label className="text-xs text-white/60 mb-1 block">
                  {t(
                    "restaurantSettings.locationInputLabel",
                    "הדבק קישור מ-Google Maps (לחיצה ארוכה על המיקום ← שיתוף) או כתובת מלאה"
                  )}
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    placeholder={t("restaurantSettings.locationInputPlaceholder", "https://maps.app.goo.gl/... או כתובת")}
                    className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={handleResolveLocation}
                    disabled={resolvingLocation || !locationInput.trim()}
                    className={`rounded-xl px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
                      resolvingLocation || !locationInput.trim() ? "bg-blue-700/50 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {resolvingLocation
                      ? t("restaurantSettings.findingLocation", "מחפש…")
                      : t("restaurantSettings.findLocation", "מצא מיקום")}
                  </button>
                </div>
                <p className="text-[11px] text-white/40 mb-3">
                  {t("restaurantSettings.dragPinAfterFindHint", "לאחר שהסיכה תקפוץ למקום, אפשר עדיין לגרור אותה על המפה כדי לדייק.")}
                </p>
                <div className="rounded-xl overflow-hidden">
                  <DeliveryAddressPicker
                    value={address}
                    onChange={setAddress}
                    hideAddressFields
                    mapHeight="380px"
                    settlementBoundary={settlementBoundary}
                    zones={mapZones}
                  />
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-white/50">
                  {settlementBoundary && (
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-4 h-0 border-t-2 border-dashed" style={{ borderColor: "#8b5cf6" }} />
                      {t("restaurantSettings.restaurantLocationLegend", "מיקום המסעדה")} ({settlementBoundary.name})
                    </span>
                  )}
                  {mapZones.map((z) => (
                    <span key={z.name} className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: z.color }} />
                      {z.name}
                    </span>
                  ))}
                </div>
              </section>

              <section className="bg-[#17181d] border border-white/10 rounded-2xl p-4">
                <h3 className="text-sm text-white/80 mb-1">{t("restaurantSettings.zonesTitle", "אזורי משלוח")}</h3>
                <p className="text-[12px] text-white/40 mb-3">
                  {t(
                    "restaurantSettings.zonesDesc",
                    'היישוב של המסעדה עצמה נוסף אוטומטית בעת שמירה. הוסף כאן ערים/כפרים נוספים שהמסעדה מספקת אליהם משלוח. כל כתובת שאינה בתוך אחד מהאזורים האלה תיחסם אוטומטית בהזמנה. דמי המשלוח מחושבים אוטומטית לפי המרחק בין המסעדה ללקוח — אין צורך להזין מחיר.'
                  )}
                </p>

                <div className="relative mb-3">
                  <input
                    value={zoneQuery}
                    onChange={(e) => setZoneQuery(e.target.value)}
                    placeholder={t("restaurantSettings.zoneSearchPlaceholder", "חפש עיר או כפר (עברית / English / عربي)...")}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  {(searchingZone || zoneSuggestions.length > 0) && zoneQuery.trim() && (
                    <div className="absolute z-10 mt-1 w-full rounded-xl bg-[#1f2127] border border-white/10 shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                      {searchingZone && <div className="px-3 py-2 text-xs text-white/40">{t("restaurantSettings.searching", "מחפש…")}</div>}
                      {!searchingZone &&
                        zoneSuggestions.map((s) => (
                          <button
                            type="button"
                            key={`${s.name}-${s.lat}-${s.lng}`}
                            onClick={() => handleAddZone(s)}
                            disabled={addingZoneName === s.name}
                            className="w-full text-right px-3 py-2 text-sm hover:bg-white/10 transition disabled:opacity-50"
                          >
                            {addingZoneName === s.name ? `${t("restaurantSettings.addingZone", "מוסיף את")} ${s.name}…` : s.name}
                          </button>
                        ))}
                      {!searchingZone && zoneSuggestions.length === 0 && (
                        <div className="px-3 py-2 text-xs text-white/40">{t("restaurantSettings.noResults", "לא נמצאו תוצאות")}</div>
                      )}
                    </div>
                  )}
                </div>

                {zones.length === 0 ? (
                  <p className="text-[12px] text-white/40">{t("restaurantSettings.noZonesYet", "עדיין לא הוגדרו אזורי משלוח.")}</p>
                ) : (
                  <div className="space-y-2">
                    {zones.map((zone, i) => (
                      <div key={zone.name} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ZONE_COLORS[i % ZONE_COLORS.length] }} />
                        <span className="flex-1 text-sm">{zone.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveZone(i)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-white/50 hover:text-rose-300 transition shrink-0"
                          aria-label={`${t("restaurantSettings.removeZone", "הסר את")} ${zone.name}`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <button
                type="submit"
                disabled={saving}
                className={`rounded-xl px-5 py-2.5 font-medium transition ${
                  saving ? "bg-emerald-700/60 cursor-wait" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {saving ? t("restaurantSettings.saving", "שומר…") : t("restaurantSettings.saveChanges", "שמור שינויים")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
