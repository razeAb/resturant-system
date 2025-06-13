import React, { useState } from "react";

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
      onUpdate(updated);
      onClose();
    } catch (err) {
      alert("❌ שגיאה בעדכון מוצר");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center">
      <div className="bg-[#2a2a2a] rounded-xl p-6 w-full max-w-md shadow-lg text-white">
        <h2 className="text-2xl font-bold mb-4 text-center">✏️ עריכת מוצר</h2>
        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="שם מוצר"
            required
            className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20 focus:outline-none"
          />
          <input
            type="number"
            name="price"
            value={form.price}
            onChange={handleChange}
            placeholder="מחיר"
            required
            className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20"
          />
          <input
            type="number"
            name="stock"
            value={form.stock}
            onChange={handleChange}
            placeholder="מלאי"
            className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20"
          />
          <input
            type="text"
            name="image"
            value={form.image}
            onChange={handleChange}
            placeholder="קישור לתמונה"
            className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20"
          />
          <input
            type="text"
            name="category"
            value={form.category}
            onChange={handleChange}
            placeholder="קטגוריה"
            className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20"
          />

          <div className="flex justify-between pt-4">
            <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded font-bold">
              💾 שמור
            </button>
            <button type="button" onClick={onClose} className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded font-bold">
              ❌ ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;
