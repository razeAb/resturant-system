import React, { useEffect, useState } from "react";
import axios from "axios";
import SideMenu from "./SideMenu";

const ActiveOrdersPage = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get("http://localhost:5001/orders/active");
      setOrders(res.data);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  const updateOrderStatus = async (orderId, data) => {
    try {
      await axios.put(`http://localhost:5001/orders/${orderId}/status`, data);
      fetchOrders();
    } catch (err) {
      console.error("Error updating order:", err);
    }
  };

  const handleTimeChange = async (orderId, time) => {
    await updateOrderStatus(orderId, {
      status: "preparing",
      estimatedTime: time,
    });
    alert(`ההזמנה שלך בהכנה - מוכנה בעוד ${time} דקות`);
  };

  const markAsDone = async (orderId) => {
    await updateOrderStatus(orderId, { status: "done" });
    alert("ההזמנה שלך מוכנה!");
  };

  return (
    <>
      <SideMenu />
      <div style={{ padding: "20px" }}>
        <h1>הזמנות פעילות</h1>
        {orders.length === 0 ? (
          <p>אין הזמנות פעילות כרגע</p>
        ) : (
          orders.map((order) => (
            <div
              key={order._id || order.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "20px",
                marginBottom: "20px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              }}
            >
              <h3>מספר הזמנה: {order._id || order.id}</h3>
              <p>
                <strong>אפשרות:</strong> {order.deliveryOption}
              </p>
              <p>
                <strong>סטטוס:</strong> {order.status}
              </p>

              <ul>
                {order.items.map((item, idx) => (
                  <li key={idx}>
                    <strong>{item.title}</strong> - כמות: {item.quantity} {item.isWeighted ? "גרם" : ""}
                    <br />
                    ירקות: {item.vegetables.join(", ") || "אין"}
                    <br />
                    תוספות: {item.additions.map((a) => a.addition).join(", ") || "אין"}
                    <br />
                    הערות: {item.comment || "אין"}
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: "10px" }}>
                <label>בחר זמן הכנה:</label>{" "}
                <select onChange={(e) => handleTimeChange(order._id || order.id, e.target.value)} value={order.estimatedTime || ""}>
                  <option value="">בחר זמן</option>
                  {[15, 20, 25, 30, 35, 40, 45].map((t) => (
                    <option key={t} value={t}>
                      {t} דקות
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => markAsDone(order._id || order.id)}
                style={{
                  marginTop: "10px",
                  backgroundColor: "green",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: "5px",
                }}
              >
                סמן כהוזמנה מוכנה
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default ActiveOrdersPage;
