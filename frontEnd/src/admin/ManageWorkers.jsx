import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import api from "../api";
import SideMenu from "../layouts/SideMenu";
import { Menu } from "lucide-react";

/** Small inline animation utilities (like other pages) */
const Anim = () => (
  <style>{`
  :root { --anim: 220ms; --ease: cubic-bezier(.2,.8,.2,1); }
  .fade-up { animation: fadeUp var(--anim) var(--ease) both; }
  @keyframes fadeUp { from { opacity:0; transform: translateY(10px);} to { opacity:1; transform: translateY(0);} }
  .card-hover { transition: transform 140ms var(--ease), box-shadow 140ms var(--ease); }
  .card-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,.2); }
  `}</style>
);

// --- helpers to make data robust ---
const toBool = (v) => {
  // normalize potentially string/number booleans from backend
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toLowerCase() === "true";
  return !!v;
};

// get the worker id from a shift object in a defensive way
const getShiftWorkerId = (s) =>
  s?.user?._id ||
  s?.userId ||
  s?.user ||
  s?.worker?._id ||
  s?.workerId ||
  s?.worker ||
  s?.employee?._id ||
  s?.employeeId ||
  s?.employee ||
  null;

const ManageWorkers = () => {
  const [workers, setWorkers] = useState([]);
  const [formData, setFormData] = useState({ username: "", password: "", role: "cook" });
  const [msg, setMsg] = useState({ text: "", tone: "neutral" });
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [expanded, setExpanded] = useState(null);
  const [shiftsMap, setShiftsMap] = useState({});
  const [shiftsLoading, setShiftsLoading] = useState({}); // { [workerId]: true/false }

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await api.get("/api/workers", { headers: { Authorization: `Bearer ${token}` } });
      const list = Array.isArray(res.data?.workers) ? res.data.workers : [];

      // ✅ normalize onShift to a true boolean
      const normalized = list.map((w) => ({
        ...w,
        onShift: toBool(w?.onShift),
      }));

      setWorkers(normalized);
    } catch (err) {
      console.error("Error fetching workers", err);
      setMsg({ text: "שגיאה בטעינת העובדים", tone: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const handleChange = (e) => setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ text: "", tone: "neutral" });
    try {
      const token = localStorage.getItem("token");
      await api.post("/api/workers", formData, { headers: { Authorization: `Bearer ${token}` } });
      setFormData({ username: "", password: "", role: "cook" });
      setMsg({ text: "העובד נוסף בהצלחה", tone: "success" });
      fetchWorkers();
    } catch (err) {
      setMsg({ text: err.response?.data?.message || "שגיאה בהוספת עובד", tone: "error" });
    }
  };

  const fetchShiftsForWorker = async (id) => {
    try {
      setShiftsLoading((m) => ({ ...m, [id]: true }));
      const token = localStorage.getItem("token");

      // If your backend supports filtering by query, prefer this:
      // const res = await api.get(`/api/shifts?user=${id}`, { headers: { Authorization: `Bearer ${token}` } });

      // Fallback: get all shifts, then filter on client:
      const res = await api.get("/api/shifts/all", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const all = Array.isArray(res.data) ? res.data : [];
      const workerShifts = all.filter((s) => {
        const sid = getShiftWorkerId(s);
        return sid && String(sid) === String(id);
      });

      setShiftsMap((p) => ({ ...p, [id]: workerShifts }));
    } catch (err) {
      console.error("Failed to load shifts", err);
      setMsg({ text: "שגיאה בטעינת משמרות לעובד", tone: "error" });
      setShiftsMap((p) => ({ ...p, [id]: [] }));
    } finally {
      setShiftsLoading((m) => ({ ...m, [id]: false }));
    }
  };

  const toggleShifts = (id) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!shiftsMap[id]) fetchShiftsForWorker(id);
  };

  const adjustHours = async (shiftId, workerId) => {
    const hoursStr = prompt("Enter new hours");
    if (hoursStr == null || hoursStr === "") return;
    const hours = Number(hoursStr);
    if (Number.isNaN(hours)) {
      alert("Hours must be a number");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await api.put(`/api/shifts/${shiftId}`, { hours }, { headers: { Authorization: `Bearer ${token}` } });
      // refresh that worker's shifts
      fetchShiftsForWorker(workerId);
      setMsg({ text: "שעות עודכנו בהצלחה", tone: "success" });
    } catch (err) {
      console.error("Update failed", err);
      setMsg({ text: "שגיאה בעדכון שעות", tone: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1415] text-white flex" dir="rtl">
      <Anim />

      {/* Sidebar desktop */}
      <div className="hidden md:block">
        <SideMenu logoSrc="/developerTag.jpeg" brand="Hungry" />
      </div>

      {/* Mobile overlay + drawer */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      {isSidebarOpen && (
        <div className="md:hidden">
          <SideMenu onClose={() => setIsSidebarOpen(false)} logoSrc="/developerTag.jpeg" brand="Hungry" />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
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
              <h1 className="text-base md:text-lg font-semibold">ניהול עובדים</h1>
              <p className="text-white/50 text-xs">הוסף עובדים, צפייה בתפקידים ומצב משמרת</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-4 md:px-6 mt-4 space-y-4">
          {/* Message / Toast */}
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

          {/* Form Card */}
          <section className="bg-[#17181d] border border-white/10 rounded-2xl p-4 fade-up card-hover">
            <h3 className="text-sm text-white/80 mb-3">הוספת עובד חדש</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-1">
                <label className="text-xs text-white/60 mb-1 block">שם משתמש</label>
                <input
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Username"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30"
                  required
                />
              </div>

              <div className="sm:col-span-1">
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

              <div className="sm:col-span-1">
                <label className="text-xs text-white/60 mb-1 block">תפקיד</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="cook">טבח</option>
                  <option value="waiter">מלצר</option>
                  <option value="dishwasher">שוטף כלים</option>
                </select>
              </div>

              <div className="sm:col-span-1 flex sm:justify-end items-end">
                <button
                  type="submit"
                  className={`rounded-xl px-4 py-2 font-medium transition ${
                    loading ? "bg-emerald-700/60 cursor-wait" : "bg-emerald-600 hover:bg-emerald-700"
                  } w-full sm:w-auto`}
                >
                  {loading ? "שומר…" : "הוסף עובד"}
                </button>
              </div>
            </form>
            <p className="text-[12px] text-white/40 mt-2">נתוני גישה נשמרים בבקאנד. כאן רק מוסיפים משתמש ותפקיד.</p>
          </section>

          {/* Workers List */}
          <section className="bg-[#17181d] border border-white/10 rounded-2xl p-4 fade-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm text-white/80">עובדים קיימים</h3>
              <span className="text-xs text-white/50">{workers.length} עובדים</span>
            </div>

            {loading ? (
              <div className="grid gap-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="rounded-xl bg-white/5 border border-white/10 h-14 animate-pulse" />
                ))}
              </div>
            ) : workers.length === 0 ? (
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-white/60">אין עובדים להצגה.</div>
            ) : (
              <ul className="space-y-2">
                {workers.map((w) => {
                  const isOnShift = toBool(w.onShift); // ✅ use normalized boolean
                  const isExp = expanded === w._id;
                  const isShiftsLoading = !!shiftsLoading[w._id];

                  return (
                    <li key={w._id} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 card-hover">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 grid place-items-center text-xs text-emerald-200">
                            {w.username?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{w.username}</div>
                            <div className="text-[12px] text-white/50 flex items-center gap-2">
                              <RoleBadge role={w.role} />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleShifts(w._id)} className="text-xs bg-blue-600 hover:bg-blue-700 rounded px-2 py-1">
                            {isExp ? "סגור" : "שעות"}
                          </button>
                          {isOnShift && <ShiftBadge />}
                        </div>
                      </div>

                      {isExp && (
                        <div className="mt-2">
                          {isShiftsLoading ? (
                            <div className="text-xs text-white/60">טוען משמרות…</div>
                          ) : (
                            <ul className="space-y-1">
                              {Array.isArray(shiftsMap[w._id]) && shiftsMap[w._id].length > 0 ? (
                                shiftsMap[w._id].map((s) => (
                                  <li
                                    key={s._id}
                                    className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs"
                                  >
                                    <span>
                                      {new Date(s.start).toLocaleDateString("he-IL")} — {(s.hours || 0).toFixed(2)}h
                                      {s.adjustedByManager && <span className="ml-1 text-orange-400">(עודכן)</span>}
                                    </span>
                                    <button
                                      onClick={() => adjustHours(s._id, w._id)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2 py-[2px]"
                                    >
                                      עדכון
                                    </button>
                                  </li>
                                ))
                              ) : (
                                <li className="text-xs text-white/60">אין משמרות.</li>
                              )}
                            </ul>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

/** Badges */
function RoleBadge({ role }) {
  const map = {
    cook: { text: "טבח", bg: "bg-amber-500/15", textc: "text-amber-200", border: "border-amber-500/25" },
    waiter: { text: "מלצר", bg: "bg-sky-500/15", textc: "text-sky-200", border: "border-sky-500/25" },
    dishwasher: { text: "שוטף כלים", bg: "bg-fuchsia-500/15", textc: "text-fuchsia-200", border: "border-fuchsia-500/25" },
  };
  const style = map[role] || { text: role, bg: "bg-white/5", textc: "text-white/70", border: "border-white/10" };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[11px] border ${style.bg} ${style.textc} ${style.border}`}
    >
      {style.text}
    </span>
  );
}

RoleBadge.propTypes = {
  role: PropTypes.string,
};

function ShiftBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[11px] bg-emerald-500/15 text-emerald-200 border border-emerald-500/25">
      ● במשמרת
    </span>
  );
}

export default ManageWorkers;
