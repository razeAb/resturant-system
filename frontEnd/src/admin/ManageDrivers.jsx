// frontEnd/src/admin/ManageDrivers.jsx
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import api from "../api";
import SideMenu from "../layouts/SideMenu";
import { Menu } from "lucide-react";

/** Small inline animation utilities (like other admin pages) */
const Anim = () => (
  <style>{`
  :root { --anim: 220ms; --ease: cubic-bezier(.2,.8,.2,1); }
  .fade-up { animation: fadeUp var(--anim) var(--ease) both; }
  @keyframes fadeUp { from { opacity:0; transform: translateY(10px);} to { opacity:1; transform: translateY(0);} }
  .card-hover { transition: transform 140ms var(--ease), box-shadow 140ms var(--ease); }
  .card-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,.2); }
  `}</style>
);

function OnlineBadge({ online }) {
  return online ? (
    <span className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[11px] bg-emerald-500/15 text-emerald-200 border border-emerald-500/25">
      ● מחובר
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[11px] bg-white/5 text-white/50 border border-white/10">
      ○ לא מחובר
    </span>
  );
}
OnlineBadge.propTypes = { online: PropTypes.bool };

function ZonePills({ zones }) {
  if (!zones?.length) return <span className="text-[12px] text-white/40">לא נבחרו אזורי עבודה</span>;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {zones.map((z) => (
        <span
          key={z.placeId || z.name}
          className={`px-2 py-[2px] rounded-full text-[11px] border ${
            z.active === false
              ? "bg-white/5 text-white/35 border-white/10 line-through"
              : "bg-sky-500/10 text-sky-200 border-sky-500/20"
          }`}
        >
          {z.name}
        </span>
      ))}
    </div>
  );
}
ZonePills.propTypes = { zones: PropTypes.array };

