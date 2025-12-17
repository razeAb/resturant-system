import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import { useLang } from "../context/LangContext";

export default function ManageShifts() {
  const [shifts, setShifts] = useState([]);
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });
  const token = localStorage.getItem("token");
  const { t, dir } = useLang();

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
    <div style={{ padding: "16px" }} dir={dir}>
      <h2>{t("manageShifts.title", "Manage Shifts")}</h2>

      {/* Filter by date */}
      <div
        style={{
          margin: "12px 0",
          padding: "8px",
          border: "1px solid #ddd",
          borderRadius: 8,
        }}
      >
        <h4>{t("manageShifts.filterTitle", "Filter by date")}</h4>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <label>
            {t("manageShifts.from", "From")}{" "}
            <input type="date" value={dateFilter.start} onChange={(e) => setDateFilter((prev) => ({ ...prev, start: e.target.value }))} />
          </label>
          <label>
            {t("manageShifts.to", "To")}:{" "}
            <input type="date" value={dateFilter.end} onChange={(e) => setDateFilter((prev) => ({ ...prev, end: e.target.value }))} />
          </label>
          <button onClick={applyFilter}>{t("manageShifts.apply", "Apply filter")}</button>
          <button onClick={clearFilter}>{t("manageShifts.clear", "Clear")}</button>
        </div>

        {/* Total hours for current filter */}
        <div style={{ marginTop: 8, fontWeight: "bold" }}>
          {t("manageShifts.total", "Total hours (current filter):")} {totalHours.toFixed(2)}
        </div>
      </div>

      {/* Shifts list */}
      <ul>
        {shifts.map((s) => {
          const hours = calcHours(s);
          return (
            <li key={s._id} style={{ marginBottom: 6 }}>
              {s.user?.name || t("manageShifts.userFallback", "User")} - {s.start ? new Date(s.start).toLocaleDateString() : t("manageShifts.noDate", "No date")} :{" "}
              {hours.toFixed(2)} {t("manageShifts.hoursLabel", "hrs")}{" "}
              <button onClick={() => adjustHours(s._id)}>{t("manageShifts.adjust", "Adjust hours")}</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
