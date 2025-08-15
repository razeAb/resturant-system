import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function WorkingHoursPage() {
  const navigate = useNavigate();
  const [shifts, setShifts] = useState([]);
  const [worker, setWorker] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("worker")) || { name: "", role: "", avatar: "", onShift: false };
    } catch {
      return { name: "", role: "", avatar: "", onShift: false };
    }
  });
  const [range, setRange] = useState({ from: null, to: null });
  const token = localStorage.getItem("workerToken");

  const fetchShifts = async () => {
    try {
      const res = await api.get("/api/shifts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data || [];
      setShifts(data);

      // סנכרון onShift לפי מצב בפועל בשרת (יש משמרת ללא end?)
      const active = data.find((s) => s.start && !s.end);
      setWorker((w) => ({ ...w, ...JSON.parse(localStorage.getItem("worker") || "{}"), onShift: !!active }));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/worker/login");
      return;
    }
    fetchShifts();
  }, [token, navigate]);

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

  /* ---------- עזרי חישוב ---------- */
  const inRange = (date) => {
    if (!date) return false;
    const d = new Date(date);
    if (range.from && d < new Date(range.from)) return false;
    if (range.to && d > new Date(range.to)) return false;
    return true;
  };

  const filtered = useMemo(() => (range.from || range.to ? shifts.filter((s) => inRange(s.start)) : shifts), [shifts, range]);

  const formatH = (h) => Number(h || 0).toFixed(2);

  const stats = useMemo(() => {
    const daysWorked = filtered.filter((s) => s.start && s.end).length;
    const daysLate = filtered.filter((s) => s.isLate).length;
    const daysLeave = filtered.filter((s) => s.isLeave).length;
    const breakHrs = filtered.reduce((sum, s) => sum + (s.breakMinutes ? s.breakMinutes / 60 : 0), 0) || 0;
    const absentDays = filtered.filter((s) => s.isAbsent).length;
    const overtimeHrs = filtered.reduce((sum, s) => sum + (s.overtimeHours || 0), 0) || 0;
    const permissions = filtered.filter((s) => s.permissionTaken).length;
    const workedHrs = filtered.reduce((sum, s) => sum + (s.hours || 0), 0) || 0;

    return { daysWorked, daysLate, daysLeave, breakHrs, absentDays, overtimeHrs, permissions, workedHrs };
  }, [filtered]);

  const toDateStr = (v) => (v ? new Date(v).toLocaleDateString("he-IL") : "");
  const toTime = (v) => (v ? new Date(v).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", hour12: false }) : "--:--");

  return (
    <div className="min-h-screen bg-[#f6f7fb] p-6" dir="rtl">
      {/* כותרת */}
      <header className="max-w-7xl mx-auto flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="bg-white rounded-full px-3 py-2 shadow-sm border border-gray-200" title="חזרה">
            ⬅️
          </button>
          <h1 className="text-3xl font-extrabold text-[#101010]">שעות עבודה</h1>
        </div>

        <div className="flex items-center gap-3">
          {worker.onShift ? (
            <button onClick={handleEndShift} className="bg-red-500 text-white rounded-full px-4 py-2 shadow-sm">
              סיום משמרת
            </button>
          ) : (
            <button onClick={handleStartShift} className="bg-green-500 text-white rounded-full px-4 py-2 shadow-sm">
              התחלת משמרת
            </button>
          )}

          <div className="flex items-center gap-2 bg-white rounded-full px-3 py-2 shadow-sm border border-gray-200">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
              {worker.avatar ? (
                <img src={worker.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-sm text-gray-500">👤</div>
              )}
            </div>
            <span className="text-sm font-medium text-gray-700">{worker.name || "עובד"}</span>
            <button className="text-gray-500" title="הגדרות">
              ⚙️
            </button>
          </div>
        </div>
      </header>

      {/* כרטיס סטטיסטיקות + פרופיל */}
      <section className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-md p-4 md:p-5 border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            {/* כרטיס עובד */}
            <div className="flex-1 md:max-w-xs">
              <div className="bg-[#cfe5ff] rounded-xl h-full p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-white shadow">
                  {worker.avatar ? (
                    <img src={worker.avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-lg">👤</div>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{worker.name || "שם העובד"}</div>
                  <div className="text-sm text-slate-700">{worker.role || "תפקיד"}</div>
                </div>
              </div>
            </div>

            {/* צ'יפים כהים של סטטיסטיקות */}
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

          {/* טווח תאריכים */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <input
              type="date"
              className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={range.from || ""}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            />
            <span className="text-gray-500 text-sm">–</span>
            <input
              type="date"
              className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={range.to || ""}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            />
            <button
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => setRange({ from: null, to: null })}
            >
              ניקוי טווח
            </button>
          </div>
        </div>
      </section>

      {/* טבלה */}
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
                  <td className="py-3 px-4">
                    {s.shiftName || "כללי"}
                    {/* General */}
                  </td>
                  <td className="py-3 px-4">{toTime(s.start)}</td>
                  <td className="py-3 px-4">{toTime(s.end)}</td>
                  <td className="py-3 px-4">{s.breakMinutes ? (s.breakMinutes / 60).toFixed(2) : "00.00"}</td>
                  <td className="py-3 px-4">{formatH(s.overtimeHours)}</td>
                  <td className="py-3 px-4">{formatH(s.hours)}</td>
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
