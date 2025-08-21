import React, { useEffect, useState, useRef } from "react";
import api from "../api";
import SideMenu from "../layouts/SideMenu";
import { ORDER_STATUS } from "../../constants/orderStatus";
import notificationSound from "../assets/notificatinSound.mp3";
import AddItemModal from "./modals/AddItemModal";
import { Menu } from "lucide-react";
import io from "socket.io-client"; // ✅ default import

// ✅ single socket instance (robust connection options)
const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5001", {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

/* ----------------- helpers ----------------- */
const formatTime = (timestamp) => {
  const date = new Date(new Date(timestamp).toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "רגע עכשיו";
  if (diffMinutes < 60) return `${diffMinutes} דקות`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} שעות`;
  return date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
};

const badgeClasses = (status) => {
  if (status === ORDER_STATUS?.DELIVERING) return "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20";
  if (status === ORDER_STATUS?.PREPARING) return "bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/20";
  if (status === ORDER_STATUS?.DONE) return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20";
  return "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20"; // pending/unknown
};

const translateDeliveryOption = (option) =>
  option === "EatIn" ? "אכילה במקום" : option === "Delivery" ? "משלוח" : option === "Pickup" ? "איסוף עצמי" : option;

const translatePaymentMethod = (method) =>
  method === "Card"
    ? "כרטיס אשראי"
    : method === "Cash"
    ? "מזומן"
    : method === "Bit"
    ? "ביט"
    : method === "GOOGLE_PAY"
    ? "Google Pay"
    : method === "APPLE_PAY"
    ? "Apple Pay"
    : method || " לא ידוע";

// Normalize an order ID that might arrive as _id or clientOrderId
const normalizeId = (o) => o?._id || o?.clientOrderId;

// Remove duplicate orders that may arrive from both polling and socket events
const dedupeOrders = (orders = []) => {
  const seen = new Set();
  return orders.filter((o) => {
    const id = normalizeId(o);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

/* ----------------- page ----------------- */
export default function ActiveOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // sidebar (mobile)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addOrderId, setAddOrderId] = useState(null);

  // polling + new order sound
  const prevOrderCountRef = useRef(0);

  // initial fetch + 5s polling safety net
  useEffect(() => {
    fetchOrders();
    const id = setInterval(fetchOrders, 5000);
    return () => clearInterval(id);
  }, []);

  const playNotificationSound = () => {
    let count = 0;
    const play = () => {
      if (count >= 3) return;
      const audio = new Audio(notificationSound);
      audio.play().catch(() => {});
      count++;
      audio.onended = () => setTimeout(play, 1000);
    };
    play();
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get("/api/orders/active");
      // Backend already filters out completed and unpaid orders; still dedupe to avoid double entries
      let newOrderList = res.data.filter(
        (o) => o.status !== ORDER_STATUS?.DONE && o.status !== ORDER_STATUS?.PENDING_PAYMENT && o.status !== ORDER_STATUS?.CANCELED
      );
      newOrderList = dedupeOrders(newOrderList);
      if (prevOrderCountRef.current !== 0 && newOrderList.length > prevOrderCountRef.current) {
        playNotificationSound();
      }
      prevOrderCountRef.current = newOrderList.length;
      setOrders(newOrderList);
    } catch (err) {
      console.error("❌ שגיאה בקבלת הזמנות:", err);
      setOrders([]);
    }
  };

  // ✅ REAL-TIME: merge order from webhook (no extra fetch)
  useEffect(() => {
    const onPaid = (order) => {
      playNotificationSound();
      setOrders((prev) => {
        const incomingId = normalizeId(order);
        const i = prev.findIndex((o) => normalizeId(o) === incomingId);
        if (i >= 0) {
          const updated = [...prev];
          updated[i] = { ...prev[i], ...order };
          return updated;
        }
        return [order, ...prev];
      });
      prevOrderCountRef.current += 1;
    };

    socket.on("connect", () => console.log("🔌 admin socket connected"));
    socket.on("order_paid", onPaid);

    return () => {
      socket.off("order_paid", onPaid);
    };
  }, []);

  // unlock audio (mobile)
  useEffect(() => {
    const unlock = () => {
      const a = new Audio();
      a.play().catch(() => {});
      document.removeEventListener("click", unlock);
    };
    document.addEventListener("click", unlock);
  }, []);

  const formatPhoneNumber = (phone) => (phone ? (phone.startsWith("0") ? `+972${phone.slice(1)}` : phone) : null);

  const updateOrderStatus = async (orderId, data) => {
    try {
      await api.put(`/api/orders/${orderId}/status`, data);
      fetchOrders();
    } catch (err) {
      console.error("שגיאה בעדכון סטטוס:", err);
    }
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק את ההזמנה?")) return;
    try {
      await api.delete(`/api/orders/${orderId}`);
      fetchOrders();
    } catch {
      alert("שגיאה במחיקת ההזמנה");
    }
  };

  const handleTimeChange = async (orderId, time) => {
    const order = orders.find((o) => o._id === orderId);
    const phone = order?.user?.phone || order?.phone;

    await updateOrderStatus(orderId, { status: ORDER_STATUS?.PREPARING, estimatedTime: time });

    // ✅ WhatsApp stays intact
    const formattedPhone = formatPhoneNumber(phone);
    const message = `ההזמנה שלך תהיה מוכנה בעוד ${time} דקות!\n\nבדוק את סטטוס ההזמנה כאן:\nhttps://hungryresturant.netlify.app/order-status`;
    if (formattedPhone) window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, "_blank");
    alert(`הלקוח יקבל הודעה בוואטסאפ`);
  };

  const markAsDone = async (orderId) => {
    const order = orders.find((o) => o._id === orderId);
    const phone = order?.user?.phone || order?.phone;
    await updateOrderStatus(orderId, { status: ORDER_STATUS?.DONE });
    alert("ההזמנה מוכנה!");

    if (phone && order.deliveryOption !== "EatIn") {
      const lastSixDigits = orderId.slice(-6);
      const message = `ההזמנה שלך (${lastSixDigits}) מוכנה!`;
      window.open(`https://wa.me/${formatPhoneNumber(phone)}?text=${encodeURIComponent(message)}`, "_blank");
    }
  };

  const markAsDelivering = async (orderId) => {
    const order = orders.find((o) => o._id === orderId);
    const phone = order?.user?.phone || order?.phone;
    await updateOrderStatus(orderId, { status: ORDER_STATUS?.DELIVERING });
    alert("המשלוח יצא לדרך!");
    if (phone) {
      const lastSixDigits = orderId.slice(-6);
      const message = `ההזמנה שלך (${lastSixDigits}) בדרך אליך!`;
      window.open(`https://wa.me/${formatPhoneNumber(phone)}?text=${encodeURIComponent(message)}`, "_blank");
    }
  };

  // show all active orders
  const filtered = orders;
  /* ----------------- UI ----------------- */
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
              <h1 className="text-base md:text-lg font-semibold">הזמנות פעילות (היום)</h1>
              <p className="text-white/50 text-xs">מציג רק הזמנות מהיום</p>
            </div>
          </div>
        </header>

        {/* Table card */}
        <div className="px-4 md:px-6 mt-4">
          <div className="rounded-2xl overflow-hidden shadow-lg border border-white/10">
            {/* Desktop header */}
            <div className="hidden md:grid bg-emerald-500 text-emerald-50 text-sm font-semibold grid-cols-12 px-4 py-3">
              <div className="col-span-2">מס׳ הזמנה</div>
              <div className="col-span-3">תאריך</div>
              <div className="col-span-3">שם לקוח</div>
              <div className="col-span-2">סוג משלוח</div>
              <div className="col-span-1">סכום</div>
              <div className="col-span-1 text-left">סטטוס</div>
            </div>

            {/* rows block */}
            <div className="bg-[#17181d]">
              {filtered.length === 0 ? (
                <div className="px-5 py-8 text-white/60 text-sm">אין הזמנות להצגה.</div>
              ) : (
                filtered.map((order) => {
                  const customer = order.user?.name ? `${order.user.name}` : order.customerName ? `${order.customerName}` : "אורח";
                  const phone = order.user?.phone || order.phone || "";

                  return (
                    <div key={order._id} className="px-3 md:px-4">
                      {/* Desktop row */}
                      <div className="hidden md:grid grid-cols-12 items-center gap-2 py-4 border-b border-white/10">
                        <div className="col-span-2 text-white/80">#{order._id.slice(-6)}</div>
                        <div className="col-span-3 text-white/60">{new Date(order.createdAt).toLocaleString("he-IL")}</div>
                        <div className="col-span-3 truncate">
                          <span className="text-white/90">{customer}</span>
                          {phone && <span className="text-white/40"> · {phone}</span>}
                        </div>
                        <div className="col-span-2 text-white/70">{translateDeliveryOption(order.deliveryOption)}</div>
                        <div className="col-span-1 text-white/80">{order.totalPrice ? `₪${order.totalPrice}` : "-"}</div>

                        {/* status + details button */}
                        <div className="col-span-1 flex items-center justify-end gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] ${badgeClasses(order.status)}`}>
                            {order.status === ORDER_STATUS?.PREPARING
                              ? "בהכנה"
                              : order.status === ORDER_STATUS?.DELIVERING
                              ? "במשלוח"
                              : order.status === ORDER_STATUS?.DONE
                              ? "הושלם"
                              : "ממתין"}
                          </span>

                          <button
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs"
                            onClick={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
                          >
                            {expandedOrderId === order._id ? "הסתר פרטים" : "הצג פרטים"}
                          </button>
                        </div>
                      </div>

                      {/* Mobile card */}
                      <div className="md:hidden py-4 border-b border-white/10">
                        {/* Name + phone on top */}
                        <div className="flex items-center justify-between">
                          <div className="text-white/90 font-semibold">
                            {customer}
                            {phone && <span className="text-white/40"> · {phone}</span>}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] ${badgeClasses(order.status)}`}>
                            {order.status === ORDER_STATUS?.PREPARING
                              ? "בהכנה"
                              : order.status === ORDER_STATUS?.DELIVERING
                              ? "במשלוח"
                              : order.status === ORDER_STATUS?.DONE
                              ? "הושלם"
                              : "ממתין"}
                          </span>
                        </div>

                        {/* Order number + time */}
                        <div className="text-white/60 text-xs mt-1">
                          #{order._id.slice(-6)} · {new Date(order.createdAt).toLocaleString("he-IL")}
                        </div>

                        {/* Delivery type + total */}
                        <div className="text-white/70 text-sm mt-1">
                          {translateDeliveryOption(order.deliveryOption)} · {order.totalPrice ? `₪${order.totalPrice}` : "-"}
                        </div>

                        {/* Expand button */}
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs"
                            onClick={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
                          >
                            {expandedOrderId === order._id ? "הסתר פרטים" : "הצג פרטים"}
                          </button>
                        </div>
                      </div>

                      {/* expanded details (both views) */}
                      {expandedOrderId === order._id && (
                        <div className="mx-0 md:mx-4 mb-4 rounded-xl bg-white/5 border border-white/10 p-4 text-sm">
                          <div className="grid md:grid-cols-3 gap-4">
                            <div>
                              <div>
                                <strong>שם משתמש:</strong> {order.user ? order.user.name : order.customerName || "אורח"}
                              </div>
                              <div>
                                <strong>טלפון:</strong> {order.user ? order.user.phone : order.phone}
                              </div>
                              <div>
                                <strong>אמצעי תשלום:</strong> {translatePaymentMethod(order.paymentDetails?.method)}
                              </div>
                              <div>
                                <strong>נוצר:</strong> {formatTime(order.createdAt)}
                              </div>
                            </div>

                            <div className="md:col-span-2">
                              <h4 className="font-semibold mb-2">פרטי הזמנה</h4>
                              <ul className="space-y-2">
                                {order.items.map((item, idx) => (
                                  <li key={idx} className="leading-6">
                                    <strong>{item.product?.name || item.title || "פריט"}</strong> — כמות: {item.quantity}{" "}
                                    {item.isWeighted ? "גרם" : ""}
                                    <div className="text-white/70">
                                      ירקות: {Array.isArray(item.vegetables) && item.vegetables.length ? item.vegetables.join(", ") : "אין"}{" "}
                                      · תוספות:{" "}
                                      {Array.isArray(item.additions) && item.additions.length
                                        ? item.additions.map((a) => a.addition).join(", ")
                                        : "אין"}
                                      {item.comment ? ` · הערות: ${item.comment}` : ""}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* actions */}
                          <div className="mt-4 flex flex-wrap gap-3">
                            {order.deliveryOption === "Delivery" && order.status === ORDER_STATUS?.PREPARING && (
                              <button
                                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
                                onClick={() => markAsDelivering(order._id)}
                              >
                                במשלוח
                              </button>
                            )}

                            {((order.deliveryOption === "Delivery" && order.status === ORDER_STATUS?.DELIVERING) ||
                              +order.deliveryOption !== "Delivery") && (
                              <button
                                className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg"
                                onClick={() => markAsDone(order._id)}
                              >
                                סמן כהושלם
                              </button>
                            )}

                            {order.deliveryOption !== "EatIn" && (
                              <div className="flex items-center gap-2">
                                <label className="text-white/70">זמן הכנה:</label>
                                <select
                                  value={order.estimatedTime || ""}
                                  onChange={(e) => handleTimeChange(order._id, e.target.value)}
                                  className="bg-[#15171c] border border-white/10 rounded-lg px-3 py-2"
                                >
                                  <option value="">בחר</option>
                                  {[15, 20, 25, 30, 35, 40, 45].map((t) => (
                                    <option key={t} value={t}>
                                      {t} דקות
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <button
                              className="bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-lg"
                              onClick={() => {
                                setAddOrderId(order._id);
                                setShowAddModal(true);
                              }}
                            >
                              הוסף פריט
                            </button>

                            <button className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg" onClick={() => deleteOrder(order._id)}>
                              מחק הזמנה
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* footer: simple count */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-white/50 text-xs mt-4">
            <div>סה״כ להיום: {filtered.length} הזמנות פעילות</div>
            <div className="text-white/40">מועדון Hungry</div>
          </div>
        </div>
      </div>

      {showAddModal && <AddItemModal orderId={addOrderId} onClose={() => setShowAddModal(false)} onItemAdded={fetchOrders} />}
    </div>
  );
}
