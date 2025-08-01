import React, { useState, useEffect } from "react";
import api from "../../api";
import OrderListTitle from "../../components/OrderListTitle";
import SideMenu from "../../layouts/SideMenu";
import { ORDER_STATUS } from "../../../constants/orderStatus";

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "רגע עכשיו";
  if (diffMinutes < 60) return `${diffMinutes} דקות`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} שעות`;
  return date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
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
      return option;
  }
};

const KitchenOrders = () => {
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
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

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#2a2a2a] text-white relative">
      {/* Mobile Menu Button */}
      <button onClick={() => setIsSidebarOpen(true)} className="md:hidden bg-[#2c2c2e] text-white px-4 py-3">
        ☰ תפריט
      </button>{" "}
      {/* Sidebar - Desktop */}
      <aside className="w-60 bg-[#2c2c2e] hidden md:block">
        <SideMenu />
      </aside>
      {/* Sidebar - Mobile */}
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
      {/* Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      {/* Main Content */}
      <div className="min-h-screen bg-[#2a2a2a] text-white p-5 flex-1" dir="rtl">
        <OrderListTitle title="מסך מטבח" />
        {orders.length === 0 ? (
          <p className="text-white/70 p-4">אין הזמנות כרגע</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm bg-[#2a2a2a] border-collapse" dir="rtl">
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
                      <td className="p-3">
                        {order.user?.name
                          ? `${order.user.name} - ${order.user.phone}`
                          : order.customerName
                          ? `${order.customerName} - ${order.phone}`
                          : `אורח - ${order.phone}`}
                      </td>
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
                            : "ממתין"}
                        </span>
                      </td>
                      <td className="p-3">{translateDeliveryOption(order.deliveryOption)}</td>
                      <td className="p-3">{formatTime(order.createdAt)}</td>
                      <td className="p-3">
                        <button
                          className="text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-sm"
                          onClick={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
                        >
                          {expandedOrderId === order._id ? "הסתר" : "פרטים"}
                        </button>
                      </td>
                    </tr>
                    {expandedOrderId === order._id && (
                      <tr className="bg-white/5">
                        <td colSpan="6" className="p-4">
                          <div className="space-y-4">
                            <div>
                              <p>
                                <strong>שם משתמש:</strong> {order.user ? order.user.name : order.customerName || "אורח"}
                              </p>
                              <p>
                                <strong>טלפון:</strong> {order.user ? order.user.phone : order.phone}
                              </p>
                            </div>

                            <h4 className="text-lg font-bold">פרטי הזמנה</h4>
                            <ul className="text-sm space-y-2">
                              {order.items.map((item, idx) => (
                                <li key={idx}>
                                  <strong>{item.product?.name || item.title || "פריט"}</strong> - כמות: {item.quantity}
                                  {item.isWeighted ? " גרם" : ""}
                                </li>
                              ))}
                            </ul>

                            <div className="flex flex-col sm:flex-row gap-4">
                              {order.status !== ORDER_STATUS.DONE && (
                                <button
                                  className="bg-green-500 text-white font-bold rounded px-4 py-2"
                                  onClick={() => updateStatus(order._id, ORDER_STATUS.DONE)}
                                >
                                  הושלם
                                </button>
                              )}
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
      </div>
    </div>
  );
};

export default KitchenOrders;
