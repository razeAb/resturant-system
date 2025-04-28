import React, { useEffect, useState } from "react";
import axios from "axios";
import OrderListTitle from "./OrderListTitle.jsx";
import SideMenu from "./SideMenu.jsx";
import styles from "./ActiveOrders.module.css"; // ✅ Reusing styles

// ✅ Format time
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const formattedDate = date.toLocaleDateString("he-IL");
  const formattedTime = date.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date: formattedDate, time: formattedTime };
};

// ✅ Fetch order history
const getOrderHistory = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get("http://localhost:5001/api/orders/history", {
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

  useEffect(() => {
    getOrderHistory()
      .then((data) => {
        setOrders(data);
        const today = new Date().toISOString().split("T")[0]; // 📅 Format YYYY-MM-DD
        setFromDate(today);
        setToDate(today);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  // ✅ Filter orders by date
  const filteredOrders = orders.filter((order) => {
    const orderDate = new Date(order.createdAt).toISOString().split("T")[0];
    return orderDate >= fromDate && orderDate <= toDate;
  });

  return (
    <div className={styles.orderListLayout}>
      {/* Sidebar */}
      <div className={styles.sidebarContainer}>
        <SideMenu />
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          <OrderListTitle title="היסטוריית הזמנות" />

          {/* ✅ Date Filters */}
          <div style={{ marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center" }}>
            <label>
              מתאריך:
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ padding: "8px", borderRadius: "5px", border: "1px solid #ccc", marginLeft: "5px" }}
              />
            </label>

            <label>
              עד תאריך:
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ padding: "8px", borderRadius: "5px", border: "1px solid #ccc", marginLeft: "5px" }}
              />
            </label>
          </div>

          {/* ✅ Orders Table */}
          <div className={styles.tableContainer}>
            {filteredOrders.length === 0 ? (
              <p className={styles.noOrders}>אין הזמנות בהיסטוריה</p>
            ) : (
              <table className={styles.orderTable}>
                <thead>
                  <tr>
                    <th>מספר הזמנה</th>
                    <th>תאריך</th>
                    <th>שעה</th>
                    <th>פעולה</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const { date, time } = formatTime(order.createdAt);
                    return (
                      <React.Fragment key={order._id}>
                        <tr>
                          <td>{order._id.slice(-6)}</td>
                          <td>{date}</td>
                          <td>{time}</td>
                          <td>
                            <button
                              className={styles.actionBtn}
                              onClick={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
                            >
                              {expandedOrderId === order._id ? "הסתר" : "עוד פרטים"}
                            </button>
                          </td>
                        </tr>

                        {expandedOrderId === order._id && (
                          <tr className={styles.orderDetailsRow}>
                            <td colSpan="4">
                              <div className={styles.orderDetails}>
                                {/* ✅ User Info */}
                                <div style={{ textAlign: "right", marginBottom: "10px" }}>
                                  <p>
                                    <strong>משתמש:</strong> {order.user ? order.user.name : "אורח"}
                                  </p>
                                  <p>
                                    <strong>טלפון:</strong> {order.user ? order.user.phone : order.phone || "אין טלפון"}
                                  </p>
                                </div>

                                <h4>פרטי ההזמנה</h4>
                                <ul>
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
