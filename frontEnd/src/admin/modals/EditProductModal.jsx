import React, { useState } from "react";

const EditProductModal = ({ product, onClose, onUpdate }) => {
  const [form, setForm] = useState({
    ...product,
    vegetables: product.vegetables || [],
    additions: {
      fixed: product.additions?.fixed || [],
      grams: product.additions?.grams || [],
    },
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

          <h3 className="font-bold text-sm mb-2 mt-4">ירקות זמינים:</h3>
          {["חסה", "עגבניה", "בצל", "סלט קרוב", "מלפפון חמוץ", "צימצורי"].map((veg, i) => (
            <label key={i} className="flex items-center gap-2 mb-1">
              <input
                type="checkbox"
                checked={form.vegetables.includes(veg)}
                onChange={() => {
                  setForm((prev) => ({
                    ...prev,
                    vegetables: prev.vegetables.includes(veg) ? prev.vegetables.filter((v) => v !== veg) : [...prev.vegetables, veg],
                  }));
                }}
              />
              <span className="text-sm">{veg}</span>
            </label>
          ))}

          <h3 className="font-bold text-sm mt-4 mb-2">תוספות קבועות:</h3>
          {form.additions.fixed.map((item, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="שם תוספת (לדוג' גבינה צהובה)"
                value={item.name}
                onChange={(e) => {
                  const updated = [...form.additions.fixed];
                  updated[index].name = e.target.value;
                  setForm((prev) => ({ ...prev, additions: { ...prev.additions, fixed: updated } }));
                }}
                className="w-1/2 px-2 py-1 bg-[#1f1f1f] border border-white/20 rounded"
              />
              <input
                type="number"
                placeholder="מחיר התוספת (₪)"
                value={item.price}
                onChange={(e) => {
                  const updated = [...form.additions.fixed];
                  updated[index].price = Number(e.target.value);
                  setForm((prev) => ({ ...prev, additions: { ...prev.additions, fixed: updated } }));
                }}
                className="w-1/3 px-2 py-1 bg-[#1f1f1f] border border-white/20 rounded"
              />
              <button
                type="button"
                onClick={() => {
                  const updated = [...form.additions.fixed];
                  updated.splice(index, 1);
                  setForm((prev) => ({ ...prev, additions: { ...prev.additions, fixed: updated } }));
                }}
                className="text-red-400 font-bold"
              >
                🗑️
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                additions: { ...prev.additions, fixed: [...prev.additions.fixed, { name: "", price: 0 }] },
              }))
            }
            className="text-green-400 font-bold mt-1 mb-3"
          >
            ➕ הוסף תוספת רגילה
          </button>

          <h3 className="font-bold text-sm mt-4 mb-2">תוספות בגרמים:</h3>
          {form.additions.grams.map((item, index) => (
            <div key={index} className="flex flex-wrap gap-2 mb-2">
              <input
                type="text"
                placeholder="שם תוספת בגרמים (לדוג' צלי כתף)"
                value={item.name}
                onChange={(e) => {
                  const updated = [...form.additions.grams];
                  updated[index].name = e.target.value;
                  setForm((prev) => ({ ...prev, additions: { ...prev.additions, grams: updated } }));
                }}
                className="w-1/2 px-2 py-1 bg-[#1f1f1f] border border-white/20 rounded"
              />
              <input
                type="number"
                placeholder="מחיר ל-50 גרם (₪)"
                value={item.prices?.["50"] || 0}
                onChange={(e) => {
                  const updated = [...form.additions.grams];
                  updated[index].prices = { ...updated[index].prices, 50: Number(e.target.value) };
                  setForm((prev) => ({ ...prev, additions: { ...prev.additions, grams: updated } }));
                }}
                className="w-1/4 px-2 py-1 bg-[#1f1f1f] border border-white/20 rounded"
              />
              <input
                type="number"
                placeholder="מחיר ל-100 גרם (₪)"
                value={item.prices?.["100"] || 0}
                onChange={(e) => {
                  const updated = [...form.additions.grams];
                  updated[index].prices = { ...updated[index].prices, 100: Number(e.target.value) };
                  setForm((prev) => ({ ...prev, additions: { ...prev.additions, grams: updated } }));
                }}
                className="w-1/4 px-2 py-1 bg-[#1f1f1f] border border-white/20 rounded"
              />
              <button
                type="button"
                onClick={() => {
                  const updated = [...form.additions.grams];
                  updated.splice(index, 1);
                  setForm((prev) => ({ ...prev, additions: { ...prev.additions, grams: updated } }));
                }}
                className="text-red-400 font-bold"
              >
                🗑️
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                additions: {
                  ...prev.additions,
                  grams: [...prev.additions.grams, { name: "", prices: { 50: 0, 100: 0 } }],
                },
              }))
            }
            className="text-green-400 font-bold mt-1 mb-3"
          >
            ➕ הוסף תוספת בגרמים
          </button>

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
