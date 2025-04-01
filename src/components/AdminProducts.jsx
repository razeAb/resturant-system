import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import SideMenu from "./SideMenu";
import "./AdminProducts.css";

const AdminProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://localhost:5001/api/admin/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("Raw product data from API:", response.data.products);
        const normalized = response.data.products.map((p) => ({ ...p, isActive: Boolean(p.isActive) }));
        setProducts(normalized);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("Failed to load products.");
      }
    };
    fetchProducts();
  }, []);

  const handleToggleActive = async (productId, currentStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `http://localHost:5001/api/products/${productId}/toggle-active`,
        { isActive: !currentStatus },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setProducts((prev) => prev.map((p) => (p._id === productId ? { ...p, isActive: !currentStatus } : p)));
    } catch (error) {
      console.error("Failed to toggle product status:", error);
    }
  };

  const handleEdit = (productId) => {
    navigate(`/edit-product/${productId}`);
  };

  const handleDelete = async (productId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5001/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts((prev) => prev.filter((p) => p._id !== productId));
    } catch (error) {
      console.error("Failed to delete product:", error);
    }
  };

  if (error) return <div className="error">{error}</div>;
  if (!products.length) return <div className="loading">Loading...</div>;

  const groupedByCategory = products.reduce((acc, product) => {
    const cat = product.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {});

  return (
    <>
      <SideMenu />
      <div className="admin-dashboard">
        <div className="center-btn">
          <button onClick={() => navigate("/add-product")} className="primary-button">
            ➕ Add New Product
          </button>
        </div>

        {Object.keys(groupedByCategory).map((category) => (
          <div key={category} style={{ marginBottom: "3rem" }}>
            <h2 className="section-title">{category}</h2>
            <div className="products-grid">
              {groupedByCategory[category].map((product) => {
                return (
                  <div
                    key={product._id}
                    className={`product-card ${!product.isActive ? "inactive-card" : ""}`} // ✅ gray out inactive
                  >
                    <img src={product.image} alt={product.name} className="product-image" />
                    <div className="product-content">
                      <h3 className="product-name">{product.name}</h3>

                      {/* ✅ Show unavailable label if product is not active */}
                      {!product.isActive && <span className="inactive-label">❌ Unavailable</span>}

                      <div className="product-details">
                        <span className="product-price">₪{product.price}</span>
                        <span className="product-stock">Stock: {product.stock ?? "N/A"}</span>
                      </div>

                      <div className="product-actions">
                        <button className="edit-button" onClick={() => handleEdit(product._id)}>
                          Edit
                        </button>
                        <button className="delete-button" onClick={() => handleDelete(product._id)}>
                          Delete
                        </button>
                        <button
                          className={`toggle-button ${product.isActive ? "active" : "inactive"}`}
                          onClick={() => handleToggleActive(product._id, product.isActive)}
                        >
                          {product.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default AdminProducts;
