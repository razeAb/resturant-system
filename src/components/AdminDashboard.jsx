import React, { useEffect, useState } from "react";
import axios from "axios";
import SideMenu from "./SideMenu";
import styles from "./ActiveOrders.module.css"; // 👈 using ActiveOrders styling for layout

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState("");

  const customStyles = {
    header: {
      textAlign: "center",
      marginBottom: "2rem",
    },
    title: {
      fontSize: "2.2rem",
      fontWeight: "700",
      color: "#f8fafc", // bright white
      marginBottom: "0.25rem",
    },
    subtitle: {
      color: "#cbd5e1", // light gray
      fontSize: "1rem",
      fontWeight: "400",
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "1.5rem",
      marginBottom: "3rem",
    },
    statCard: {
      background: "#1f2937", // dark card background
      borderRadius: "12px",
      padding: "1.5rem",
      boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
      color: "#f1f5f9",
    },
    statValue: {
      fontSize: "2rem",
      fontWeight: "700",
      color: "#ffffff",
      margin: "0.5rem 0",
    },
    statLabel: {
      color: "#cbd5e1",
      fontSize: "0.9rem",
      fontWeight: "500",
    },
    sectionTitle: {
      fontSize: "2rem", // ⬅️ make it big and bold
      fontWeight: "800",
      color: "#f8fafc",
      marginBottom: "1.5rem",
      paddingBottom: "0.75rem",
      borderBottom: "2px solid #334155",
      letterSpacing: "-0.5px",
    },
    customerList: {
      listStyle: "none",
      padding: "1rem",
      margin: "0",
      backgroundColor: "#1e293b",
      borderRadius: "12px",
    },
    customerItem: {
      padding: "0.75rem 0",
      borderBottom: "1px solid #334155",
      display: "flex",
      justifyContent: "space-between",
      color: "#e2e8f0",
    },
    hotProduct: {
      color: "#f87171", // soft red
      fontWeight: "500",
    },
    coldProduct: {
      color: "#60a5fa", // soft blue
      fontWeight: "500",
    },
    loading: {
      textAlign: "center",
      padding: "3rem",
      color: "#94a3b8",
    },
    error: {
      textAlign: "center",
      padding: "3rem",
      color: "#f87171",
      fontWeight: "500",
    },
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://localhost:5001/api/admin/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDashboardData(response.data);
      } catch (err) {
        console.error("Error fetching admin data:", err);
        setError("שגיאה בטעינת לוח הבקרה");
      }
    };
    fetchDashboard();
  }, []);

  if (error) return <div className={styles.error}>{error}</div>;
  if (!dashboardData) return <div className={styles.loading}>טוען נתונים...</div>;

  const { totalRevenue, topCustomers, hotProducts, coldProducts, products } = dashboardData;

  return (
    <div className={styles.orderListLayout}>
      <div className={styles.sidebarContainer}>
        <SideMenu />
      </div>

      <div className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          <header style={customStyles.header}>
            <h1 style={customStyles.title}>📊 לוח בקרה</h1>
            <p style={customStyles.subtitle}>ניהול מוצרים, לקוחות ודוחות</p>
          </header>

          <div style={customStyles.statsGrid}>
            <div style={customStyles.statCard}>
              <span style={customStyles.statLabel}>💰 סך ההכנסות</span>
              <h3 style={customStyles.statValue}>₪{totalRevenue}</h3>
            </div>
            <div style={customStyles.statCard}>
              <span style={customStyles.statLabel}>📦 מוצרים</span>
              <h3 style={customStyles.statValue}>{products.length}</h3>
            </div>
            <div style={customStyles.statCard}>
              <span style={customStyles.statLabel}>🔥 חמים</span>
              <h3 style={customStyles.statValue}>{hotProducts.length}</h3>
            </div>
            <div style={customStyles.statCard}>
              <span style={customStyles.statLabel}>❄️ קרים</span>
              <h3 style={customStyles.statValue}>{coldProducts.length}</h3>
            </div>
          </div>

          <div style={{ marginBottom: "3rem" }}>
            <h2 className={styles.sectionTitle}>🏆 לקוחות מובילים</h2>
            <ul style={customStyles.customerList}>
              {topCustomers.map((user) => (
                <li key={user._id} style={customStyles.customerItem}>
                  <span>{user.name}</span>
                  <span>{user.orderCount} הזמנות</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
            <div>
              <h2 className={styles.sectionTitle}>🔥 מוצרים חמים</h2>
              <ul style={customStyles.customerList}>
                {hotProducts.map((p, i) => (
                  <li key={i} style={customStyles.customerItem}>
                    <span style={customStyles.hotProduct}>{p.name}</span>
                    <span>{p.orders} הזמנות</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className={styles.sectionTitle}>❄️ מוצרים קרים</h2>
              <ul style={customStyles.customerList}>
                {coldProducts.map((p, i) => (
                  <li key={i} style={customStyles.customerItem}>
                    <span style={customStyles.coldProduct}>{p.name}</span>
                    <span>{p.orders} הזמנות</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
