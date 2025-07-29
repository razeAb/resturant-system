// Fixed ActiveOrders with updated design and logic
import React, { useEffect, useState } from "react";
import api from "../api";
import { ORDER_STATUS } from "../../constants/orderStatus";
import AddItemModal from "./modals/AddItemModal";

const statusClass = {
  [ORDER_STATUS.PENDING]: "bg-[#3e2723]/20 text-[#ff7043]",
  [ORDER_STATUS.PREPARING]: "bg-purple-500/20 text-purple-300",
  [ORDER_STATUS.DELIVERING]: "bg-[#1565c0]/20 text-[#42a5f5]",
  [ORDER_STATUS.DONE]: "bg-[#1b5e20]/20 text-[#66bb6a]",
};

const translateDeliveryOption = (option) => {
  switch (option) {
    case "EatIn":
      return "אכילה במקום";
    case "Delivery":
      return "משלוח";
    case "Pickup":
      return "איסוף עצמי";
    default:
      return option || "-";
  }
};

export default function ActiveOrders() {
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addOrderId, setAddOrderId] = useState(null);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get("/api/orders/active");
      setOrders(res.data || []);
    } catch (err) {
      console.error("Error fetching orders", err);
      setOrders([]);
    }
  };

  const updateOrderStatus = async (id, data) => {
    try {
      await api.put(`/api/orders/${id}/status`, data);
      fetchOrders();
    } catch (err) {
      console.error("Error updating status", err);
    }
  };

  const deleteOrder = async (id) => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק את ההזמנה?")) return;
    try {
      await api.delete(`/api/orders/${id}`);
      fetchOrders();
    } catch (err) {
      alert("שגיאה במחיקת ההזמנה");
    }
  };

  const handleTimeChange = async (orderId, time) => {
    await updateOrderStatus(orderId, { status: ORDER_STATUS.PREPARING, estimatedTime: time });
  };

  const markAsDone = async (id) => {
    await updateOrderStatus(id, { status: ORDER_STATUS.DONE });
    alert("ההזמנה מוכנה!");
  };

  const markAsDelivering = async (id) => {
    await updateOrderStatus(id, { status: ORDER_STATUS.DELIVERING });
    alert("המשלוח יצא לדרך!");
  };

  return (
    <div className="min-h-screen flex bg-[#0f1015] text-white font-[Inter]" dir="rtl">
      {/* Sidebar */}
      <aside className="w-[260px] bg-[#0c0d12] p-6 hidden md:flex flex-col justify-between">
        <div>
          <div className="text-3xl font-bold text-white mb-10">
            <span className="text-[#40f99b]">Sedap</span>.<div className="text-xs font-normal text-[#7d808a]">מערכת ניהול</div>
          </div>
          <nav className="flex flex-col gap-4 text-[#7d808a] text-sm">
            <div className="flex items-center gap-3">
              <i className="fas fa-th-large" /> לוח בקרה
            </div>
            <div className="flex items-center gap-3 text-[#40f99b] font-medium">
              <i className="fas fa-list-ul" /> רשימת הזמנות
            </div>
            <div className="flex items-center gap-3">
              <i className="fas fa-file-alt" /> פרטי הזמנה
            </div>
            <div className="flex items-center gap-3">
              <i className="fas fa-user" /> לקוחות
            </div>
            <div className="flex items-center gap-3">
              <i className="fas fa-chart-bar" /> אנליטיקות
            </div>
            <div className="flex items-center gap-3">
              <i className="fas fa-star" /> ביקורות
            </div>
            <div className="flex items-center gap-3">
              <i className="fas fa-utensils" /> מנות
            </div>
            <div className="flex items-center gap-3">
              <i className="fas fa-info-circle" /> פרטי מנה
            </div>
            <div className="flex items-center gap-3">
              <i className="fas fa-id-card" /> פרטי לקוח
            </div>
            <div className="flex items-center gap-3">
              <i className="fas fa-calendar-alt" /> יומן
            </div>
            <div className="flex items-center gap-3">
              <i className="fas fa-comments" /> צ'אט
            </div>
            <div className="flex items-center gap-3">
              <i className="fas fa-wallet" /> ארנק
            </div>
          </nav>
        </div>
        <div className="bg-[#1f222d] rounded-lg p-4 text-center text-sm mt-4">
          <img src="https://placehold.co/160x100" alt="הוסף תפריט" className="mx-auto mb-2" />
          <p className="mb-2">סדר את התפריט שלך באמצעות הכפתור למטה!</p>
          <button className="bg-[#40f99b] text-black font-semibold px-4 py-2 rounded">+ הוסף תפריט</button>
        </div>
        <div className="text-xs text-[#7d808a] mt-6">
          מערכת ניהול מסעדה
          <br />© 2023 כל הזכויות שמורות
          <br />
          נוצר באהבה על ידי Peterdraw
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-6">
          <input type="text" placeholder="חיפוש" className="bg-[#1a1c24] placeholder-[#7d808a] text-white px-4 py-2 rounded w-1/3" />
          <div className="flex items-center gap-4">
            <div className="flex gap-3 text-lg text-[#7d808a]">
              <i className="fas fa-comment" />
              <i className="fas fa-bell" />
              <i className="fas fa-shopping-cart" />
              <i className="fas fa-cog" />
            </div>
            <div className="text-sm">
              שלום, <span className="font-semibold text-white">Admin</span>
            </div>
            <img src="https://placehold.co/40x40" alt="Admin" className="rounded-full" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold mb-2">הזמנות פעילות</h1>
        <p className="text-sm text-[#7d808a] mb-6">רשימת ההזמנות הפעילות</p>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <button className="bg-[#00c48c] text-white px-4 py-2 rounded font-medium">כל הסטטוסים</button>
          <button className="bg-[#1a1c24] text-white px-4 py-2 rounded font-medium">היום</button>
        </div>

        {/* Table */}
        <div className="rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 bg-[#00c48c] text-sm font-medium text-white px-4 py-3">
            <div>מספר הזמנה</div>
            <div>תאריך</div>
            <div>שם לקוח</div>
            <div>משלוח</div>
            <div>סכום</div>
            <div>סטטוס</div>
            <div>פעולות</div>
          </div>

          {orders.map((order) => (
            <React.Fragment key={order._id}>
              <div className="grid grid-cols-7 text-sm items-center bg-[#1a1c24] px-4 py-3 border-b border-[#1f222d]">
                <div>{order._id.slice(-6)}</div>
                <div>{new Date(order.createdAt).toLocaleString("he-IL")}</div>
                <div>{order.user?.name || order.customerName || "אורח"}</div>
                <div>{translateDeliveryOption(order.deliveryOption)}</div>
                <div>{order.totalPrice ? `${order.totalPrice} ₪` : "-"}</div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClass[order.status] || ""}`}>{order.status}</span>
                </div>
                <div>
                  <button
                    className="bg-[#00c48c] text-black px-2 py-1 rounded"
                    onClick={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
                  >
                    {expandedOrderId === order._id ? "הסתר" : "פרטים"}
                  </button>
                </div>
              </div>
              {expandedOrderId === order._id && (
                <div className="bg-[#1a1c24] px-4 py-4 border-b border-[#1f222d] text-sm space-y-3">
                  <div>
                    <p>
                      <strong>שם משתמש:</strong> {order.user ? order.user.name : order.customerName || "אורח"}
                    </p>
                    <p>
                      <strong>טלפון:</strong> {order.user ? order.user.phone : order.phone}
                    </p>
                  </div>
                  <h4 className="text-lg font-bold">פרטי הזמנה</h4>
                  <ul className="list-disc ml-5 space-y-1">
                    {order.items.map((item, idx) => (
                      <li key={idx}>
                        <strong>{item.product?.name || item.title || "פריט"}</strong> - כמות: {item.quantity}
                        {item.isWeighted ? " גרם" : ""}
                        {Array.isArray(item.vegetables) && item.vegetables.length ? <div>ירקות: {item.vegetables.join(", ")}</div> : null}
                        {Array.isArray(item.additions) && item.additions.length ? (
                          <div>תוספות: {item.additions.map((a) => a.addition).join(", ")}</div>
                        ) : null}
                        {item.comment && <div>הערות: {item.comment}</div>}
                      </li>
                    ))}
                  </ul>
                  <p>
                    <strong>אמצעי תשלום:</strong> {order.paymentDetails?.method || "לא ידוע"}
                  </p>
                  <p>
                    <strong>סכום לתשלום:</strong> {order.totalPrice ? `${order.totalPrice} ₪` : "לא זמין"}
                  </p>
                  {order.deliveryOption !== "EatIn" && (
                    <div>
                      <label className="block mb-1">בחר זמן הכנה:</label>
                      <select
                        value={order.estimatedTime || ""}
                        onChange={(e) => handleTimeChange(order._id, e.target.value)}
                        className="bg-[#1a1c24] border border-[#1f222d] rounded px-2 py-1"
                      >
                        <option value="">בחר זמן</option>
                        {[15, 20, 25, 30, 35, 40, 45].map((t) => (
                          <option key={t} value={t}>
                            {t} דקות
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {order.deliveryOption === "Delivery" && order.status === ORDER_STATUS.PREPARING && (
                      <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={() => markAsDelivering(order._id)}>
                        במשלוח
                      </button>
                    )}
                    {((order.deliveryOption === "Delivery" && order.status === ORDER_STATUS.DELIVERING) ||
                      order.deliveryOption !== "Delivery") && (
                      <button className="bg-green-500 text-white px-3 py-1 rounded" onClick={() => markAsDone(order._id)}>
                        סמן כהושלם
                      </button>
                    )}
                    <button
                      className="bg-yellow-600 text-white px-3 py-1 rounded"
                      onClick={() => {
                        setAddOrderId(order._id);
                        setShowAddModal(true);
                      }}
                    >
                      הוסף פריט
                    </button>
                    <button className="bg-red-500 text-white px-3 py-1 rounded" onClick={() => deleteOrder(order._id)}>
                      מחק הזמנה
                    </button>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Footer */}
        <div className="text-sm text-[#7d808a] mt-4">
          מציג {orders.length} מתוך {orders.length} הזמנות
        </div>
        <div className="flex gap-2 mt-2">
          {[1, 2, 3, 4].map((num) => (
            <button key={num} className={`px-3 py-1 rounded ${num === 1 ? "bg-[#1a1c24] text-white" : "bg-[#1a1c24] text-[#7d808a]"}`}>
              {num}
            </button>
          ))}
        </div>
      </main>
      {showAddModal && <AddItemModal orderId={addOrderId} onClose={() => setShowAddModal(false)} onItemAdded={fetchOrders} />}
    </div>
  );
}
