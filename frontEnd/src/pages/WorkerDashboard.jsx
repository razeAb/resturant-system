import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function WorkingHoursPage() {
  const navigate = useNavigate();

  // read token once
  const token = localStorage.getItem("workerToken");

  const [shifts, setShifts] = useState([]);
  const [worker, setWorker] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("worker")) || {
          name: "",
          username: "",
          role: "",
          avatar: "",
          onShift: false,
        }
      );
    } catch {
      return { name: "", username: "", role: "", avatar: "", onShift: false };
    }
  });

  const [range, setRange] = useState({ from: null, to: null });

  /** role translations */
  const roleOptions = {
    cook: "טבח",
    waiter: "מלצר",
    dishwasher: "שוטף כלים",
    cashier: "קופאי",
    delivery: "שליח",
    admin: "מנהל",
  };

  /** Fetch shifts and sync onShift by active record (start w/o end) */
  const fetchShifts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get("/api/shifts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data || [];
      setShifts(data);

      const active = data.find((s) => s.start && !s.end);
      setWorker((prev) => {
        const stored = (() => {
          try {
            return JSON.parse(localStorage.getItem("worker") || "{}");
          } catch {
            return {};
          }
        })();
        return { ...prev, ...stored, onShift: !!active };
      });
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  /** Redirect to login if no token; otherwise load shifts on mount */
  useEffect(() => {
    if (!token) {
      navigate("/worker/login");
      return;
    }
    fetchShifts();
  }, [token, navigate, fetchShifts]);

  /** Actions */
  const handleStartShift = async () => {
    try {
      await api.post("/api/shifts/start", {}, { headers: { Authorization: `Bearer ${token}` } });
      setWorker((w) => ({ ...w, onShift: true }));
      fetchShifts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEndShift = async () => {
    try {
      await api.post("/api/shifts/stop", {}, { headers: { Authorization: `Bearer ${token}` } });
      setWorker((w) => ({ ...w, onShift: false }));
      fetchShifts();
    } catch (e) {
      console.error(e);
    }
  };

  /* ======================= Date helpers (local, inclusive) ======================= */
  // parse "YYYY-MM-DD" as a LOCAL date (avoid UTC shift)
  const parseYMDLocal = (ymd) => {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const startOfDayLocal = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const endOfDayLocal = (d) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };

  // include any shift that OVERLAPS the selected range
  const overlapsRange = (start, end) => {
    if (!start) return false;
    const s = new Date(start);
    const e = end ? new Date(end) : s;

    const from = range.from ? startOfDayLocal(parseYMDLocal(range.from)) : new Date(-8640000000000000);
    const to = range.to ? endOfDayLocal(parseYMDLocal(range.to)) : new Date(8640000000000000);

    return s <= to && e >= from;
  };

  /* ---------- Derived data ---------- */
  const filtered = useMemo(() => (range.from || range.to ? shifts.filter((s) => overlapsRange(s.start, s.end)) : shifts), [shifts, range]);

  const formatH = (h) => Number(h || 0).toFixed(2);

  const stats = useMemo(() => {
    const daysWorked = filtered.filter((s) => s.start && s.end).length;
    const daysLate = filtered.filter((s) => s.isLate).length;
    const daysLeave = filtered.filter((s) => s.isLeave).length;
    const breakHrs = filtered.reduce((sum, s) => sum + (s.breakMinutes ? s.breakMinutes / 60 : 0), 0) || 0;
    const absentDays = filtered.filter((s) => s.isAbsent).length;
    const overtimeHrs = filtered.reduce((sum, s) => sum + (s.overtimeHours || 0), 0) || 0;
    const permissions = filtered.filter((s) => s.permissionTaken).length; // kept if needed later
    const workedHrs = filtered.reduce((sum, s) => sum + (s.hours || 0), 0) || 0;

    return { daysWorked, daysLate, daysLeave, breakHrs, absentDays, overtimeHrs, permissions, workedHrs };
  }, [filtered]);

  const toDateStr = (v) => (v ? new Date(v).toLocaleDateString("he-IL") : "");
  const toTime = (v) => (v ? new Date(v).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", hour12: false }) : "--:--");

  return (
    <div className="min-h-screen bg-[#f6f7fb] p-6" dir="rtl">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Nicer RTL back button (no external deps) */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-slate-800 text-white rounded-full px-4 py-2 shadow hover:bg-slate-700 transition"
            title="חזור"
          >
            {/* arrow pointing RIGHT (fits RTL “back”) */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M10 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-sm font-medium">חזור</span>
          </button>

          <h1 className="text-3xl font-extrabold text-[#101010]">שעות עבודה</h1>
        </div>

        {/* shift buttons + worker name */}
        <div className="flex items-center gap-4">
          <span className="text-base font-semibold text-gray-800">{worker.name || worker.username || "עובד"}</span>

          {worker.onShift ? (
            <button onClick={handleEndShift} className="bg-red-500 text-white rounded-full px-4 py-2 shadow-sm">
              סיום משמרת
            </button>
          ) : (
            <button onClick={handleStartShift} className="bg-green-500 text-white rounded-full px-4 py-2 shadow-sm">
              התחלת משמרת
            </button>
          )}
        </div>
      </header>

      {/* Stats + profile */}
      <section className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-md p-4 md:p-5 border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Worker card */}
            <div className="flex-1 md:max-w-xs">
              <div className="bg-[#cfe5ff] rounded-xl h-full p-4 flex items-center gap-4">
                <div>
                  <div className="font-semibold text-slate-900">{worker.name || worker.username || "שם העובד"}</div>
                  <div className="text-sm text-slate-700">{roleOptions[worker.role] || worker.role || "תפקיד"}</div>
                </div>
              </div>
            </div>

            {/* Stat chips */}
            <div className="flex-[3] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              {[
                { title: "ימים", sub: "עבד", val: stats.daysWorked },
                { title: "ימים", sub: "איחור", val: stats.daysLate },
                { title: "ימים", sub: "חופשה", val: stats.daysLeave },
                { title: "שעות", sub: "הפסקה", val: formatH(stats.breakHrs) },
                { title: "ימים", sub: "היעדרות", val: stats.absentDays },
                { title: "שעות", sub: "שעות נוספות", val: formatH(stats.overtimeHrs) },
                { title: "שעות", sub: "שעות עבודה", val: formatH(stats.workedHrs) },
              ].map((it, idx) => (
                <div key={idx} className="bg-slate-800 text-white rounded-xl px-4 py-3 flex flex-col items-center justify-center">
                  <div className="text-2xl font-bold">{it.val}</div>
                  <div className="text-[11px] opacity-90">{it.title}</div>
                  <div className="text-[11px] opacity-80">{it.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="mt-4">
            <div className="text-sm text-slate-600 mb-2">מתאריך עד תאריך</div>
            <div className="flex items-center justify-end gap-2">
              <label className="text-xs text-slate-600 flex flex-col">
                <span className="mb-1">מתאריך</span>
                <input
                  type="date"
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={range.from || ""}
                  onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                />
              </label>

              <span className="text-gray-500 text-sm">–</span>

              <label className="text-xs text-slate-600 flex flex-col">
                <span className="mb-1">עד תאריך</span>
                <input
                  type="date"
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={range.to || ""}
                  onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                />
              </label>

              <button
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => setRange({ from: null, to: null })}
              >
                ניקוי טווח
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="max-w-7xl mx-auto mt-6">
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#f1f3f6] text-slate-600">
              <tr className="[&>th]:py-3 [&>th]:px-4 text-right">
                <th>פעולה</th>
                <th>תאריך</th>
                <th>משמרת</th>
                <th>כניסה</th>
                <th>יציאה</th>
                <th>הפסקה</th>
                <th>שעות נוספות</th>
                <th>שעות עבודה</th>
                <th>שעות זכות חופשה</th>
                <th>סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s._id} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">▸</td>
                  <td className="py-3 px-4">{toDateStr(s.start)}</td>
                  <td className="py-3 px-4">{s.shiftName || "כללי"}</td>
                  <td className="py-3 px-4">{toTime(s.start)}</td>
                  <td className="py-3 px-4">{toTime(s.end)}</td>
                  <td className="py-3 px-4">{s.breakMinutes ? (s.breakMinutes / 60).toFixed(2) : "00.00"}</td>
                  <td className="py-3 px-4">
                    <span className={s.adjustedByManager ? "border border-orange-400 text-orange-600 rounded px-1" : ""}>
                      {formatH(s.hours)}
                    </span>
                    {s.adjustedByManager && <span className="ml-1 text-orange-500 text-xs">עודכן</span>}
                  </td>{" "}
                  <td className="py-3 px-4">
                    <span className={s.adjustedByManager ? "border border-orange-400 text-orange-600 rounded px-1" : ""}>
                      {formatH(s.hours)}
                    </span>
                    {s.adjustedByManager && <span className="ml-1 text-orange-500 text-xs">עודכן</span>}
                  </td>{" "}
                  <td className="py-3 px-4">{s.leaveCreditHours ? s.leaveCreditHours.toFixed(2) : "00.00"}</td>
                  <td className="py-3 px-4">
                    {s.status === "P" ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-emerald-600 text-white text-xs">P</span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td className="py-6 px-4 text-center text-gray-500" colSpan={10}>
                    אין נתונים לתצוגה בטווח שנבחר.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
