import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar"; // For main pages with scroll

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState("");

  const styles = {
    adminDashboard: {
      minHeight: "100vh",
      padding: "5rem 2rem 3rem",
      background: "linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%)",
      fontFamily: "'Inter', -apple-system, sans-serif",
    },
    header: {
      textAlign: "center",
      marginBottom: "3rem",
    },
    title: {
      fontSize: "2.5rem",
      fontWeight: "700",
      background: "linear-gradient(90deg, #6e48aa 0%, #9d50bb 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      marginBottom: "0.5rem",
      letterSpacing: "-0.5px",
    },
    subtitle: {
      color: "#64748b",
      fontSize: "1rem",
      fontWeight: "400",
      maxWidth: "600px",
      margin: "0 auto",
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "1.5rem",
      marginBottom: "3rem",
    },
    statCard: {
      background: "white",
      borderRadius: "12px",
      padding: "1.5rem",
      boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
    },
    statValue: {
      fontSize: "2rem",
      fontWeight: "700",
      color: "#1e293b",
      margin: "0.5rem 0",
    },
    statLabel: {
      color: "#64748b",
      fontSize: "0.9rem",
      fontWeight: "500",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    },
    sectionTitle: {
      fontSize: "1.25rem",
      fontWeight: "600",
      color: "#1e293b",
      marginBottom: "1.5rem",
      paddingBottom: "0.75rem",
      borderBottom: "2px solid #f1f5f9",
    },
    productsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: "1.5rem",
      marginBottom: "3rem",
    },
    productCard: {
      background: "white",
      borderRadius: "12px",
      overflow: "hidden",
      boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
    },
    productImage: {
      width: "100%",
      height: "180px",
      objectFit: "cover",
      borderBottom: "1px solid #f1f5f9",
    },
    productContent: {
      padding: "1.25rem",
    },
    productName: {
      fontSize: "1.1rem",
      fontWeight: "600",
      color: "#1e293b",
      marginBottom: "0.5rem",
    },
    productDetails: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "1rem",
    },
    productPrice: {
      fontSize: "1rem",
      fontWeight: "700",
      color: "#6e48aa",
    },
    productStock: {
      fontSize: "0.85rem",
      color: "#64748b",
      fontWeight: "500",
    },
    productActions: {
      display: "flex",
      gap: "0.75rem",
      marginTop: "1rem",
    },
    primaryButton: {
      background: "linear-gradient(90deg, #6e48aa 0%, #9d50bb 100%)",
      color: "white",
      border: "none",
      padding: "0.75rem 1.5rem",
      borderRadius: "8px",
      fontSize: "0.95rem",
      fontWeight: "600",
      cursor: "pointer",
      boxShadow: "0 4px 15px rgba(110, 72, 170, 0.3)",
    },
    editButton: {
      background: "#3b82f6",
      color: "white",
      border: "none",
      padding: "0.5rem 1rem",
      borderRadius: "6px",
      fontSize: "0.85rem",
      fontWeight: "500",
      cursor: "pointer",
      flex: 1,
    },
    deleteButton: {
      background: "#ef4444",
      color: "white",
      border: "none",
      padding: "0.5rem 1rem",
      borderRadius: "6px",
      fontSize: "0.85rem",
      fontWeight: "500",
      cursor: "pointer",
      flex: 1,
    },
    customerList: {
      listStyle: "none",
      padding: "0",
      margin: "0",
    },
    customerItem: {
      padding: "0.75rem 0",
      borderBottom: "1px solid #f1f5f9",
      display: "flex",
      justifyContent: "space-between",
    },
    hotProduct: {
      color: "#ef4444",
      fontWeight: "500",
    },
    coldProduct: {
      color: "#3b82f6",
      fontWeight: "500",
    },
    loading: {
      textAlign: "center",
      padding: "3rem",
      color: "#64748b",
    },
    error: {
      textAlign: "center",
      padding: "3rem",
      color: "#ef4444",
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
        setError("Failed to load admin dashboard.");
      }
    };
    fetchDashboard();
  }, []);

  const handleEdit = (productId) => {
    navigate(`/edit-product/${productId}`);
  };

  const handleDelete = async (productId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5001/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDashboardData((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p._id !== productId),
      }));
    } catch (error) {
      console.error("Failed to delete product:", error);
    }
  };

  if (error) return <div style={styles.error}>{error}</div>;
  if (!dashboardData) return <div style={styles.loading}>Loading...</div>;

  const { totalRevenue, topCustomers, hotProducts, coldProducts, products } = dashboardData;

  const groupedByCategory = products.reduce((acc, product) => {
    const cat = product.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {});

  return (
    <>
      <Navbar />
      <div style={styles.adminDashboard}>
        <header style={styles.header}>
          <h1 style={styles.title}>Admin Dashboard</h1>
          <p style={styles.subtitle}>Manage your products, view analytics, and track performance</p>
        </header>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>💰 Total Revenue</span>
            <h3 style={styles.statValue}>₪{totalRevenue}</h3>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>📦 Total Products</span>
            <h3 style={styles.statValue}>{products.length}</h3>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>🔥 Hot Products</span>
            <h3 style={styles.statValue}>{hotProducts.length}</h3>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>❄️ Cold Products</span>
            <h3 style={styles.statValue}>{coldProducts.length}</h3>
          </div>
        </div>

        <div style={{ marginBottom: "3rem" }}>
          <h2 style={styles.sectionTitle}>🏆 Top Customers</h2>
          <ul style={styles.customerList}>
            {topCustomers.map((user) => (
              <li key={user._id} style={styles.customerItem}>
                <span>{user.name}</span>
                <span>{user.orderCount} orders</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "3rem" }}>
          <div>
            <h2 style={styles.sectionTitle}>🔥 Hot Products</h2>
            <ul style={styles.customerList}>
              {hotProducts.map((p, i) => (
                <li key={i} style={styles.customerItem}>
                  <span style={styles.hotProduct}>{p.name}</span>
                  <span>{p.orders} orders</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 style={styles.sectionTitle}>❄️ Cold Products</h2>
            <ul style={styles.customerList}>
              {coldProducts.map((p, i) => (
                <li key={i} style={styles.customerItem}>
                  <span style={styles.coldProduct}>{p.name}</span>
                  <span>{p.orders} orders</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <button onClick={() => navigate("/add-product")} style={styles.primaryButton}>
            ➕ Add New Product
          </button>
        </div>

        {Object.keys(groupedByCategory).map((category) => (
          <div key={category} style={{ marginBottom: "3rem" }}>
            <h2 style={styles.sectionTitle}>{category}</h2>
            <div style={styles.productsGrid}>
              {groupedByCategory[category].map((product) => (
                <div key={product._id} style={styles.productCard}>
                  <img src={product.image} alt={product.name} style={styles.productImage} />
                  <div style={styles.productContent}>
                    <h3 style={styles.productName}>{product.name}</h3>
                    <div style={styles.productDetails}>
                      <span style={styles.productPrice}>₪{product.price}</span>
                      <span style={styles.productStock}>Stock: {product.stock ?? "N/A"}</span>
                    </div>
                    <div style={styles.productActions}>
                      <button style={styles.editButton} onClick={() => handleEdit(product._id)}>
                        Edit
                      </button>
                      <button style={styles.deleteButton} onClick={() => handleDelete(product._id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default AdminDashboard;
