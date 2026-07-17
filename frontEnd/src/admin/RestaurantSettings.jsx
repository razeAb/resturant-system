import React, { useEffect, useState } from "react";
import api from "../api";
import SideMenu from "../layouts/SideMenu";
import DeliveryAddressPicker from "../components/cart/DeliveryAddressPicker";
import { Menu } from "lucide-react";

const DEFAULT_PRICING = { sameCityRadiusKm: 4, sameCityFee: 25, nearbyRadiusKm: 12, nearbyFee: 35 };

export default function RestaurantSettings() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState(null); // { lat, lng, text, notes }
  const [pricing, setPricing] = useState(DEFAULT_PRICING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", tone: "neutral" });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [resolvingLocation, setResolvingLocation] = useState(false);

  useEffect(() => {
    api
      .get("/api/restaurant")
      .then((res) => {
        const r = res.data;
        setName(r.name || "");
        if (Number.isFinite(r.address?.lat) && Number.isFinite(r.address?.lng)) {
          setAddress({ lat: r.address.lat, lng: r.address.lng, text: r.address.text || "" });
        }
        setPricing({ ...DEFAULT_PRICING, ...(r.deliveryPricing || {}) });
      })
      .catch((err) => {
        console.error("Failed to load restaurant settings", err);
        setMsg({ text: "שגיאה בטעינת נתוני המסעדה", tone: "error" });
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePricingChange = (field, value) => {
    setPricing((p) => ({ ...p, [field]: value }));
  };

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
      setMsg({ text: "המיקום נמצא — ניתן לדייק ע\"י גרירת הסיכה על המפה", tone: "success" });
    } catch (err) {
      console.error("Failed to resolve location", err);
      setMsg({ text: err.response?.data?.message || "לא הצלחנו למצוא את המיקום הזה, נסה להזיז את הסיכה ידנית", tone: "error" });
    } finally {
      setResolvingLocation(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!address?.lat || !address?.lng) {
      setMsg({ text: "אנא בחר את מיקום המסעדה על גבי המפה", tone: "error" });
      return;
    }
    setSaving(true);
    setMsg({ text: "", tone: "neutral" });
    try {
      const token = localStorage.getItem("token");
      await api.put(
        "/api/restaurant",
        {
          name,
          address: { text: address.text, lat: address.lat, lng: address.lng },
          deliveryPricing: {
            sameCityRadiusKm: Number(pricing.sameCityRadiusKm),
            sameCityFee: Number(pricing.sameCityFee),
            nearbyRadiusKm: Number(pricing.nearbyRadiusKm),
            nearbyFee: Number(pricing.nearbyFee),
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg({ text: "השינויים נשמרו בהצלחה", tone: "success" });
    } catch (err) {
      console.error("Failed to save restaurant settings", err);
      setMsg({ text: err.response?.data?.message || "שגיאה בשמירת הנתונים", tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1415] text-white flex" dir="rtl">
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
              aria-label="פתח תפריט"
            >
              <Menu size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-base md:text-lg font-semibold">הגדרות מסעדה</h1>
              <p className="text-white/50 text-xs">מיקום המסעדה ותמחור משלוחים</p>
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
                <h3 className="text-sm text-white/80 mb-3">שם המסעדה</h3>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </section>

              <section className="bg-[#17181d] border border-white/10 rounded-2xl p-4">
                <h3 className="text-sm text-white/80 mb-3">מיקום המסעדה</h3>
                <p className="text-[12px] text-white/40 mb-2">
                  מיקום זה משמש לחישוב מרחק המשלוח ותמחור אוטומטי לפי אזור.
                </p>

                <label className="text-xs text-white/60 mb-1 block">
                  הדבק קישור מ-Google Maps (לחיצה ארוכה על המיקום ← שיתוף) או כתובת מלאה
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    placeholder="https://maps.app.goo.gl/... או כתובת"
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
                    {resolvingLocation ? "מחפש…" : "מצא מיקום"}
                  </button>
                </div>
                <p className="text-[11px] text-white/40 mb-3">
                  לאחר שהסיכה תקפוץ למקום, אפשר עדיין לגרור אותה על המפה כדי לדייק.
                </p>
                <div className="rounded-xl overflow-hidden">
                  <DeliveryAddressPicker value={address} onChange={setAddress} />
                </div>
              </section>

              <section className="bg-[#17181d] border border-white/10 rounded-2xl p-4">
                <h3 className="text-sm text-white/80 mb-3">תמחור משלוחים לפי מרחק</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">רדיוס "אותה עיר" (ק"מ)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={pricing.sameCityRadiusKm}
                      onChange={(e) => handlePricingChange("sameCityRadiusKm", e.target.value)}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">דמי משלוח "אותה עיר" (₪)</label>
                    <input
                      type="number"
                      min="0"
                      value={pricing.sameCityFee}
                      onChange={(e) => handlePricingChange("sameCityFee", e.target.value)}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">רדיוס "כפרים סמוכים" (ק"מ)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={pricing.nearbyRadiusKm}
                      onChange={(e) => handlePricingChange("nearbyRadiusKm", e.target.value)}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">דמי משלוח "כפרים סמוכים" (₪)</label>
                    <input
                      type="number"
                      min="0"
                      value={pricing.nearbyFee}
                      onChange={(e) => handlePricingChange("nearbyFee", e.target.value)}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                </div>
                <p className="text-[12px] text-white/40 mt-2">
                  מעבר לרדיוס "כפרים סמוכים" — הזמנת משלוח תיחסם אוטומטית באתר.
                </p>
              </section>

              <button
                type="submit"
                disabled={saving}
                className={`rounded-xl px-5 py-2.5 font-medium transition ${
                  saving ? "bg-emerald-700/60 cursor-wait" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {saving ? "שומר…" : "שמור שינויים"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
