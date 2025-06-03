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
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-2xl p-6 w-full max-w-xl shadow-2xl border border-white/10 text-white">
        <h2 className="text-xl md:text-2xl font-semibold mb-6 text-center">✏️ עריכת מוצר</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 text-right">
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="שם מוצר"
            required
            className="bg-neutral-800 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            type="number"
            name="price"
            value={form.price}
            onChange={handleChange}
            placeholder="מחיר"
            required
            className="bg-neutral-800 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            type="number"
            name="stock"
            value={form.stock}
            onChange={handleChange}
            placeholder="מלאי"
            className="bg-neutral-800 border border-white/10 rounded-xl px-4 py-3 focus:outline-none"
          />
          <input
            type="text"
            name="image"
            value={form.image}
            onChange={handleChange}
            placeholder="קישור לתמונה"
            className="bg-neutral-800 border border-white/10 rounded-xl px-4 py-3 focus:outline-none"
          />
          <input
            type="text"
            name="category"
            value={form.category}
            onChange={handleChange}
            placeholder="קטגוריה"
            className="bg-neutral-800 border border-white/10 rounded-xl px-4 py-3 focus:outline-none"
          />

          <div className="flex justify-between pt-4 gap-4">
            <button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700 transition text-white px-4 py-3 rounded-xl font-semibold shadow-md"
            >
              💾 שמור
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-red-600 hover:bg-red-700 transition text-white px-4 py-3 rounded-xl font-semibold shadow-md"
            >
              ❌ ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;
