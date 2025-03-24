// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem("token"); // 🔐 Get JWT token

      const res = await axios.get("/api/admin/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setData(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching admin data:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <p>Loading admin dashboard...</p>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">📊 Admin Dashboard</h1>

      {/* Total Revenue */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold">💰 Total Revenue: {data.totalRevenue} ₪</h2>
      </div>

      {/* Top Customers */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">🔥 Top Customers</h2>
        <ul>
          {data.topCustomers.map((user) => (
            <li key={user._id}>
              {user.name} – {user.orderCount} Orders
            </li>
          ))}
        </ul>
      </div>

      {/* Low Stock */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">⚠️ Low Stock Products</h2>
        <ul>
          {data.lowStockProducts.map((p) => (
            <li key={p._id}>
              {p.name} – {p.stock} ק"ג
            </li>
          ))}
        </ul>
      </div>

      {/* Hot Products */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">🔥 Best Sellers</h2>
        <ul>
          {data.hotProducts.map((p, i) => (
            <li key={i}>
              {p.name} – {p.orders} grams ordered
            </li>
          ))}
        </ul>
      </div>

      {/* Cold Products */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">❄️ Least Popular</h2>
        <ul>
          {data.coldProducts.map((p, i) => (
            <li key={i}>
              {p.name} – {p.orders} grams ordered
            </li>
          ))}
        </ul>
      </div>

      {/* Users */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">👥 All Users</h2>
        <ul>
          {data.users.map((user) => (
            <li key={user._id}>
              {user.name} ({user.email}) – {user.orderCount} orders, {user.points} points
            </li>
          ))}
        </ul>
      </div>

      {/* Orders */}
      <div>
        <h2 className="text-lg font-semibold mb-2">📦 Orders</h2>
        <ul>
          {data.orders.map((order) => (
            <li key={order._id}>
              Order by {order.user?.name} – Total: {order.totalPrice} ₪
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AdminDashboard;
