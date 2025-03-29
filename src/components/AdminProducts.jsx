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
        setProducts(response.data.products); // Only use products from dashboard
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("Failed to load products.");
      }
    };
    fetchProducts();
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
                console.log("Image path:", product.image); // ✅ debugging output

                return (
                  <div key={product._id} className="product-card">
                    <img src={product.image} alt={product.name} className="product-image" />
                    <div className="product-content">
                      <h3 className="product-name">{product.name}</h3>
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
                          class={`toggle-button ${product.isActive ? "active" : "inactive"}`}
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
