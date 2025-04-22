import React, { useEffect, useState } from "react";
import axios from "axios";
import OrderListTitle from "./OrderListTitle.jsx";
import SideMenu from "./SideMenu.jsx";
import styles from "./ActiveOrders.module.css"; // ✅ Reusing styles from ActiveOrders

// ✅ Format returns separate date and time
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const formattedDate = date.toLocaleDateString("he-IL"); // e.g., 16/04/2025
  const formattedTime = date.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  }); // e.g., 14:30
  return { date: formattedDate, time: formattedTime };
};

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

  useEffect(() => {
    getOrderHistory()
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className={styles.orderListLayout}>
      <div className={styles.sidebarContainer}>
        <SideMenu />
      </div>

      <div className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          <OrderListTitle title="היסטוריית הזמנות" />

          <div className={styles.tableContainer}>
            {orders.length === 0 ? (
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
                  {orders.map((order) => {
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
