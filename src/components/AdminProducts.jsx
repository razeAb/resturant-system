import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import SideMenu from "./SideMenu";
import AddProductModal from "./AddProductMoadl";
import styles from "./ActiveOrders.module.css"; // Shared layout
import "./AdminProducts.css"; // Custom styling
import Button from "../layouts/Button"; // Adjust path if needed
import EditProductModal from "./EditProductModal";

const AdminProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://localhost:5001/api/admin/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const normalized = response.data.products.map((p) => ({ ...p, isActive: Boolean(p.isActive) }));
        setProducts(normalized);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("שגיאה בטעינת מוצרים");
      }
    };
    fetchProducts();
  }, []);

  const handleToggleActive = async (productId, currentStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `http://localhost:5001/api/products/${productId}/toggle-active`,
        { isActive: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
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

  if (error) return <div className={styles.error}>{error}</div>;
  if (!products.length) return <div className={styles.loading}>טוען מוצרים...</div>;

  const groupedByCategory = products.reduce((acc, product) => {
    const cat = product.category || "לא מקוטלג";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {});

  return (
    <div className={styles.orderListLayout}>
      <div className={styles.sidebarContainer}>
        <SideMenu />
      </div>

      <div className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          <div className="center-btn">
            <Button title="הוסף מוצר חדש" onClick={() => setShowModal(true)} />
          </div>

          {/* Add Product Modal */}
          {showModal && !selectedProduct && (
            <AddProductModal onClose={() => setShowModal(false)} onAdd={(newProduct) => setProducts((prev) => [...prev, newProduct])} />
          )}

          {/* Edit Product Modal */}
          {selectedProduct && (
            <EditProductModal
              product={selectedProduct}
              onClose={() => setSelectedProduct(null)}
              onUpdate={(updated) => setProducts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)))}
            />
          )}
          {Object.keys(groupedByCategory).map((category) => (
            <div key={category} style={{ marginBottom: "3rem" }}>
              <h2 className={styles.sectionTitle}>{category}</h2>
              <div className="products-grid">
                {groupedByCategory[category].map((product) => (
                  <div key={product._id} className={`product-card ${!product.isActive ? "inactive-card" : ""}`}>
                    <img src={product.image} alt={product.name} className="product-image" />
                    <div className="product-content">
                      <h3 className="product-name">{product.name}</h3>

                      {!product.isActive && <span className="inactive-label">❌ לא זמין</span>}

                      <div className="product-details">
                        <span className="product-price">₪{product.price}</span>
                        <span className="product-stock">מלאי: {product.stock ?? "N/A"}</span>
                      </div>

                      <div className="product-actions">
                        <button className="edit-button" onClick={() => setSelectedProduct(product)}>
                          עריכה
                        </button>

                        <button className="delete-button" onClick={() => handleDelete(product._id)}>
                          מחיקה
                        </button>
                        <button
                          className={`toggle-button ${product.isActive ? "active" : "inactive"}`}
                          onClick={() => handleToggleActive(product._id, product.isActive)}
                        >
                          {product.isActive ? "השבתה" : "הפעלה"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminProducts;
