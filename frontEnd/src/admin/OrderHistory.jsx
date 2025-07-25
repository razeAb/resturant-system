import React, { useEffect, useState } from "react";
import axios from "axios";
import OrderListTitle from "../components/OrderListTitle";
import SideMenu from "../layouts/SideMenu";

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const formattedDate = date.toLocaleDateString("he-IL");
  const formattedTime = date.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date: formattedDate, time: formattedTime };
};

const getOrderHistory = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`/api/orders/history`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    getOrderHistory()
      .then((data) => {
        setOrders(data);
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const today = now.toISOString().split("T")[0];
        setFromDate(today);
        setToDate(today);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center text-slate-400 py-10">Loading...</div>;
  if (error) return <div className="text-center text-red-400 py-10">Error: {error}</div>;

  const filteredOrders = orders.filter((order) => {
    const orderDate = new Date(order.createdAt).toISOString().split("T")[0];
    return orderDate >= fromDate && orderDate <= toDate;
  });

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#2a2a2a] text-white relative">
      <button onClick={() => setIsSidebarOpen(true)} className="md:hidden bg-[#2c2c2e] text-white px-4 py-3">
        ☰ תפריט
      </button>

      <aside className="w-60 bg-[#2c2c2e] hidden md:block">
        <SideMenu />
      </aside>

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

      {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <main className="flex-1 p-5 overflow-x-auto">
        <OrderListTitle title="היסטוריית הזמנות" />

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
        </div>

        {filteredOrders.length === 0 ? (
          <p className="text-white/70 p-4">אין הזמנות בהיסטוריה</p>
        ) : (
          <div className="overflow-x-auto">
            {/* ✅ Order count summary */}
            <p className="text-white/70 mb-4">סה"כ הזמנות בטווח התאריכים: {filteredOrders.length}</p>

            <table className="min-w-full text-sm bg-[#2a2a2a] border-collapse">
              <thead>
                <tr className="text-white/50 border-b border-white/20">
                  <th className="text-right p-3">מספר הזמנה</th>
                  <th className="text-right p-3">תאריך</th>
                  <th className="text-right p-3">שעה</th>
                  <th className="text-right p-3">פעולה</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const { date, time } = formatTime(order.createdAt);
                  return (
                    <React.Fragment key={order._id}>
                      <tr className="border-b border-white/10">
                        <td className="p-3">{order._id.slice(-6)}</td>
                        <td className="p-3">{date}</td>
                        <td className="p-3">{time}</td>
                        <td className="p-3">
                          <button
                            className="text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-sm"
                            onClick={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
                          >
                            {expandedOrderId === order._id ? "הסתר" : "עוד פרטים"}
                          </button>
                        </td>
                      </tr>
                      {expandedOrderId === order._id && (
                        <tr className="bg-white/5">
                          <td colSpan="4" className="p-4">
                            <div className="text-right space-y-4">
                              <div>
                                <p>
                                  <strong>משתמש:</strong> {order.user ? order.user.name : order.customerName || "אורח"}
                                </p>
                                <p>
                                  <strong>טלפון:</strong> {order.user ? order.user.phone : order.phone || "אין טלפון"}
                                </p>
                                <p>
                                  <strong>סכום לתשלום:</strong> {order.totalPrice ? `₪${order.totalPrice} ` : "לא זמין"}
                                </p>
                              </div>
                              <h4 className="text-lg font-bold">פרטי ההזמנה</h4>
                              <ul className="text-sm space-y-2">
                                {order.items.map((item, idx) => (
                                  <li key={idx}>
                                    <strong>{item.product?.name || item.title || "לא ידוע"}</strong> - כמות: {item.quantity}{" "}
                                    {item.isWeighted ? "גרם" : ""}
                                    <br />
                                    ירקות: {Array.isArray(item.vegetables) && item.vegetables.length ? item.vegetables.join(", ") : "אין"}
                                    <br />
                                    תוספות:{" "}
                                    {Array.isArray(item.additions) && item.additions.length
                                      ? item.additions.map((a) => a.addition).join(", ")
                                      : "אין"}
                                    <br />
                                    הערות: {item.comment || "אין"}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
