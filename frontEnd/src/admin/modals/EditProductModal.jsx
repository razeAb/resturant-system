import React, { useState } from "react";

const EditProductModal = ({ product, onClose, onUpdate }) => {
  const [form, setForm] = useState({
    ...product,
    isWeighted: product.isWeighted || false,
  });

  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    setForm((prev) => {
      const updated = { ...prev, [name]: val };
      if (name === "category") {
        updated.isWeighted = value.toLowerCase().includes("meat");
      }
      return updated;
    });
  };

  const handleImageUpload = async () => {
    if (!imageFile) return;
    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", imageFile);

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      setForm((prev) => ({ ...prev, image: data.imageUrl }));
      alert("✅ תמונה הועלתה בהצלחה");
    } catch (err) {
      alert("❌ שגיאה בהעלאת תמונה");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/products/${product._id}`, {
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
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-[#2a2a2a] rounded-xl p-6 w-full max-w-md shadow-lg text-white max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4 text-center">✏️ עריכת מוצר</h2>
        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="שם המוצר (לדוג׳: סנדוויץ' אנטריקוט)"
            required
            className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20"
          />
          <input
            type="number"
            name="price"
            value={form.price}
            onChange={handleChange}
            placeholder="מחיר המוצר (₪)"
            required
            className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20"
          />
          <input
            type="number"
            name="stock"
            value={form.stock}
            onChange={handleChange}
            placeholder="כמות במלאי"
            className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20"
          />
          <input
            type="text"
            name="image"
            value={form.image}
            onChange={handleChange}
            placeholder="קישור לתמונה (אם אין העלאה)"
            className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20"
          />

          <label className="font-semibold block">או העלה תמונה חדשה:</label>
          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="w-full" />
          {imageFile && (
            <button
              type="button"
              onClick={handleImageUpload}
              disabled={uploading}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full mb-3"
            >
              {uploading ? "מעלה..." : "העלה תמונה"}
            </button>
          )}

          {form.image && (
            <div className="text-center">
              <img src={form.image} alt="Preview" className="w-full max-w-[300px] mx-auto rounded border border-white/10" />
            </div>
          )}

          <input
            type="text"
            name="category"
            value={form.category}
            onChange={handleChange}
            placeholder="שם הקטגוריה (לדוג' שתייה, תוספות)"
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
