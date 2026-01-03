import React, { useState, useEffect } from "react";
import api from "../../api";
import SideMenu from "../../layouts/SideMenu";
import { ORDER_STATUS } from "../../../constants/orderStatus";
import { Menu } from "lucide-react";

/* ---------- helpers ---------- */
const formatTime = (timestamp) => {
  // Normalize to Asia/Jerusalem like other pages
  const date = new Date(new Date(timestamp).toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "רגע עכשיו";
  if (diffMinutes < 60) return `${diffMinutes} דקות`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} שעות`;
  return date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
};

const translateDeliveryOption = (option) =>
  option === "EatIn" ? "אכילה במקום" : option === "Delivery" ? "משלוח" : option === "Pickup" ? "איסוף עצמי" : option;

const badgeClasses = (status) => {
  if (status === ORDER_STATUS.DELIVERING) return "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20";
  if (status === ORDER_STATUS.PREPARING) return "bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/20";
  if (status === ORDER_STATUS.DONE) return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20";
  return "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20"; // pending/unknown
};

const VEGETABLES_ORDER = ["חסה", "מלפפון חמוץ", "עגבניה", "בצל", "סלט כרוב", "צימצורי"];

/* ---------- page ---------- */
export default function KitchenOrders() {
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const { lang } = useLang();
  const resolveOrderItemName = (item) => {
    const product = item?.product || {};
    return lang === "en"
      ? product.name_en ?? item.name_en ?? product.name ?? item.name ?? item.title ?? "Unknown item"
      : product.name_he ?? item.name_he ?? product.name ?? item.name ?? item.title ?? "פריט לא ידוע";
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get(`/api/orders/active`);
      const allOrders = res.data;

      // Kitchen logic: show dine-in + any order that has an estimated time
      const kitchenOrders = allOrders.filter((order) => {
        if (order.deliveryOption === "EatIn") return true;
        return !!order.estimatedTime;
      });

      setOrders(kitchenOrders);
    } catch (err) {
      console.error("Error fetching orders", err);
      setOrders([]);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/api/orders/${id}/status`, { status });
      fetchOrders();
    } catch (err) {
      console.error("Error updating status", err);
    }
  };

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-[#0f1415] text-white flex" dir="rtl">
      {/* Sidebar desktop */}
      <div className="hidden md:block">
        <SideMenu logoSrc="/developerTag.jpeg" brand="Hungry" />
      </div>

      {/* Mobile overlay + drawer */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
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
              <h1 className="text-base md:text-lg font-semibold">מסך מטבח</h1>
              <p className="text-white/50 text-xs">הזמנות פעילות להכנה והגשה</p>
            </div>
          </div>
        </header>

        {/* Table (mobile + desktop) */}
        <div className="px-4 md:px-6 mt-4">
          <div className="rounded-2xl overflow-hidden shadow-lg border border-white/10">
            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full text-sm">
                <thead className="bg-emerald-500 text-emerald-50">
                  <tr className="text-right">
                    <th className="px-4 py-3 font-semibold">מס׳ הזמנה</th>
                    <th className="px-4 py-3 font-semibold">שם משתמש</th>
                    <th className="px-4 py-3 font-semibold">סטטוס</th>
                    <th className="px-4 py-3 font-semibold">סוג משלוח</th>
                    <th className="px-4 py-3 font-semibold">זמן יצירה</th>
                    <th className="px-4 py-3 font-semibold">פעולות</th>
                  </tr>
                </thead>

                <tbody className="bg-[#17181d] divide-y divide-white/10">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-white/60 text-center">
                        אין הזמנות כרגע
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <React.Fragment key={order._id}>
                        <tr className="text-right">
                          <td className="px-4 py-3 text-white/80">#{order._id.slice(-6)}</td>
                          <td className="px-4 py-3">
                            <span className="text-white/90">
                              {order.user?.name ? order.user.name : order.customerName ? order.customerName : "אורח"}
                            </span>
                            <span className="text-white/40"> · {order.user?.phone || order.phone || "—"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] ${badgeClasses(order.status)}`}>
                              {order.status === ORDER_STATUS.PREPARING
                                ? "בהכנה"
                                : order.status === ORDER_STATUS.DELIVERING
                                ? "במשלוח"
                                : order.status === ORDER_STATUS.DONE
                                ? "הושלם"
                                : "ממתין"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white/70">{translateDeliveryOption(order.deliveryOption)}</td>
                          <td className="px-4 py-3 text-white/60">{formatTime(order.createdAt)}</td>
                          <td className="px-4 py-3">
                            <button
                              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs"
                              onClick={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
                            >
                              {expandedOrderId === order._id ? "הסתר פרטים" : "הצג פרטים"}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded row */}
                        {expandedOrderId === order._id && (
                          <tr className="bg-white/5">
                            <td colSpan={6} className="p-4">
                              <div className="grid md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <div>
                                    <strong>שם משתמש:</strong> {order.user ? order.user.name : order.customerName || "אורח"}
                                  </div>
                                  <div>
                                    <strong>טלפון:</strong> {order.user ? order.user.phone : order.phone || "—"}
                                  </div>
                                  <div>
                                    <strong>נוצר:</strong> {formatTime(order.createdAt)}
                                  </div>
                                  {order.estimatedTime ? (
                                    <div>
                                      <strong>זמן משוער:</strong> {order.estimatedTime} דקות
                                    </div>
                                  ) : null}
                                </div>

                                <div className="md:col-span-2">
                                  <h4 className="font-semibold mb-2">פרטי הזמנה</h4>
                                  <ul className="space-y-2">
                                    {order.items.map((item, idx) => {
                                      const vegs =
                                        Array.isArray(item.vegetables) && item.vegetables.length
                                          ? VEGETABLES_ORDER.filter((v) => item.vegetables.includes(v)).join(", ")
                                          : "כל הירקות";
                                      const adds =
                                        Array.isArray(item.additions) && item.additions.length
                                          ? item.additions.map((a) => a.addition).join(", ")
                                          : "אין";
                                      return (
                                        <li key={idx} className="leading-6">
                                          <strong>{resolveOrderItemName(item)}</strong> — כמות: {item.quantity}{" "}
                                          {item.isWeighted ? "גרם" : ""}
                                          <div className="text-white/70">
                                            ירקות: {vegs} · תוספות: {adds}
                                            {item.comment ? ` · הערות: ${item.comment}` : ""}
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="mt-4 flex flex-wrap gap-3">
                                {order.status !== ORDER_STATUS.DONE && (
                                  <button
                                    className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg"
                                    onClick={() => updateStatus(order._id, ORDER_STATUS.DONE)}
                                  >
                                    הושלם
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer count */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-white/50 text-xs mt-4">
            <div>סה״כ הזמנות במטבח: {orders.length}</div>
            <div className="text-white/40">מועדון Hungry</div>
          </div>
        </div>
      </div>
    </div>
  );
}
