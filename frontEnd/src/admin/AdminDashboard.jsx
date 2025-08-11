import React, { useEffect, useMemo, useState, useCallback } from "react";
import api from "../api";
import { ORDER_STATUS } from "../../constants/orderStatus";
import Button from "../components/common/Button";
import { motion } from "framer-motion";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";

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

  // filters (keep only daily + period values for charts that remain)
  const todayYMD = toYMD(new Date());
  const [selectedDate, setSelectedDate] = useState(todayYMD);
  const [period, setPeriod] = useState(() => {
    const to = new Date();
    const from = addDays(to, -29); // last 30 days
    return { from: toYMD(from), to: toYMD(to) };
  });

  // revenue view (month/year compare | week compare | day hourly)
  const [revenueView, setRevenueView] = useState("year"); // "year" | "week" | "day"

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
  const weeklyBar = useMemo(() => {
    const labels = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"]; // Sunday..Saturday
    const counts = new Array(7).fill(0);
    ordersInPeriod.forEach((o) => {
      const d = new Date(o.createdAt);
      const idx = d.getDay();
      if (o.status === ORDER_STATUS.DONE) counts[idx] += Number(o.totalPrice) || 0; // revenue per weekday
    });
    return labels.map((name, i) => ({ name, revenue: counts[i] }));
  }, [ordersInPeriod]);

  const monthlyRevenue = useMemo(() => {
    const map = new Map();
    (dashboardData?.orders ?? []).forEach((o) => {
      if (o.status !== ORDER_STATUS.DONE) return;
      const d = new Date(o.createdAt);
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${m}`;
      const label = d.toLocaleDateString("he-IL", { month: "short" });
      const cur = map.get(key) || { name: label, revenue: 0, year: y, month: m };
      cur.revenue += Number(o.totalPrice) || 0;
      map.set(key, cur);
    });
    // ensure 12 months exist for current & last year
    const baseDate = new Date(selectedDate);
    const currentYear = baseDate.getFullYear();
    const years = [currentYear - 1, currentYear];
    const filled = [];
    years.forEach((y) => {
      for (let m = 0; m < 12; m++) {
        const k = `${y}-${m}`;
        const exist = map.get(k) || { name: new Date(y, m, 1).toLocaleDateString("he-IL", { month: "short" }), revenue: 0, year: y, month: m };
        filled.push(exist);
      }
    });
    return filled;
  }, [dashboardData, selectedDate]);

  // Year compare (months): current year vs last year
  const monthlyCompare = useMemo(() => {
    const baseDate = new Date(selectedDate);
    const currentYear = baseDate.getFullYear();
    const lastYear = currentYear - 1;
    const months = Array.from({ length: 12 }, (_, m) => new Date(currentYear, m, 1).toLocaleDateString("he-IL", { month: "short" }));

    const cur = new Array(12).fill(0);
    const prev = new Array(12).fill(0);
    monthlyRevenue.forEach((row) => {
      if (row.year === currentYear) cur[row.month] += row.revenue;
      if (row.year === lastYear) prev[row.month] += row.revenue;
    });
    return months.map((name, i) => ({ name, current: cur[i], last: prev[i] }));
  }, [monthlyRevenue, selectedDate]);

  // Week compare (by weekday) for the week of selectedDate vs previous week
  const weeklyCompare = useMemo(() => {
    const orders = (dashboardData?.orders ?? []).filter((o) => o.status === ORDER_STATUS.DONE);
    const base = new Date(selectedDate);
    const day = base.getDay(); // 0=Sun
    const startCurrent = new Date(base);
    startCurrent.setDate(base.getDate() - day); // Sunday
    const startPrev = addDays(startCurrent, -7);

    const labels = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];
    const cur = new Array(7).fill(0);
    const prev = new Array(7).fill(0);

    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      const bucket = (arr, start) => {
        const diff = Math.floor((d - start) / 86400000);
        if (diff >= 0 && diff < 7) arr[new Date(d).getDay()] += Number(o.totalPrice) || 0;
      };
      bucket(cur, startCurrent);
      bucket(prev, startPrev);
    });

    return labels.map((name, i) => ({ name, current: cur[i], last: prev[i] }));
  }, [dashboardData, selectedDate]);

  // Day hourly revenue for selectedDate
  const hourlyRevenue = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, h) => ({ name: String(h).padStart(2, "0"), revenue: 0 }));
    (dashboardData?.orders ?? []).forEach((o) => {
      if (o.status !== ORDER_STATUS.DONE) return;
      if (toYMD(o.createdAt) !== selectedDate) return;
      const h = new Date(o.createdAt).getHours();
      if (h >= 0 && h < 24) hours[h].revenue += Number(o.totalPrice) || 0;
    });
    return hours;
  }, [dashboardData, selectedDate]);

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
      <div className="min-h-screen bg-[#0f141c] text-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-red-400 mb-4">{error}</p>
          <Button title="נסה שוב" onClick={() => fetchDashboard()} />
        </div>
      </div>
    );
  }

  if (isLoading || !dashboardData) {
    return <div className="min-h-screen bg-[#0f141c] text-[#aab2c4] flex items-center justify-center px-4">טוען נתונים…</div>;
  }

  const { topCustomers = [], hotProducts = [], coldProducts = [] } = dashboardData;

  return (
    <div className="min-h-screen bg-[#0f141c] text-white" dir="rtl">
      {/* Top Bar (minimal) */}
      <div className="sticky top-0 z-20 bg-[#0f141c]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0f141c]/80 border-b border-[#1f2a36]">
        <div className="px-4 sm:px-6 pt-4 pb-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[18px] font-bold tracking-tight truncate">לוח בקרה</h2>
              <p className="text-[11px] text-[#8b93a7] mt-1">ברוך/ה הבא/ה למערכת הניהול</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <label className="bg-[#111824] border border-[#1f2a36] rounded-lg px-3 py-2 text-[11px] text-[#c7cfdd] flex items-center gap-2 min-w-[170px]">
                <span className="shrink-0">תאריך יומי</span>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent outline-none text-white/80 w-full" />
              </label>
              <Button title={restaurantOpen ? "סגור מסעדה" : "פתח מסעדה"} onClick={() => handleToggleRestaurant(!restaurantOpen)} disabled={isToggling} />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="px-4 sm:px-6 mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon="🧾" title="סה" desc="כמות הזמנות היום" value={String(daily.totalOrders)} trend="+4.1% (30 ימים)" trendUp />
        <KPI icon="📦" title="סופקו" desc="הזמנות שנמסרו" value={String(daily.delivered)} trend="+3.2% (30 ימים)" trendUp />
        <KPI icon="✖️" title="בוטלו" desc="הזמנות שבוטלו" value={String(daily.canceled)} trend="-2.3% (30 ימים)" />
        <KPI icon="₪" title="הכנסה" desc={`הכנסה ל-${selectedDate}`} value={ILS.format(daily.revenue)} trend="-12.0% (30 ימים)" />
      </motion.div>

      {/* Weekly Orders Bar (revenue per weekday in period) */}
      <div className="px-4 sm:px-6 mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="הכנסות לפי יום בשבוע (בטווח)" subtitle="סכום הכנסות להזמנות שבוצעו">
          <div className="mt-2 h-[220px] sm:h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyBar} barCategoryGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#223047" />
                <XAxis dataKey="name" stroke="#8b93a7" tick={{ fontSize: 11 }} />
                <YAxis stroke="#8b93a7" tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                <Tooltip formatter={(v) => ILS.format(v)} contentStyle={{ background: "#0f141c", border: "1px solid #1f2a36", borderRadius: 8 }} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Revenue views */}
      <div className="px-4 sm:px-6 mt-4 grid grid-cols-1">
        <SectionCard
          title="הכנסה לפי טווח"
          rightBadge={
            <div className="flex items-center gap-1 bg-[#0f141c] border border-[#1f2a36] rounded-lg p-1 text-[11px]">
              <TabButton active={revenueView === "year"} onClick={() => setRevenueView("year")}>השוואה לשנה קודמת</TabButton>
              <TabButton active={revenueView === "week"} onClick={() => setRevenueView("week")}>השוואת שבוע</TabButton>
              <TabButton active={revenueView === "day"} onClick={() => setRevenueView("day")}>שעתי (יומי)</TabButton>
            </div>
          }
        >
          {/* Year compare: current vs last (months) */}
          {revenueView === "year" && (
            <div className="mt-2 h-[260px] sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyCompare} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#223047" />
                  <XAxis dataKey="name" stroke="#8b93a7" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#8b93a7" tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip formatter={(v) => ILS.format(v)} contentStyle={{ background: "#0f141c", border: "1px solid #1f2a36", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="current" name="שנה נוכחית" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="last" name="שנה קודמת" stroke="#60a5fa" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Week compare: current week vs previous */}
          {revenueView === "week" && (
            <div className="mt-2 h-[260px] sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyCompare} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#223047" />
                  <XAxis dataKey="name" stroke="#8b93a7" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#8b93a7" tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip formatter={(v) => ILS.format(v)} contentStyle={{ background: "#0f141c", border: "1px solid #1f2a36", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="current" name="שבוע נוכחי" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="last" name="שבוע קודם" stroke="#60a5fa" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Day hourly: selectedDate hours */}
          {revenueView === "day" && (
            <div className="mt-2 h-[260px] sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyRevenue} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#223047" />
                  <XAxis dataKey="name" stroke="#8b93a7" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#8b93a7" tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip formatter={(v) => ILS.format(v)} contentStyle={{ background: "#0f141c", border: "1px solid #1f2a36", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="revenue" name={`הכנסות (${selectedDate})`} stroke="#22c55e" strokeWidth={2} dot={{ r: 1.5 }} activeDot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Top customers + Hot/Cold products */}
      <div className="px-4 sm:px-6 mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="לקוחות מובילים" subtitle="לפי כמות הזמנות מצטברת">
          {topCustomers.length === 0 ? (
            <EmptyState text="אין נתוני לקוחות להצגה." />
          ) : (
            <ul className="divide-y divide-[#1f2a36]">
              {topCustomers.map((u) => (
                <li key={u?._id || u?.name} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#1b2330] shrink-0" />
                    <span className="text-sm truncate">{u?.name || "ללא שם"}</span>
                  </div>
                  <span className="text-[12px] text-[#aab2c4] shrink-0">{u?.orderCount ?? 0} הזמנות</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <div className="grid grid-cols-1 gap-4">
          <SectionCard title="🔥 מוצרים חמים">
            {hotProducts.length === 0 ? (
              <EmptyState text="אין מוצרים חמים." />
            ) : (
              <ul className="divide-y divide-[#1f2a36]">
                {hotProducts.map((p, i) => (
                  <li key={p?.id || p?._id || p?.name || i} className="flex justify-between py-2">
                    <span className="text-red-400 font-medium truncate pr-1">{p?.name || "ללא שם"}</span>
                    <span className="text-[12px] text-[#aab2c4]">{p?.orders ?? 0} הזמנות</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="❄️ מוצרים קרים">
            {coldProducts.length === 0 ? (
              <EmptyState text="אין מוצרים קרים." />
            ) : (
              <ul className="divide-y divide-[#1f2a36]">
                {coldProducts.map((p, i) => (
                  <li key={p?.id || p?._id || p?.name || i} className="flex justify-between py-2">
                    <span className="text-blue-400 font-medium truncate pr-1">{p?.name || "ללא שם"}</span>
                    <span className="text-[12px] text-[#aab2c4]">{p?.orders ?? 0} הזמנות</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      <div className="h-6" />
    </div>
  );
}

/** Reusable section shell **/
function SectionCard({ title, subtitle, rightBadge, className = "", children }) {
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.25 }} className={`bg-[#111824] border border-[#1f2a36] rounded-xl p-3 sm:p-4 ${className}`}>
      <div className="flex items-start sm:items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[15px] sm:text-[16px] font-bold truncate">{title}</h3>
          {subtitle && <p className="text-[11px] text-[#8b93a7] mt-0.5">{subtitle}</p>}
        </div>
        {rightBadge && <div className="shrink-0">{rightBadge}</div>}
      </div>
      {children}
    </motion.section>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`px-2.5 py-1 rounded-md transition-colors ${active ? "bg-[#14b98a] text-white" : "text-[#c7cfdd] hover:bg-white/5"}`}>
      {children}
    </button>
  );
}

/** Small UI atoms **/
function KPI({ icon, title, desc, value, trend, trendUp }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="bg-[#111824] border border-[#1f2a36] rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-lg bg-white/5 grid place-items-center text-white/90 text-base">{icon}</div>
        <span className="text-[#6f788c]">⋮</span>
      </div>
      <div className="mt-3">
        <p className="text-[20px] sm:text-[22px] font-extrabold leading-none">{value}</p>
        <p className="text-[11px] text-[#8b93a7] mt-0.5">{title} · {desc}</p>
        <p className={`text-[10px] mt-1 ${trendUp ? "text-[#22c55e]" : "text-[#ef4444]"}`}>{trend}</p>
      </div>
    </motion.div>
  );
}

function EmptyState({ text }) {
  return <div className="text-[#8b93a7] text-sm py-6 text-center">{text}</div>;
}