export default function ManageDrivers() {
  const [drivers, setDrivers] = useState([]);
  const [formData, setFormData] = useState({ username: "", password: "", name: "", phone: "" });
  const [msg, setMsg] = useState({ text: "", tone: "neutral" });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [removeOps, setRemoveOps] = useState({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [statusOps, setStatusOps] = useState({});

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await api.get("/api/drivers", { headers: { Authorization: `Bearer ${token}` } });
      setDrivers(Array.isArray(res.data?.drivers) ? res.data.drivers : []);
    } catch (err) {
      console.error("Error fetching drivers", err);
      setMsg({ text: "שגיאה בטעינת השליחים", tone: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleChange = (e) => setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ text: "", tone: "neutral" });
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await api.post("/api/drivers", formData, { headers: { Authorization: `Bearer ${token}` } });
      setFormData({ username: "", password: "", name: "", phone: "" });
      setMsg({ text: "השליח נוסף בהצלחה", tone: "success" });
      fetchDrivers();
    } catch (err) {
      setMsg({ text: err.response?.data?.message || "שגיאה בהוספת שליח", tone: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const removeDriver = async (driverId, name) => {
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק את השליח ${name}?`)) return;
    setRemoveOps((m) => ({ ...m, [driverId]: true }));
    setMsg({ text: "", tone: "neutral" });
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/api/drivers/${driverId}`, { headers: { Authorization: `Bearer ${token}` } });
      setDrivers((list) => list.filter((d) => d._id !== driverId));
      setMsg({ text: "השליח נמחק בהצלחה", tone: "success" });
    } catch (err) {
      console.error("Delete driver failed", err);
      setMsg({ text: err.response?.data?.message || "שגיאה במחיקת שליח", tone: "error" });
    } finally {
      setRemoveOps((m) => {
        const next = { ...m };
        delete next[driverId];
        return next;
      });
    }
  };

  const startEdit = (driver) => {
    setEditingId(driver._id);
    setEditForm({ name: driver.name || "", phone: driver.phone || "" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", phone: "" });
  };

  const saveEdit = async (driverId) => {
    setSavingEdit(true);
    setMsg({ text: "", tone: "neutral" });
    try {
      const token = localStorage.getItem("token");
      const res = await api.put(`/api/drivers/${driverId}`, editForm, { headers: { Authorization: `Bearer ${token}` } });
      setDrivers((list) => list.map((d) => (d._id === driverId ? res.data.driver : d)));
      setMsg({ text: "פרטי השליח עודכנו", tone: "success" });
      cancelEdit();
    } catch (err) {
      setMsg({ text: err.response?.data?.message || "שגיאה בעדכון השליח", tone: "error" });
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleActive = async (driver) => {
    setStatusOps((m) => ({ ...m, [driver._id]: true }));
    setMsg({ text: "", tone: "neutral" });
    try {
      const token = localStorage.getItem("token");
      const res = await api.put(
        `/api/drivers/${driver._id}`,
        { active: driver.active === false },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDrivers((list) => list.map((d) => (d._id === driver._id ? res.data.driver : d)));
    } catch (err) {
      setMsg({ text: err.response?.data?.message || "שגיאה בעדכון סטטוס השליח", tone: "error" });
    } finally {
      setStatusOps((m) => {
        const next = { ...m };
        delete next[driver._id];
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1415] text-white flex" dir="rtl">
      <Anim />

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
              <h1 className="text-base md:text-lg font-semibold">ניהול שליחים</h1>
              <p className="text-white/50 text-xs">הוסף שליחים לצורך התחברות לאפליקציית השליח</p>
            </div>
          </div>
        </header>

        <div className="px-4 md:px-6 mt-4 space-y-4">
          {msg.text && (
            <div
              className={`fade-up rounded-2xl p-3 text-sm border ${
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

          <section className="bg-[#17181d] border border-white/10 rounded-2xl p-4 fade-up card-hover">
            <h3 className="text-sm text-white/80 mb-3">הוספת שליח חדש</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/60 mb-1 block">שם מלא</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="שם השליח"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-white/60 mb-1 block">טלפון</label>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="050-0000000"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="text-xs text-white/60 mb-1 block">שם משתמש</label>
                <input
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Username"
                  autoCapitalize="none"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-white/60 mb-1 block">סיסמה</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30"
                  required
                />
              </div>

              <div className="sm:col-span-2 flex sm:justify-end items-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`rounded-xl px-4 py-2 font-medium transition ${
                    submitting ? "bg-emerald-700/60 cursor-wait" : "bg-emerald-600 hover:bg-emerald-700"
                  } w-full sm:w-auto`}
                >
                  {submitting ? "שומר…" : "הוסף שליח"}
                </button>
              </div>
            </form>
            <p className="text-[12px] text-white/40 mt-2">
              שם המשתמש והסיסמה ישמשו את השליח להתחברות באפליקציית השליח.
            </p>
          </section>

          <section className="bg-[#17181d] border border-white/10 rounded-2xl p-4 fade-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm text-white/80">שליחים קיימים</h3>
              <span className="text-xs text-white/50">{drivers.length} שליחים</span>
            </div>

            {loading ? (
              <div className="grid gap-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="rounded-xl bg-white/5 border border-white/10 h-14 animate-pulse" />
                ))}
              </div>
            ) : drivers.length === 0 ? (
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-white/60">אין שליחים להצגה.</div>
            ) : (
              <ul className="space-y-2">
                {drivers.map((d) => (
                  <li key={d._id} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 card-hover">
                    {editingId === d._id ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="שם מלא"
                          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                        <input
                          value={editForm.phone}
                          onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                          placeholder="טלפון"
                          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                        <div className="sm:col-span-2 flex justify-end gap-2">
                          <button
                            onClick={cancelEdit}
                            disabled={savingEdit}
                            className="text-xs rounded px-3 py-1.5 bg-white/5 hover:bg-white/10 transition"
                          >
                            ביטול
                          </button>
                          <button
                            onClick={() => saveEdit(d._id)}
                            disabled={savingEdit}
                            className={`text-xs rounded px-3 py-1.5 transition ${
                              savingEdit ? "bg-emerald-700/60 cursor-wait" : "bg-emerald-600 hover:bg-emerald-700"
                            }`}
                          >
                            {savingEdit ? "שומר…" : "שמור"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 grid place-items-center text-xs text-emerald-200">
                            {d.name?.charAt(0)?.toUpperCase() || "ש"}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{d.name}</div>
                            <div className="text-[12px] text-white/50">
                              {d.username}
                              {d.phone ? ` · ${d.phone}` : ""}
                            </div>
                            <ZonePills zones={d.zones} />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <OnlineBadge online={!!d.online} />
                          <button
                            onClick={() => toggleActive(d)}
                            disabled={!!statusOps[d._id]}
                            className={`text-[11px] rounded-full px-2 py-[2px] border transition ${
                              d.active === false
                                ? "bg-rose-500/15 text-rose-200 border-rose-500/25 hover:bg-rose-500/25"
                                : "bg-emerald-500/15 text-emerald-200 border-emerald-500/25 hover:bg-emerald-500/25"
                            } ${statusOps[d._id] ? "opacity-70 cursor-wait" : ""}`}
                            title={d.active === false ? "לחץ כדי להפעיל מחדש" : "לחץ כדי להשבית"}
                          >
                            {d.active === false ? "מושבת" : "פעיל"}
                          </button>
                          <button
                            onClick={() => startEdit(d)}
                            className="text-xs rounded px-2 py-1 transition bg-white/10 hover:bg-white/20"
                          >
                            ערוך
                          </button>
                          <button
                            onClick={() => removeDriver(d._id, d.name)}
                            disabled={!!removeOps[d._id]}
                            className={`text-xs rounded px-2 py-1 transition bg-rose-700 hover:bg-rose-800 ${
                              removeOps[d._id] ? "opacity-70 cursor-wait" : ""
                            }`}
                          >
                            {removeOps[d._id] ? "מוחק…" : "מחק"}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
