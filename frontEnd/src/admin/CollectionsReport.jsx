import React, { useState, useEffect } from "react";
import api from "../api";
import SideMenu from "../layouts/SideMenu";

const CollectionsReport = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); // fix timezone offset
    const today = now.toISOString().split("T")[0];
    setFromDate(today);
    setToDate(today);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await api.get(        `/api/admin/collections`,
        {
          params: { startDate: fromDate, endDate: toDate },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setTotal(res.data.totalCommission || 0);
      setError("");
    } catch (err) {
      console.error(err);
      setError("שגיאה בטעינת הנתונים");
      setTotal(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#2a2a2a] text-white relative">
      {/* Mobile Menu Button */}
      <button onClick={() => setIsSidebarOpen(true)} className="md:hidden bg-[#2c2c2e] text-white px-4 py-3">
        ☰ תפריט
      </button>

      {/* Sidebar for desktop */}
      <aside className="w-60 bg-[#2c2c2e] hidden md:block">
        <SideMenu />
      </aside>

      {/* Sidebar for mobile */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-[#2c2c2e] z-50 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:hidden`}
      >
        <div className="flex justify-end p-4">
          <button onClick={() => setIsSidebarOpen(false)} className="text-white text-lg" aria-label="סגור תפריט">
            ❌
          </button>
        </div>
        <SideMenu />
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* Main content */}
      <main className="flex-1 p-5 text-right" dir="rtl">
        <h1 className="text-2xl mb-4 font-bold">דוח גבייה</h1>

        {/* Date Pickers */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <label className="flex items-center gap-2">
            <span>מתאריך:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-[#2a2a2a] border border-white/20 text-white rounded px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2">
            <span>עד תאריך:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-[#2a2a2a] border border-white/20 text-white rounded px-3 py-2"
            />
          </label>
          <button onClick={fetchData} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
            חשב
          </button>
        </div>

        {/* Result Output */}
        {loading && <p className="text-slate-400">טוען...</p>}
        {error && <p className="text-red-400">{error}</p>}
        {total !== null && !loading && <div className="text-xl font-bold">סכום לגבייה: ₪{total.toFixed(2)}</div>}
      </main>
    </div>
  );
};

export default CollectionsReport;
