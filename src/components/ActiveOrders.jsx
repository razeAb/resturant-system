import React, { useEffect, useState } from "react";
import axios from "axios";
import OrderListTitle from "./OrderListTitle.jsx";
import SideMenu from "./SideMenu.jsx";
import styles from "./ActiveOrders.module.css"; // ✅ CSS Module import

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

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get("http://localhost:5001/api/orders/active");
      setOrders(res.data);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setOrders([]);
    }
  };

  const updateOrderStatus = async (orderId, data) => {
    try {
      await axios.put(`http://localhost:5001/api/orders/${orderId}/status`, data);
      fetchOrders();
    } catch (err) {
      console.error("Error updating order:", err);
    }
  };

  const deleteOrder = async (orderId) => {
    const confirm = window.confirm("האם אתה בטוח שברצונך למחוק את ההזמנה?");
    if (!confirm) return;
    try {
      await axios.delete(`http://localhost:5001/api/orders/${orderId}`);
      fetchOrders();
    } catch (err) {
      alert("שגיאה במחיקת ההזמנה");
    }
  };

  const handleTimeChange = async (orderId, time) => {
    await updateOrderStatus(orderId, { status: "preparing", estimatedTime: time });
    alert(`ההזמנה שלך בהכנה - מוכנה בעוד ${time} דקות`);
  };

  const markAsDone = async (orderId) => {
    await updateOrderStatus(orderId, { status: "done" });
    alert("ההזמנה מוכנה!");
  };

  return (
    <div className={styles.orderListLayout}>
      {/* Sidebar */}
      <div className={styles.sidebarContainer}>
        <SideMenu />
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          <OrderListTitle title="הזמנות פעילות" />

          <div className={styles.tableContainer}>
            {orders.length === 0 ? (
              <p className={styles.noOrders}>אין הזמנות פעילות כרגע</p>
            ) : (
              <table className={styles.orderTable}>
                <thead>
                  <tr>
                    <th>מספר הזמנה</th>
                    <th>משתמש</th>
                    <th>סטטוס</th>
                    <th>סוג הזמנה </th>
                    <th>זמן הזמנה</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <React.Fragment key={order._id}>
                      <tr>
                        <td>{order._id.slice(-6)}</td>
                        <td>{order.user?.name || "אורח"}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${styles[order.status.toLowerCase()]}`}>{order.status}</span>
                        </td>
                        <td>{order.deliveryOption}</td>
                        <td>{formatTime(order.createdAt)}</td>
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
                          <td colSpan="6">
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
                              {/* 🔥 New - Payment method and phone number */}
                              <div style={{ marginTop: "15px", textAlign: "right" }}>
                                <p>
                                  <strong>אמצעי תשלום:</strong> {order.paymentDetails?.method || "לא ידוע"}
                                </p>
                                {order.user ? (
                                  <p>
                                    <strong>טלפון משתמש:</strong> {order.user.phone || "אין טלפון"}
                                  </p> 
                                ) : order.phone ? (
                                  <p>
                                    <strong>טלפון אורח:</strong> {order.phone}
                                  </p>
                                ) : null}
                              </div>

                              <div className={styles.selectTime}>
                                <label>בחר זמן הכנה:</label>
                                <select value={order.estimatedTime || ""} onChange={(e) => handleTimeChange(order._id, e.target.value)}>
                                  <option value="">בחר זמן</option>
                                  {[15, 20, 25, 30, 35, 40, 45].map((t) => (
                                    <option key={t} value={t}>
                                      {t} דקות
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className={styles.actions}>
                                <button className={`${styles.btn} ${styles.green}`} onClick={() => markAsDone(order._id)}>
                                  סמן כהוזמנה מוכנה
                                </button>
                                <button className={`${styles.btn} ${styles.red}`} onClick={() => deleteOrder(order._id)}>
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveOrdersPage;
