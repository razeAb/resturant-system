import React, { useEffect, useState } from "react";
import api from "../api";

export default function ManageShifts() {
  const [shifts, setShifts] = useState([]);
  const token = localStorage.getItem("token");

  const fetchShifts = async () => {
    try {
      const res = await api.get("/api/shifts/all", { headers: { Authorization: `Bearer ${token}` } });
      setShifts(res.data);
    } catch (err) {
      console.error("Failed to load shifts", err);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const adjustHours = async (id) => {
    const hours = prompt("Enter new hours");
    if (!hours) return;
    try {
      await api.put(`/api/shifts/${id}`, { hours }, { headers: { Authorization: `Bearer ${token}` } });
      fetchShifts();
    } catch (err) {
      console.error("Update failed", err);
    }
  };

  return (
    <div>
      <h2>Manage Shifts</h2>
      <ul>
        {shifts.map((s) => (
          <li key={s._id}>
            {s.user?.name || "User"} - {new Date(s.start).toLocaleDateString()} : {(s.hours || 0).toFixed(2)} hrs
            <button onClick={() => adjustHours(s._id)}>Adjust Hours</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
