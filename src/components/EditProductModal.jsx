import React, { useState } from "react";
import "./ProductModal.css"; // Reuse modal styles

const EditProductModal = ({ product, onClose, onUpdate }) => {
  const [form, setForm] = useState({ ...product });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5001/api/products/${product._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Failed to update product");
      const updated = await res.json();
      onUpdate(updated); // send updated product to parent
      onClose(); // close modal
    } catch (err) {
      alert("❌ שגיאה בעדכון מוצר");
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>✏️ עריכת מוצר</h2>
        <form onSubmit={handleSubmit}>
          <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="שם מוצר" required />
          <input type="number" name="price" value={form.price} onChange={handleChange} placeholder="מחיר" required />
          <input type="number" name="stock" value={form.stock} onChange={handleChange} placeholder="מלאי" />
          <input type="text" name="image" value={form.image} onChange={handleChange} placeholder="קישור לתמונה" />
          <input type="text" name="category" value={form.category} onChange={handleChange} placeholder="קטגוריה" />
          <div className="modal-actions">
            <button type="submit" className="save-btn">
              💾 שמור
            </button>
            <button type="button" onClick={onClose} className="cancel-btn">
              ❌ ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;
