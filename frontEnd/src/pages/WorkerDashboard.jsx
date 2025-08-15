import React, { useEffect, useState } from "react";
import api from "../api";

export default function WorkerDashboard() {
  const [shifts, setShifts] = useState([]);
  const [activeShift, setActiveShift] = useState(null);
  const token = localStorage.getItem("token");

  const fetchShifts = async () => {
    try {
      const res = await api.get("/api/shifts", { headers: { Authorization: `Bearer ${token}` } });
      setShifts(res.data);
      const active = res.data.find((s) => !s.end);
      setActiveShift(active);
    } catch (err) {
      console.error("Error loading shifts", err);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const startShift = async () => {
    try {
      await api.post("/api/shifts/start", {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchShifts();
    } catch (err) {
      console.error("Start shift failed", err);
    }
  };

  const stopShift = async () => {
    try {
      await api.post("/api/shifts/stop", {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchShifts();
    } catch (err) {
      console.error("Stop shift failed", err);
    }
  };

  // compute monthly hours
  const monthly = shifts.reduce((acc, s) => {
    if (!s.start) return acc;
    const d = new Date(s.start);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const hrs = s.hours || 0;
    acc[key] = (acc[key] || 0) + hrs;
    return acc;
  }, {});

  return (
    <div>
      <h2>Worker Dashboard</h2>
      {activeShift ? (
        <button onClick={stopShift}>Stop Shift</button>
      ) : (
        <button onClick={startShift}>Start Shift</button>
      )}

      <h3>Monthly Hours</h3>
      <ul>
        {Object.entries(monthly).map(([key, hrs]) => (
          <li key={key}>{key}: {hrs.toFixed(2)} hrs</li>
        ))}
      </ul>

      <h3>Shift History</h3>
      <ul>
        {shifts.map((s) => (
          <li key={s._id}>
            {new Date(s.start).toLocaleDateString()} - {(s.hours || 0).toFixed(2)} hrs
            {s.adjustedByManager && s.adjustedAt && (
              <em> (Manager adjusted on {new Date(s.adjustedAt).toLocaleDateString()})</em>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
