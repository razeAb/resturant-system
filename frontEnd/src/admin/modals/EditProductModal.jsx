import React, { useEffect, useState } from "react";
import api from "../../api";

const pick = (obj, keys) => keys.reduce((acc, k) => (obj[k] !== undefined ? { ...acc, [k]: obj[k] } : acc), {});

const EditProductModal = ({ product, onClose, onUpdate }) => {
  // תמיכה גם ב-name וגם ב-title כדי להתאים לסכמות שונות
  const initial = {
    name: product?.name ?? product?.title ?? "",
    title: product?.title ?? product?.name ?? "",
    price: product?.price ?? "",
    stock: product?.stock ?? "",
    image: product?.image ?? "",
    category: product?.category ?? "",
    description: product?.description ?? "",
    isActive: product?.isActive ?? true,
  };

  const [form, setForm] = useState(initial);
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleImageUpload = async () => {
    if (!imageFile) return;
    setUploading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("אין הרשאה (לא נמצא טוקן). התחבר מחדש.");

      const formData = new FormData();
      formData.append("image", imageFile);

      const res = await api.post(`/api/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      setForm((prev) => ({ ...prev, image: res.data.imageUrl }));
      alert("✅ תמונה הועלתה בהצלחה");
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || err.message || "שגיאה בהעלאת תמונה");
      alert("❌ שגיאה בהעלאת תמונה");
    } finally {
      setUploading(false);
    }
  };

  const toNumberOrUndefined = (v) => {
    if (v === "" || v === null || v === undefined) return undefined; // אל תהפוך ל-0 בטעות
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("אין הרשאה (לא נמצא טוקן). התחבר מחדש.");

      // whitelist של שדות שמותר לעדכן
      const payload = pick(
        {
          // שימור תאימות: גם name וגם title מעודכנים לאותה ערך
          name: form.name?.trim(),
          title: (form.title || form.name)?.trim(),
          price: toNumberOrUndefined(form.price),
          stock: toNumberOrUndefined(form.stock),
          image: form.image?.trim(),
          category: form.category?.trim(),
          description: form.description?.trim(),
          isActive: !!form.isActive,
        },
        ["name", "title", "price", "stock", "image", "category", "description", "isActive"]
      );

      const response = await api.put(`/api/products/${product._id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      onUpdate?.(response.data.product);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || err.message || "שגיאה בעדכון מוצר");
      alert("❌ שגיאה בעדכון מוצר");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose} aria-modal="true" role="dialog">
      <div
        className="bg-[#2a2a2a] rounded-xl p-6 w-full max-w-md shadow-lg text-white max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <h2 className="text-2xl font-bold mb-4 text-center">✏️ עריכת מוצר</h2>

        {error && <div className="mb-4 text-red-300 text-sm bg-red-900/30 border border-red-700/50 rounded p-2">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <label className="block text-sm">שם מוצר</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="שם מוצר"
            required
            className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20"
          />

          <label className="block text-sm">מחיר</label>
          <input
            type="number"
            name="price"
            inputMode="decimal"
            value={form.price}
            onChange={handleChange}
            placeholder="מחיר"
            required
            className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20"
          />

          <label className="block text-sm">מלאי (אופציונלי)</label>
          <input
            type="number"
            name="stock"
            inputMode="numeric"
            value={form.stock}
            onChange={handleChange}
            placeholder="מלאי"
            className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20"
          />

          <label className="block text-sm">קישור לתמונה</label>
          <input
            type="url"
            name="image"
            value={form.image}
            onChange={handleChange}
            placeholder="https://..."
            className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20"
          />

          <label className="font-semibold block mt-2">או העלה תמונה חדשה:</label>
          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="w-full" />
          {imageFile && (
            <button
              type="button"
              onClick={handleImageUpload}
              disabled={uploading}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold py-2 px-4 rounded w-full mb-3"
            >
              {uploading ? "מעלה..." : "העלה תמונה"}
            </button>
          )}

          {form.image ? (
            <div className="text-center">
              <img src={form.image} alt="Preview" className="w-full max-w-[300px] mx-auto rounded border border-white/10" />
            </div>
          ) : null}

          <label className="block text-sm">קטגוריה</label>
          <input
            type="text"
            name="category"
            value={form.category}
            onChange={handleChange}
            placeholder="קטגוריה"
            className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20"
          />

          <label className="block text-sm">תיאור (אופציונלי)</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="תיאור למנה / מוצר"
            className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20 min-h-[80px]"
          />

          <label className="flex items-center gap-2 pt-1">
            <input type="checkbox" name="isActive" checked={!!form.isActive} onChange={handleChange} className="accent-green-500" />
            פעיל להצגה בתפריט
          </label>

          <div className="flex justify-between pt-4 gap-2">
            <button
              type="submit"
              disabled={uploading || saving}
              className="bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white px-5 py-2 rounded font-bold"
            >
              {saving ? "שומר..." : "💾 שמור"}
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
