import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import OrderListTitle from "../components/OrderListTitle";
import SideMenu from "../layouts/SideMenu";
import { ORDER_STATUS } from "../../constants/orderStatus";
import notificationSound from "../assets/notificatinSound.mp3";

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
  // play a sound when page loads
  // useEffect(() => {
  //   const unlockAudio = () => {
  //     const audio = new Audio(notificationSound);
  //     audio.play().catch(() => {}); // Try play and ignore error
  //     document.removeEventListener("click", unlockAudio);
  //   };

  //   document.addEventListener("click", unlockAudio);
  // }, []);
  useEffect(() => {
    fetchOrders();

    const interval = setInterval(() => {
      fetchOrders();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const playNotificationSound = () => {
    let count = 0;

    const play = () => {
      if (count >= 3) return;
      const audio = new Audio(notificationSound);
      audio.play().catch((e) => console.warn("Audio error:", e));
      count++;
      audio.onended = () => setTimeout(play, 1000);
    };

    play();
  };

  useEffect(() => {
    const unlock = () => {
      const a = new Audio();
      a.play().catch(() => {});
      document.removeEventListener("click", unlock);
    };
    document.addEventListener("click", unlock);
  }, []);

  const prevOrderCountRef = useRef(0);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/orders/active`);
      const newOrderList = res.data;

      const currentCount = newOrderList.length;
      const prevCount = prevOrderCountRef.current;

      // ✅ Play sound if count increased (and not on first load)
      if (prevCount !== 0 && currentCount > prevCount) {
        console.log("🔔 New order received — playing sound!");
        playNotificationSound();
      }

      prevOrderCountRef.current = currentCount;
      setOrders(newOrderList);
    } catch (err) {
      console.error("❌ שגיאה בקבלת הזמנות:", err);
      setOrders([]);
    }
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return null;
    return phone.startsWith("0") ? `+972${phone.slice(1)}` : phone;
  };

  const updateOrderStatus = async (orderId, data) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/orders/${orderId}/status`, data);
      fetchOrders();
    } catch (err) {
      console.error("שגיאה בעדכון סטטוס:", err);
    }
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק את ההזמנה?")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/orders/${orderId}`);
      fetchOrders();
    } catch (err) {
      alert("שגיאה במחיקת ההזמנה");
    }
  };

  const handleTimeChange = async (orderId, time) => {
    const order = orders.find((o) => o._id === orderId);
    const phone = order?.user?.phone || order?.phone;

    await updateOrderStatus(orderId, { status: ORDER_STATUS.PREPARING, estimatedTime: time });

    const formattedPhone = formatPhoneNumber(phone);
    const message = `ההזמנה שלך תהיה מוכנה בעוד ${time} דקות!\n\nבדוק את סטטוס ההזמנה כאן:\nhttps://hungryresturant.netlify.app/order-status`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

    // open WhatsApp in new tab
    window.open(whatsappUrl, "_blank");

    alert(`הלקוח יקבל הודעה בוואטסאפ`);
  };

  const markAsDone = async (orderId) => {
    const order = orders.find((o) => o._id === orderId);
    const phone = order?.user?.phone || order?.phone;

    await updateOrderStatus(orderId, { status: ORDER_STATUS.DONE });
    alert("ההזמנה מוכנה!");

    if (phone) {
      const lastSixDigits = orderId.slice(-6);

      // 🧾 Generate receipt
      const receipt = order.items
        .map((item, i) => {
          const name = item.product?.name || item.title || "פריט";
          const qty = item.quantity;
          const unit = item.isWeighted ? "גרם" : "יח'";
          const additions =
            Array.isArray(item.additions) && item.additions.length
              ? `\n  ➕ תוספות: ${item.additions.map((a) => a.addition).join(", ")}`
              : "";
          const veggies = Array.isArray(item.vegetables) && item.vegetables.length ? `\n  🥗 ירקות: ${item.vegetables.join(", ")}` : "";
          const comment = item.comment ? `\n  📝 הערות: ${item.comment}` : "";

          return `• ${name} - ${qty} ${unit}${additions}${veggies}${comment}`;
        })
        .join("\n");

      const message = `ההזמנה שלך (${lastSixDigits}) מוכנה! ניתן להגיע לאסוף אותה.\n\n🧾 פירוט ההזמנה:\n${receipt}\n\n💵 סכום לתשלום: ${
        order.totalPrice || "לא זמין"
      } ₪\n\nתודה שהזמנת מאיתנו ❤️`;

      const encodedMessage = encodeURIComponent(message);
      const formattedPhone = formatPhoneNumber(phone);
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
      window.open(whatsappUrl, "_blank");
    } else {
      alert("לא נמצא מספר טלפון לשליחת הודעה בוואטסאפ");
    }
  };

  const markAsDelivering = async (orderId) => {
    const order = orders.find((o) => o._id === orderId);
    const phone = order?.user?.phone || order?.phone;

    await updateOrderStatus(orderId, { status: ORDER_STATUS.DELIVERING });
    alert("המשלוח יצא לדרך!");
    if (phone) {
      const lastSixDigits = orderId.slice(-6);
      const message = `ההזמנה שלך (${lastSixDigits}) בדרך אליך!`;
      const encoded = encodeURIComponent(message);
      const formattedPhone = formatPhoneNumber(phone);
      const url = `https://wa.me/${formattedPhone}?text=${encoded}`;
      window.open(url, "_blank");
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
                      <td className="p-3">{order.user?.name ? `${order.user.name} - ${order.user.phone}` : `אורח - ${order.phone}`}</td>
                      <td className="p-3">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-bold ${
                            order.status === ORDER_STATUS.PREPARING
                              ? "bg-purple-500"
                              : order.status === ORDER_STATUS.DELIVERING
                              ? "bg-blue-500"
                              : "bg-orange-500"
                          }`}
                        >
                          {order.status === ORDER_STATUS.PREPARING
                            ? "בהכנה"
                            : order.status === ORDER_STATUS.DELIVERING
                            ? "במשלוח"
                            : "מחכה אישור"}
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

                            <div>
                              <label className="block mb-1">בחר זמן הכנה:</label>
                              <select
                                value={order.estimatedTime || ""}
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
                              {order.deliveryOption === "Delivery" && order.status === ORDER_STATUS.PREPARING ? (
                                <button
                                  className="bg-blue-600 text-white font-bold rounded px-4 py-2"
                                  onClick={() => markAsDelivering(order._id)}
                                >
                                  במשלוח
                                </button>
                              ) : (
                                <button
                                  className="bg-green-500 text-white font-bold rounded px-4 py-2"
                                  onClick={() => markAsDone(order._id)}
                                >
                                  סמן כהושלם
                                </button>
                              )}
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
