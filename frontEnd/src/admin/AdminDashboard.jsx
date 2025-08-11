import React, { useEffect, useMemo, useState, useCallback } from "react";
import api from "../api";
import { ORDER_STATUS } from "../../constants/orderStatus";
import Button from "../components/common/Button";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

/** Utils **/
const ILS = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 2 });
const toYMD = (d) => {
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  } catch {
    return "";
  }
};
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export default function AdminDashboard() {
  // data
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [restaurantOpen, setRestaurantOpen] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  // filters
  const todayYMD = toYMD(new Date());
  const [selectedDate, setSelectedDate] = useState(todayYMD);
  const [period, setPeriod] = useState(() => {
    const to = new Date();
    const from = addDays(to, -29); // last 30 days
    return { from: toYMD(from), to: toYMD(to) };
  });
  const [showPeriod, setShowPeriod] = useState(false);

  /** Fetch **/
  const fetchDashboard = useCallback(async (signal) => {
    try {
      setIsLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const res = await api.get("/api/admin/dashboard", { headers: { Authorization: `Bearer ${token}` }, signal });
      const data = res?.data ?? {};

      data.products = Array.isArray(data.products) ? data.products : [];
      data.orders = Array.isArray(data.orders) ? data.orders : [];
      data.topCustomers = Array.isArray(data.topCustomers) ? data.topCustomers : [];
      data.hotProducts = Array.isArray(data.hotProducts) ? data.hotProducts : [];
      data.coldProducts = Array.isArray(data.coldProducts) ? data.coldProducts : [];

      setDashboardData(data);
      setRestaurantOpen(data.products.length > 0 && data.products.every((p) => !!p.isActive));
    } catch (err) {
      if (err?.name !== "CanceledError" && err?.message !== "canceled") {
        console.error("Error fetching admin data:", err);
        setError("שגיאה בטעינת לוח הבקרה");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboard(controller.signal);
    return () => controller.abort();
  }, [fetchDashboard, selectedDate, period]);

  /** Derived helpers **/
  const ordersInPeriod = useMemo(() => {
    if (!dashboardData?.orders) return [];
    const from = period.from;
    const to = period.to;
    return dashboardData.orders.filter((o) => {
      const ymd = toYMD(o?.createdAt);
      return ymd >= from && ymd <= to;
    });
  }, [dashboardData, period]);

  /** KPIs (daily) **/
  const daily = useMemo(() => {
    const day = selectedDate;
    const orders = dashboardData?.orders ?? [];
    const isDay = (o) => toYMD(o?.createdAt) === day;
    const ordersToday = orders.filter(isDay);
    const delivered = ordersToday.filter((o) => o?.status === ORDER_STATUS.DONE);
    const canceled = ordersToday.filter((o) => o?.status === ORDER_STATUS.CANCELED);
    const revenue = delivered.reduce((sum, o) => sum + (Number(o?.totalPrice) || 0), 0);
    return {
      totalOrders: ordersToday.length,
      delivered: delivered.length,
      canceled: canceled.length,
      revenue,
    };
  }, [dashboardData, selectedDate]);

  /** Charts data (period) **/
  const pieData = useMemo(() => {
    const total = ordersInPeriod.length || 1;
    const done = ordersInPeriod.filter((o) => o.status === ORDER_STATUS.DONE).length;
    const canceled = ordersInPeriod.filter((o) => o.status === ORDER_STATUS.CANCELED).length;
    const other = Math.max(total - done - canceled, 0);
    return [
      { name: "בוצעו", value: done, color: "#10b981" },
      { name: "בוטלו", value: canceled, color: "#ef4444" },
      { name: "אחר", value: other, color: "#60a5fa" },
    ];
  }, [ordersInPeriod]);

  const weeklyBar = useMemo(() => {
    // group by weekday (Sun-Sat)
    const days = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];
    const counts = new Array(7).fill(0);
    ordersInPeriod.forEach((o) => {
      const d = new Date(o.createdAt);
      const idx = (d.getDay() + 6) % 7; // make Monday index=0? keep RTL Sunday=0 -> customize
      counts[idx]++;
    });
    return days.map((name, i) => ({ name, orders: counts[i] }));
  }, [ordersInPeriod]);

  const monthlyRevenue = useMemo(() => {
    // build from period (by month label)
    const map = new Map();
    ordersInPeriod.forEach((o) => {
      if (o.status !== ORDER_STATUS.DONE) return;
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("he-IL", { month: "short" });
      const cur = map.get(key) || { name: label, revenue: 0 };
      cur.revenue += Number(o.totalPrice) || 0;
      map.set(key, cur);
    });
    return Array.from(map.values());
  }, [ordersInPeriod]);

  /** Actions **/
  const handleToggleRestaurant = async (open) => {
    if (!dashboardData) return;
    setIsToggling(true);
    const prev = dashboardData.products;

    // optimistic UI
    setDashboardData((d) => ({ ...d, products: d.products.map((p) => ({ ...p, isActive: open })) }));
    setRestaurantOpen(open);

    try {
      const token = localStorage.getItem("token");
      const endpoint = open ? "/api/products/activate-all" : "/api/products/deactivate-all";
      await api.patch(endpoint, {}, { headers: { Authorization: `Bearer ${token}` } });
      await fetchDashboard();
    } catch (err) {
      console.error("שגיאה בעדכון סטטוס מסעדה:", err);
      setDashboardData((d) => ({ ...d, products: prev }));
      setRestaurantOpen(prev.every((p) => p.isActive));
    } finally {
      setIsToggling(false);
    }
  };

  /** UI **/
  if (error) {
    return (
      <div className="min-h-screen bg-[#0f141c] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button title="נסה שוב" onClick={() => fetchDashboard()} />
        </div>
      </div>
    );
  }

  if (isLoading || !dashboardData) {
    return (
      <div className="min-h-screen bg-[#0f141c] text-[#aab2c4] flex items-center justify-center">טוען נתונים…</div>
    );
  }

  const { topCustomers = [], hotProducts = [], coldProducts = [] } = dashboardData;

  return (
    <div className="min-h-screen bg-[#0f141c] text-white" dir="rtl">
      {/* Top Bar */}
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between gap-4">
          {/* Search */}
          <div className="flex-1 max-w-[420px]">
            <div className="flex items-center gap-3 bg-[#111824] border border-[#1f2a36] rounded-lg px-4 h-10 text-[#8e98aa]">
              <span className="text-xs">🔎</span>
              <input
                className="w-full bg-transparent outline-none text-[12px] placeholder-[#6f788c]"
                placeholder="חיפוש…"
              />
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#aab2c4]">
              <div className="bg-[#111824] border border-[#1f2a36] w-8 h-8 rounded-lg grid place-items-center">🔔</div>
              <div className="bg-[#111824] border border-[#1f2a36] w-8 h-8 rounded-lg grid place-items-center">✉️</div>
              <div className="bg-[#111824] border border-[#1f2a36] w-8 h-8 rounded-lg grid place-items-center">⚙️</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[12px] text-[#aab2c4]">שלום, <span className="font-semibold text-white">מנהל</span></p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#1c2532]" />
            </div>
          </div>
        </div>

        {/* Page title + filters */}
        <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-bold tracking-tight">לוח בקרה</h2>
            <p className="text-[11px] text-[#8b93a7] mt-1">ברוך/ה הבא/ה למערכת הניהול</p>
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Filter Period Popover (Sedap-like) */}
            <button
              onClick={() => setShowPeriod((s) => !s)}
              className="bg-[#111824] border border-[#1f2a36] rounded-lg px-3 py-2 text-[11px] text-[#c7cfdd] flex items-center gap-2"
            >
              <span>טווח זמן</span>
              <span className="text-[#8b93a7]">{period.from} – {period.to}</span>
              <span className="text-[#8b93a7]">▾</span>
            </button>

            <AnimatePresence>
              {showPeriod && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-12 right-0 w-[280px] bg-[#0f141c] border border-[#1f2a36] rounded-xl p-3 shadow-xl z-20"
                >
                  <div className="text-[12px] text-[#c7cfdd]">בחר טווח</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] text-white/80">
                    <label className="bg-[#111824] border border-[#1f2a36] rounded-lg px-2 py-1 flex items-center gap-2">
                      <span className="text-[#8b93a7]">מ-</span>
                      <input type="date" value={period.from} onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))} className="bg-transparent outline-none flex-1" />
                    </label>
                    <label className="bg-[#111824] border border-[#1f2a36] rounded-lg px-2 py-1 flex items-center gap-2">
                      <span className="text-[#8b93a7]">עד</span>
                      <input type="date" value={period.to} onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))} className="bg-transparent outline-none flex-1" />
                    </label>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button onClick={() => setShowPeriod(false)} className="text-[12px] px-3 py-1 rounded-md border border-[#1f2a36] bg-[#111824] text-[#c7cfdd]">סגור</button>
                    <button onClick={() => setShowPeriod(false)} className="text-[12px] px-3 py-1 rounded-md bg-[#14b98a] text-white">החל</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Daily date (kept for your daily KPIs) */}
            <label className="bg-[#111824] border border-[#1f2a36] rounded-lg px-3 py-2 text-[11px] text-[#c7cfdd] flex items-center gap-2">
              <span>תאריך יומי</span>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent outline-none text-white/80" />
            </label>

            <Button
              title={restaurantOpen ? "סגור מסעדה" : "פתח מסעדה"}
              onClick={() => handleToggleRestaurant(!restaurantOpen)}
              disabled={isToggling}
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="px-6 mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <KPI icon="🧾" title="סה" desc="כמות הזמנות היום" value={String(daily.totalOrders)} trend="+4.1% (30 ימים)" trendUp />
        <KPI icon="📦" title="סופקו" desc="הזמנות שנמסרו" value={String(daily.delivered)} trend="+3.2% (30 ימים)" trendUp />
        <KPI icon="✖️" title="בוטלו" desc="הזמנות שבוטלו" value={String(daily.canceled)} trend="-2.3% (30 ימים)" />
        <KPI icon="₪" title="הכנסה" desc={`הכנסה ל-${selectedDate}`} value={ILS.format(daily.revenue)} trend="-12.0% (30 ימים)" />
      </motion.div>

      {/* Charts row */}
      <div className="px-6 mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie (real) */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.25 }}
          className="lg:col-span-2 bg-[#111824] border border-[#1f2a36] rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold text-[13px]">פילוח סטטוסים בטווח</p>
          </div>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0f141c", border: "1px solid #1f2a36", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Weekly Orders Bar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.25 }}
          className="bg-[#111824] border border-[#1f2a36] rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-[13px]">הזמנות בשבוע (בטווח)</p>
              <p className="text-[11px] text-[#8b93a7]">מבוסס על ההזמנות בתוך הטווח</p>
            </div>
          </div>
          <div className="mt-2 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyBar}>
                <CartesianGrid strokeDasharray="3 3" stroke="#223047" />
                <XAxis dataKey="name" stroke="#8b93a7" tick={{ fontSize: 11 }} />
                <YAxis stroke="#8b93a7" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#0f141c", border: "1px solid #1f2a36", borderRadius: 8 }} />
                <Bar dataKey="orders" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Revenue + Segment */}
      <div className="px-6 mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue line */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.25 }}
          className="lg:col-span-2 bg-[#111824] border border-[#1f2a36] rounded-xl p-4"
        >
          <p className="font-semibold text-[13px]">הכנסה לפי חודש</p>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#223047" />
                <XAxis dataKey="name" stroke="#8b93a7" tick={{ fontSize: 11 }} />
                <YAxis stroke="#8b93a7" tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => ILS.format(v)}
                  contentStyle={{ background: "#0f141c", border: "1px solid #1f2a36", borderRadius: 8 }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Segment bar (simple by status in period) */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.25 }}
          className="bg-[#111824] border border-[#1f2a36] rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold text-[13px]">פילוח לקוחות (דוגמה)</p>
            <div className="text-[11px] text-[#8b93a7] bg-[#0f141c] border border-[#1f2a36] rounded px-2 py-0.5">בטווח</div>
          </div>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pieData.map((p) => ({ name: p.name, value: p.value }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#223047" />
                <XAxis dataKey="name" stroke="#8b93a7" tick={{ fontSize: 11 }} />
                <YAxis stroke="#8b93a7" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#0f141c", border: "1px solid #1f2a36", borderRadius: 8 }} />
                <Bar dataKey="value" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Top customers + Hot/Cold products */}
      <div className="px-6 mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.25 }}
          className="bg-[#111824] border border-[#1f2a36] rounded-xl p-4"
        >
          <h3 className="text-[16px] font-bold">לקוחות מובילים</h3>
          <p className="text-[11px] text-[#8b93a7] mb-3">לפי כמות הזמנות מצטברת</p>
          {topCustomers.length === 0 ? (
            <EmptyState text="אין נתוני לקוחות להצגה." />
          ) : (
            <ul className="divide-y divide-[#1f2a36]">
              {topCustomers.map((u) => (
                <li key={u?._id || u?.name} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1b2330]" />
                    <span className="text-sm">{u?.name || "ללא שם"}</span>
                  </div>
                  <span className="text-[12px] text-[#aab2c4]">{u?.orderCount ?? 0} הזמנות</span>
                </li>
              ))}
            </ul>
          )}
        </motion.section>

        <div className="grid grid-cols-1 gap-4">
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.25 }}
            className="bg-[#111824] border border-[#1f2a36] rounded-xl p-4"
          >
            <h3 className="text-[16px] font-bold mb-2">🔥 מוצרים חמים</h3>
            {dashboardData.hotProducts?.length === 0 ? (
              <EmptyState text="אין מוצרים חמים." />
            ) : (
              <ul className="divide-y divide-[#1f2a36]">
                {dashboardData.hotProducts.map((p, i) => (
                  <li key={p?.id || p?._id || p?.name || i} className="flex justify-between py-2">
                    <span className="text-red-400 font-medium">{p?.name || "ללא שם"}</span>
                    <span className="text-[12px] text-[#aab2c4]">{p?.orders ?? 0} הזמנות</span>
                  </li>
                ))}
              </ul>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.25 }}
            className="bg-[#111824] border border-[#1f2a36] rounded-xl p-4"
          >
            <h3 className="text-[16px] font-bold mb-2">❄️ מוצרים קרים</h3>
            {dashboardData.coldProducts?.length === 0 ? (
              <EmptyState text="אין מוצרים קרים." />
            ) : (
              <ul className="divide-y divide-[#1f2a36]">
                {dashboardData.coldProducts.map((p, i) => (
                  <li key={p?.id || p?._id || p?.name || i} className="flex justify-between py-2">
                    <span className="text-blue-400 font-medium">{p?.name || "ללא שם"}</span>
                    <span className="text-[12px] text-[#aab2c4]">{p?.orders ?? 0} הזמנות</span>
                  </li>
                ))}
              </ul>
            )}
          </motion.section>
        </div>
      </div>

      <div className="h-6" />
    </div>
  );
}

/** Small UI atoms **/
function KPI({ icon, title, desc, value, trend, trendUp }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="bg-[#111824] border border-[#1f2a36] rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-lg bg-white/5 grid place-items-center text-white/90 text-base">{icon}</div>
        <span className="text-[#6f788c]">⋮</span>
      </div>
      <div className="mt-3">
        <p className="text-[22px] font-extrabold leading-none">{value}</p>
        <p className="text-[11px] text-[#8b93a7] mt-0.5">{title} · {desc}</p>
        <p className={`text-[10px] mt-1 ${trendUp ? "text-[#22c55e]" : "text-[#ef4444]"}`}>{trend}</p>
      </div>
    </motion.div>
  );
}

function EmptyState({ text }) {
  return <div className="text-[#8b93a7] text-sm py-6 text-center">{text}</div>;
}
