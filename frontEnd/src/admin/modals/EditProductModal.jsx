import React, { useState } from "react";

const EditProductModal = ({ product, onClose, onUpdate }) => {
  const [form, setForm] = useState({ ...product });
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [additions, setAdditions] = useState(product.additions || []);

  const handleAddAddition = () => {
    setAdditions((prev) => [...prev, { name: "", price: "" }]);
  };

  const handleAdditionChange = (index, field, value) => {
    setAdditions((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handleRemoveAddition = (index) => {
    setAdditions((prev) => prev.filter((_, i) => i !== index));
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
        body: JSON.stringify({
          ...form,
          additions: additions.filter((a) => a.name && a.price !== ""),
        }),
      });

      if (!res.ok) throw new Error("Failed to update product");
      const data = await res.json();
      onUpdate(data.product);
      onClose();
    } catch (err) {
      alert("❌ שגיאה בעדכון מוצר");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#2a2a2a] rounded-xl p-6 w-full max-w-md shadow-lg text-white" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-center">✏️ עריכת מוצר</h2>
        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="שם מוצר"
            required
            className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20"
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
          <div className="space-y-2 mb-2">
            <p className="font-semibold">תוספות</p>
            {additions.map((add, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  placeholder="שם"
                  value={add.name}
                  onChange={(e) => handleAdditionChange(idx, "name", e.target.value)}
                  className="flex-1 px-2 py-1 rounded bg-[#1f1f1f] border border-white/20"
                />
                <input
                  type="number"
                  placeholder="מחיר"
                  value={add.price}
                  onChange={(e) => handleAdditionChange(idx, "price", e.target.value)}
                  className="w-24 px-2 py-1 rounded bg-[#1f1f1f] border border-white/20"
                />
                <button type="button" onClick={() => handleRemoveAddition(idx)} className="bg-red-600 px-2 rounded">
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={handleAddAddition} className="bg-green-600 text-white px-2 py-1 rounded mt-1">
              ➕ הוסף תוספת
            </button>
          </div>
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
