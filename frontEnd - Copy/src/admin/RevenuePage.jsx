import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import SideMenu from "../layouts/SideMenu";
import { Menu } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";

/** ---------- Utilities ---------- */
const ILS = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 2,
});

const toYMD = (d) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

/** ---------- Main Page ---------- */
export default function RevenuePage() {
  // date filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // raw rows from backend (should include at least { month: 'YYYY-MM', gross })
  const [sourceRows, setSourceRows] = useState([]);

  // ui & fetch state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // admin inputs (persist to localStorage so owner doesn’t need to retype)
  const [cogsPct, setCogsPct] = useState(() => lsGetNumber("cogsPct", 32)); // עלות מכר (%)
  const [laborPct, setLaborPct] = useState(() => lsGetNumber("laborPct", 18)); // עבודה (%)
  const [paymentPct, setPaymentPct] = useState(() => lsGetNumber("paymentPct", 1.7)); // עמלות תשלום (%)
  const [fixedMonthly, setFixedMonthly] = useState(() => lsGetNumber("fixedMonthly", 0)); // הוצאות קבועות לחודש
  const [otherMonthly, setOtherMonthly] = useState(() => lsGetNumber("otherMonthly", 0)); // עוד קבועות

  // init default date range: year-to-date
  useEffect(() => {
    const now = new Date();
    setEndDate(toYMD(now));
    setStartDate(toYMD(new Date(now.getFullYear(), 0, 1)));
  }, []);

  // persist admin inputs
  useEffect(() => {
    localStorage.setItem("cogsPct", String(cogsPct));
    localStorage.setItem("laborPct", String(laborPct));
    localStorage.setItem("paymentPct", String(paymentPct));
    localStorage.setItem("fixedMonthly", String(fixedMonthly));
    localStorage.setItem("otherMonthly", String(otherMonthly));
  }, [cogsPct, laborPct, paymentPct, fixedMonthly, otherMonthly]);

  // fetch gross by month from backend
  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const res = await api.get("/api/analytics/revenue", {
        params: { start: startDate, end: endDate },
        headers: { Authorization: `Bearer ${token}` },
      });
      const arr = Array.isArray(res.data) ? res.data : [];
      setSourceRows(arr);
    } catch (err) {
      console.error(err);
      setError("שגיאה בטעינת הנתונים");
      setSourceRows([]);
    } finally {
      setLoading(false);
    }
  };

  /** ---------- Compute rows based on admin inputs ---------- */
  const rows = useMemo(() => {
    const cogsRate = safePct(cogsPct);
    const laborRate = safePct(laborPct);
    const paymentRate = safePct(paymentPct);

    return (sourceRows || []).map((r) => {
      const gross = Number(r.gross || 0);

      // variable costs
      const cogs = gross * cogsRate;
      const labor = gross * laborRate;
      const paymentFees = gross * paymentRate;

      // fixed costs (applied per-month row)
      const fixed = Number(fixedMonthly || 0) + Number(otherMonthly || 0);

      const net = gross - cogs - labor - paymentFees - fixed;
      const margin = gross > 0 ? net / gross : 0;

      return {
        ...r,
        gross,
        cogs,
        labor,
        paymentFees,
        fixed,
        net,
        margin,
        name: new Date(`${r.month}-01`).toLocaleDateString("he-IL", {
          month: "short",
          year: "2-digit",
        }),
        marginPct: margin * 100,
      };
    });
  }, [sourceRows, cogsPct, laborPct, paymentPct, fixedMonthly, otherMonthly]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.gross += r.gross || 0;
        acc.net += r.net || 0;
        acc.cogs += r.cogs || 0;
        acc.fixed += r.fixed || 0;
        acc.labor += r.labor || 0;
        acc.paymentFees += r.paymentFees || 0;
        return acc;
      },
      { gross: 0, net: 0, cogs: 0, fixed: 0, labor: 0, paymentFees: 0 }
    );
  }, [rows]);

  const chartData = useMemo(() => rows, [rows]);

  return (
    <div className="min-h-screen bg-[#0f1415] text-white flex" dir="rtl">
      {/* Sidebar desktop */}
      <div className="hidden md:block">
        <SideMenu logoSrc="/developerTag.jpeg" brand="Hungry" />
      </div>

      {/* Mobile overlay + drawer */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      {isSidebarOpen && (
        <div className="md:hidden">
          <SideMenu
            onClose={() => setIsSidebarOpen(false)}
            logoSrc="/developerTag.jpeg"
            brand="Hungry"
          />
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
              <h1 className="text-base md:text-lg font-semibold">הכנסות</h1>
              <p className="text-white/50 text-xs">מעקב הכנסות חודשיות</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-4 md:px-6 mt-4 space-y-4">
          {/* Filters */}
          <section className="bg-[#17181d] border border-white/10 rounded-2xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-sm">
                <span className="text-white/80 shrink-0">מתאריך:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <span className="text-white/80 shrink-0">עד תאריך:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </label>

              <div className="flex sm:justify-end">
                <button
                  onClick={fetchData}
                  disabled={!startDate || !endDate || loading}
                  className={`w-full sm:w-auto rounded-xl px-4 py-2 font-medium transition ${
                    loading
                      ? "bg-emerald-700/60 cursor-wait"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {loading ? "טוען…" : "רענן"}
                </button>
              </div>
            </div>
            <p className="text-[12px] text-white/40 mt-3">
              בחר טווח תאריכים ולחץ על "רענן".
            </p>
          </section>

          {/* Admin Inputs */}
          <section className="bg-[#17181d] border border-white/10 rounded-2xl p-4">
            <h3 className="text-sm mb-3 text-white/80">הגדרות חישוב (אדמין)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <NumberField
                label="עלות מכר (%)"
                value={cogsPct}
                onChange={setCogsPct}
                min={0}
                max={100}
                step="0.1"
              />
              <NumberField
                label="עבודה (%)"
                value={laborPct}
                onChange={setLaborPct}
                min={0}
                max={100}
                step="0.1"
              />
              <NumberField
                label="עמלות תשלום (%)"
                value={paymentPct}
                onChange={setPaymentPct}
                min={0}
                max={100}
                step="0.1"
              />
              <NumberField
                label="קבועות לחודש (₪)"
                value={fixedMonthly}
                onChange={setFixedMonthly}
                min={0}
                step="1"
              />
              <NumberField
                label="קבועות נוספות (₪)"
                value={otherMonthly}
                onChange={setOtherMonthly}
                min={0}
                step="1"
              />
            </div>
            <p className="text-[12px] text-white/40 mt-3">
              האחוזים מחושבים מתוך הברוטו. ההוצאות הקבועות נגרעות בכל חודש בנפרד.
            </p>
          </section>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-2xl p-4 text-sm">
              {error}
            </div>
          )}

          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Kpi title="ברוטו" value={ILS.format(totals.gross)} />
            <Kpi title="נטו" value={ILS.format(totals.net)} />
            <Kpi title="עלות מכר" value={ILS.format(totals.cogs)} />
            <Kpi title="הוצאות קבועות" value={ILS.format(totals.fixed)} />
            <Kpi title="עבודה" value={ILS.format(totals.labor)} />
            <Kpi title="עמלות תשלום" value={ILS.format(totals.paymentFees)} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="bg-[#17181d] border border-white/10 rounded-2xl p-4 h-80">
              <h3 className="text-sm mb-2">ברוטו מול נטו</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#fff" />
                  <YAxis stroke="#fff" tickFormatter={(v) => ILS.format(v)} />
                  <Tooltip formatter={(v) => ILS.format(v)} />
                  <Legend />
                  <Bar dataKey="gross" fill="#34d399" name="ברוטו" />
                  <Bar dataKey="net" fill="#60a5fa" name="נטו" />
                </BarChart>
              </ResponsiveContainer>
            </section>

            <section className="bg-[#17181d] border border-white/10 rounded-2xl p-4 h-80">
              <h3 className="text-sm mb-2">שיעור רווחיות</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#fff" />
                  <YAxis
                    stroke="#fff"
                    tickFormatter={(v) => `${v.toFixed(0)}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                  <Line
                    type="monotone"
                    dataKey="marginPct"
                    stroke="#fbbf24"
                    name="Margin"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------- Small Components ---------- */
function Kpi({ title, value }) {
  return (
    <section className="bg-[#17181d] border border-white/10 rounded-2xl p-4">
      <h3 className="text-sm text-white/60">{title}</h3>
      <div className="mt-1 text-2xl font-extrabold tracking-tight">{value}</div>
    </section>
  );
}

function NumberField({ label, value, onChange, min, max, step = "0.01" }) {
  return (
    <label className="text-sm">
      <div className="text-white/80 mb-1">{label}</div>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(safeNumber(e.target.value))}
        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/30"
      />
    </label>
  );
}

/** ---------- Helpers ---------- */
function lsGetNumber(key, fallback) {
  const raw = localStorage.getItem(key);
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safePct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  if (n <= 0) return 0;
  return n / 100;
}
