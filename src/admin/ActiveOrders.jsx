import React, { useEffect, useState } from "react";
import axios from "axios";
import OrderListTitle from "../components/OrderListTitle";
import SideMenu from "../layouts/SideMenu";

const formatPhoneNumberForWhatsApp = (phone) => {
  if (!phone) return "";
  if (phone.startsWith("05")) {
    return "+972" + phone.slice(1);
  }
  return phone;
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "רגע עכשיו";
  if (diffMinutes < 60) return `${diffMinutes} דקות`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} שעות`;
  return date.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ActiveOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get("http://localhost:5001/api/orders/active");
      setOrders(res.data);
    } catch (err) {
      console.error("שגיאה בקבלת הזמנות:", err);
      setOrders([]);
    }
  };

  const updateOrderStatus = async (orderId, data) => {
    try {
      await axios.put(`http://localhost:5001/api/orders/${orderId}/status`, data);
      fetchOrders();
    } catch (err) {
      console.error("שגיאה בעדכון סטטוס:", err);
    }
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק את ההזמנה?")) return;
    try {
      await axios.delete(`http://localhost:5001/api/orders/${orderId}`);
      fetchOrders();
    } catch (err) {
      alert("שגיאה במחיקת ההזמנה");
    }
  };

  const handleTimeChange = async (orderId, time) => {
    const order = orders.find((o) => o._id === orderId);
    const phone = order?.user?.phone || order?.phone;
    const formattedPhone = formatPhoneNumberForWhatsApp(phone);

    if (!formattedPhone) {
      alert("לא נמצא מספר טלפון תקין לשליחת הודעה");
      return;
    }

    // ✅ Compute estimated ready time in the future
    const estimatedReadyTime = new Date(Date.now() + time * 60000);

    try {
      await axios.patch(`http://localhost:5001/api/orders/${orderId}/estimated-time`, {
        estimatedReadyTime,
      });

      // ✅ Notify via WhatsApp
      const encodedMessage = encodeURIComponent(`ההזמנה שלך תהיה מוכנה בעוד ${time} דקות!`);
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
      window.open(whatsappUrl, "_blank");

      alert("הלקוח יקבל הודעה בוואטסאפ");
      fetchOrders(); // refresh UI
    } catch (err) {
      console.error(err);
      alert("שגיאה בעדכון זמן ההכנה");
    }
  };

  const markAsDone = async (orderId) => {
    const order = orders.find((o) => o._id === orderId);
    const phone = order?.user?.phone || order?.phone;

    await updateOrderStatus(orderId, { status: "done" });
    alert("ההזמנה מוכנה!");

    if (phone) {
      const lastSixDigits = orderId.slice(-6); // Shorter ID for easier reading
      const message = `ההזמנה שלך (${lastSixDigits}) מוכנה! ניתן להגיע לאסוף אותה. תודה שהזמנת מאיתנו ❤️`;
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
      window.open(whatsappUrl, "_blank");
    } else {
      alert("לא נמצא מספר טלפון לשליחת הודעה בוואטסאפ");
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#2a2a2a] text-white relative overflow-x-hidden">
      {/* כפתור תפריט מובייל */}
      <button onClick={() => setIsSidebarOpen(true)} className="md:hidden bg-[#2c2c2e] text-white px-4 py-3">
        ☰ תפריט
      </button>

      {/* תפריט צד - דסקטופ */}
      <aside className="w-60 bg-[#2c2c2e] hidden md:block">
        <SideMenu />
      </aside>

      {/* תפריט צד - מובייל */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-[#2c2c2e] z-50 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:hidden`}
      >
        <div className="flex justify-end p-4">
          <button onClick={() => setIsSidebarOpen(false)} className="text-white text-lg">
            ❌
          </button>
        </div>
        <SideMenu />
      </div>

      {/* רקע כהה כאשר תפריט פתוח */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* תוכן ראשי - RTL */}
      <main className="flex-1 p-5 overflow-x-auto text-right" dir="rtl">
        <OrderListTitle title="הזמנות פעילות" />
        {orders.length === 0 ? (
          <p className="text-white/70 p-4">אין הזמנות פעילות כרגע</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm bg-[#2a2a2a] border-collapse">
              <thead>
                <tr className="text-white/50 border-b border-white/20">
                  <th className="text-right p-3">מספר הזמנה</th>
                  <th className="text-right p-3">שם משתמש</th>
                  <th className="text-right p-3">סטטוס</th>
                  <th className="text-right p-3">סוג משלוח</th>
                  <th className="text-right p-3">זמן יצירה</th>
                  <th className="text-right p-3">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <React.Fragment key={order._id}>
                    <tr className="border-b border-white/10">
                      <td className="p-3">{order._id.slice(-6)}</td>
                      <td className="p-3">{order.user?.name || "אורח"}</td>
                      <td className="p-3">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-bold ${
                            order.status === "preparing" ? "bg-purple-500" : "bg-orange-500"
                          }`}
                        >
                          {order.status === "preparing" ? "בהכנה" : "מחכה אישור"}
                        </span>
                      </td>
                      <td className="p-3">{order.deliveryOption}</td>
                      <td className="p-3">{formatTime(order.createdAt)}</td>
                      <td className="p-3">
                        <button
                          className="text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-sm"
                          onClick={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
                        >
                          {expandedOrderId === order._id ? "הסתר פרטים" : "הצג פרטים"}
                        </button>
                      </td>
                    </tr>

                    {expandedOrderId === order._id && (
                      <tr className="bg-white/5">
                        <td colSpan="6" className="p-4">
                          <div className="space-y-4">
                            <div>
                              <p>
                                <strong>שם משתמש:</strong> {order.user ? order.user.name : "אורח"}
                              </p>
                              <p>
                                <strong>טלפון:</strong> {order.user ? order.user.phone : order.phone}
                              </p>
                            </div>

                            <h4 className="text-lg font-bold">פרטי הזמנה</h4>
                            <ul className="text-sm space-y-2">
                              {order.items.map((item, idx) => (
                                <li key={idx}>
                                  <strong>{item.product?.name || item.title || "פריט לא ידוע"}</strong> - כמות: {item.quantity}{" "}
                                  {item.isWeighted ? "גרם" : ""}
                                  <br />
                                  ירקות: {Array.isArray(item.vegetables) && item.vegetables.length ? item.vegetables.join(", ") : "אין"}
                                  <br />
                                  תוספות:{" "}
                                  {Array.isArray(item.additions) && item.additions.length
                                    ? item.additions.map((a) => a.addition).join(", ")
                                    : "אין"}
                                  <br />
                                  הערות: {item.comment || "אין הערות"}
                                </li>
                              ))}
                            </ul>

                            <p>
                              <strong>אמצעי תשלום:</strong> {order.paymentDetails?.method || "לא ידוע"}
                            </p>
                            <p>
                              <strong>סכום לתשלום:</strong> {order.totalPrice ? `${order.totalPrice} ₪` : "לא זמין"}
                            </p>
                            {order.estimatedReadyTime && (
                              <p>
                                <strong>זמן מוערך לסיום:</strong>{" "}
                                {new Date(order.estimatedReadyTime).toLocaleTimeString("he-IL", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            )}
                            <div>
                              <label className="block mb-1">בחר זמן הכנה:</label>
                              <select
                                defaultValue=""
                                onChange={(e) => handleTimeChange(order._id, e.target.value)}
                                className="bg-[#2a2a2a] border border-white/20 text-white rounded px-3 py-2"
                              >
                                <option value="">בחר זמן</option>
                                {[15, 20, 25, 30, 35, 40, 45].map((t) => (
                                  <option key={t} value={t}>
                                    {t} דקות
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                              <button className="bg-green-500 text-white font-bold rounded px-4 py-2" onClick={() => markAsDone(order._id)}>
                                סמן כהושלם
                              </button>
                              <button className="bg-red-500 text-white font-bold rounded px-4 py-2" onClick={() => deleteOrder(order._id)}>
                                מחק הזמנה
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default ActiveOrdersPage;
