import React, { useState, useEffect } from "react";
import api from "../api";
import SideMenu from "../layouts/SideMenu";
import { Menu } from "lucide-react";

const ILS = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 2,
});

export default function CollectionsReport() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // default both dates to "today" in local tz
  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const today = now.toISOString().split("T")[0];
    setFromDate(today);
    setToDate(today);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await api.get("/api/admin/collections", {
        params: { startDate: fromDate, endDate: toDate },
        headers: { Authorization: `Bearer ${token}` },
      });
      setTotal(res?.data?.totalCommission ?? 0);
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
    <div className="min-h-screen bg-[#0f1415] text-white flex" dir="rtl">
      {/* Sidebar desktop */}
      <div className="hidden md:block">
        <SideMenu logoSrc="/developerTag.jpeg" brand="Hungry" />
      </div>

      {/* Mobile overlay + drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
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
              <h1 className="text-base md:text-lg font-semibold">דוח גבייה</h1>
              <p className="text-white/50 text-xs">חשב עמלות לתקופה נבחרת</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-4 md:px-6 mt-4 space-y-4">
          {/* Filters card */}
          <section className="bg-[#17181d] border border-white/10 rounded-2xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-sm">
                <span className="text-white/80 shrink-0">מתאריך:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <span className="text-white/80 shrink-0">עד תאריך:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </label>

              <div className="flex sm:justify-end">
                <button
                  onClick={fetchData}
                  disabled={!fromDate || !toDate || loading}
                  className={`w-full sm:w-auto rounded-xl px-4 py-2 font-medium transition
                    ${loading ? "bg-emerald-700/60 cursor-wait" : "bg-emerald-600 hover:bg-emerald-700"}
                  `}
                >
                  {loading ? "מחשב…" : "חשב"}
                </button>
              </div>
            </div>

            {/* helper text */}
            <p className="text-[12px] text-white/40 mt-3">
              בחר טווח תאריכים ולאחר מכן לחץ על "חשב". התוצאה תופיע למטה.
            </p>
          </section>

          {/* Result / status */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-2xl p-4 text-sm">
              {error}
            </div>
          )}

          <section className="bg-[#17181d] border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm text-white/60">סכום לגבייה</h3>
                <div className="mt-1 text-2xl font-extrabold tracking-tight">
                  {total === null && !loading ? "—" : ILS.format(total || 0)}
                </div>
              </div>

              {/* small period badge */}
              <div className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                {fromDate || "—"} — {toDate || "—"}
              </div>
            </div>

            {/* subtle divider */}
            <div className="h-px bg-white/10 my-4" />

            {/* tips / placeholders for future breakdowns */}
            <div className="text-[12px] text-white/50">
              ניתן להוסיף בהמשך פירוט עמלות לפי קטגוריה/שליח/שעות.
            </div>
          </section>

          {/* Footer line */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-white/50 text-[12px]">
            <div>טווח נוכחי: {fromDate || "—"} עד {toDate || "—"}</div>
            <div className="text-white/40">מועדון Hungry</div>
          </div>
        </div>
      </div>
    </div>
  );
}
