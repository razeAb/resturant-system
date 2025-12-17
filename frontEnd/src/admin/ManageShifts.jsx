import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import { useLang } from "../context/LangContext";
import SideMenu from "../layouts/SideMenu";

export default function ManageShifts() {
  const [shifts, setShifts] = useState([]);
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });
  const token = localStorage.getItem("token");
  const { t, dir } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);

  // Helper: calculate hours for a shift (fallback if hours is missing)
  const calcHours = (s) => {
    if (typeof s?.hours === "number") return s.hours;
    if (s?.start && s?.end) {
      const ms = new Date(s.end) - new Date(s.start) - (s.breakMinutes || 0) * 60000;
      return Math.max(ms / 3600000, 0);
    }
    return 0;
  };

  const fetchShifts = async (filters = {}) => {
    try {
      const params = {};
      if (filters.start) params.start = filters.start;
      if (filters.end) params.end = filters.end;

      const res = await api.get("/api/shifts/all", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      setShifts(res.data || []);
    } catch (err) {
      console.error("Failed to load shifts", err);
    }
  };

  useEffect(() => {
    // initial load (no filter)
    fetchShifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const adjustHours = async (id) => {
    const hours = prompt("Enter new hours (e.g. 7.5)");
    if (hours === null || hours === "") return;
    const num = Number(hours);
    if (Number.isNaN(num)) {
      alert("Please enter a valid number");
      return;
    }

    try {
      await api.put(`/api/shifts/${id}`, { hours: num }, { headers: { Authorization: `Bearer ${token}` } });
      // reload with current filter
      fetchShifts(dateFilter);
    } catch (err) {
      console.error("Update failed", err);
    }
  };

  // Total hours for the *current* list (i.e., current filter)
  const totalHours = useMemo(() => shifts.reduce((sum, s) => sum + calcHours(s), 0), [shifts]);

  const applyFilter = () => {
    fetchShifts(dateFilter);
  };

  const clearFilter = () => {
    setDateFilter({ start: "", end: "" });
    fetchShifts({});
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex" dir={dir}>
      <div className="hidden md:block">
        <SideMenu />
      </div>
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <SideMenu onClose={() => setMenuOpen(false)} />
        </div>
      )}

      <main className="flex-1 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{t("manageShifts.title", "Manage Shifts")}</h2>
          <button
            className="md:hidden inline-flex items-center px-3 py-2 rounded-lg bg-black text-white"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
        </div>

      {/* Filter by date */}
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="text-lg font-semibold mb-2">{t("manageShifts.filterTitle", "Filter by date")}</h4>
          <div className="flex flex-wrap gap-3 items-center">
            <label className="flex items-center gap-2 text-sm">
              {t("manageShifts.from", "From")}
              <input
                type="date"
                className="rounded border border-slate-300 px-2 py-1"
                value={dateFilter.start}
                onChange={(e) => setDateFilter((prev) => ({ ...prev, start: e.target.value }))}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              {t("manageShifts.to", "To")}
              <input
                type="date"
                className="rounded border border-slate-300 px-2 py-1"
                value={dateFilter.end}
                onChange={(e) => setDateFilter((prev) => ({ ...prev, end: e.target.value }))}
              />
            </label>
            <button className="rounded bg-emerald-600 text-white px-3 py-1 text-sm" onClick={applyFilter}>
              {t("manageShifts.apply", "Apply filter")}
            </button>
            <button className="rounded bg-slate-200 px-3 py-1 text-sm" onClick={clearFilter}>
              {t("manageShifts.clear", "Clear")}
            </button>
          </div>
          <div className="mt-3 font-semibold">
            {t("manageShifts.total", "Total hours (current filter):")} {totalHours.toFixed(2)}
          </div>
        </div>

        {/* Shifts list */}
        <ul className="space-y-2">
          {shifts.map((s) => {
            const hours = calcHours(s);
            return (
              <li key={s._id} className="rounded border border-slate-200 bg-white p-3 shadow-sm flex flex-wrap gap-2 items-center">
                <span className="font-medium">{s.user?.name || t("manageShifts.userFallback", "User")}</span>
                <span>-</span>
                <span>{s.start ? new Date(s.start).toLocaleDateString() : t("manageShifts.noDate", "No date")}</span>
                <span className="ml-auto text-sm font-semibold">
                  {hours.toFixed(2)} {t("manageShifts.hoursLabel", "hrs")}
                </span>
                <button
                  className="ml-2 rounded bg-blue-600 text-white px-3 py-1 text-sm"
                  onClick={() => adjustHours(s._id)}
                >
                  {t("manageShifts.adjust", "Adjust hours")}
                </button>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
