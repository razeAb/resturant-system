import React, { useEffect, useState } from "react";
import api from "../../api";
import { motion, AnimatePresence } from "framer-motion";

const pick = (obj, keys) => keys.reduce((acc, k) => (obj[k] !== undefined ? { ...acc, [k]: obj[k] } : acc), {});

const EditProductModal = ({ product, onClose, onUpdate }) => {
  const initial = {
    name: product?.name ?? product?.title ?? "",
    title: product?.title ?? product?.name ?? "",
    price: product?.price ?? "",
    stock: product?.stock ?? "",
    image: product?.image ?? "",
    category: product?.category ?? "",
    description: product?.description ?? "",
    fullSandwichPrice: product?.fullSandwichPrice ?? "",
    extraPattyPrice: product?.extraPattyPrice ?? "",
    portionOptions: Array.isArray(product?.portionOptions)
      ? product.portionOptions.map((opt) => ({
          label_he: opt?.label_he ?? "",
          label_en: opt?.label_en ?? "",
          price: opt?.price ?? "",
        }))
      : [],
    isActive: product?.isActive ?? true,
  };

  const [form, setForm] = useState(initial);
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // מצב לאנימציית סטטוס
  const [status, setStatus] = useState(null); // { type: "success" | "error", msg: string }

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const showStatus = (type, msg, opts = {}) => {
    setStatus({ type, msg });
    const { autoClose = true, closeAfterMs = 1500 } = opts;
    if (autoClose) {
      setTimeout(() => setStatus(null), closeAfterMs);
    }
  };

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
      if (!token) throw new Error("אין הרשאה (לא נמצא טוקן). התחבר/י מחדש.");

      const formData = new FormData();
      formData.append("image", imageFile);

      const res = await api.post(`/api/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      setForm((prev) => ({ ...prev, image: res.data.imageUrl }));
      showStatus("success", "✅ התמונה הועלתה בהצלחה");
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || err.message || "שגיאה בהעלאת תמונה";
      setError(msg);
      showStatus("error", "❌ " + msg);
    } finally {
      setUploading(false);
    }
  };

  const toNumberOrUndefined = (v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const isSideDishCategory = (category) => String(category || "").toLowerCase().includes("side");
  const canEditPortions = isSideDishCategory(form.category);
  const ensurePortionRow = () => ({ label_he: "", label_en: "", price: "" });

  const updatePortionOption = (index, field, value) => {
    setForm((prev) => {
      const next = Array.isArray(prev.portionOptions) ? [...prev.portionOptions] : [];
      next[index] = { ...(next[index] || ensurePortionRow()), [field]: value };
      return { ...prev, portionOptions: next };
    });
  };

  const addPortionOption = () => {
    setForm((prev) => {
      const next = Array.isArray(prev.portionOptions) ? [...prev.portionOptions] : [];
      if (next.length >= 3) return prev;
      return { ...prev, portionOptions: [...next, ensurePortionRow()] };
    });
  };

  const removePortionOption = (index) => {
    setForm((prev) => {
      const next = Array.isArray(prev.portionOptions) ? prev.portionOptions.filter((_, i) => i !== index) : [];
      return { ...prev, portionOptions: next };
    });
  };

  const sanitizePortionOptions = (raw) => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((opt) => ({
        label_he: String(opt?.label_he || "").trim(),
        label_en: String(opt?.label_en || "").trim(),
        price: toNumberOrUndefined(opt?.price) ?? 0,
      }))
      .filter((opt) => (opt.label_he || opt.label_en) && opt.price > 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("אין הרשאה (לא נמצא טוקן). התחבר/י מחדש.");

      const payload = pick(
        {
          name: form.name?.trim(),
          title: (form.title || form.name)?.trim(),
          price: toNumberOrUndefined(form.price),
          stock: toNumberOrUndefined(form.stock),
          image: form.image?.trim(),
          category: form.category?.trim(),
          description: form.description?.trim(),
          fullSandwichPrice: form.category === "Sandwiches" ? toNumberOrUndefined(form.fullSandwichPrice) : undefined,
          extraPattyPrice: form.category === "Sandwiches" ? toNumberOrUndefined(form.extraPattyPrice) : undefined,
          portionOptions: canEditPortions ? sanitizePortionOptions(form.portionOptions) : undefined,
          isActive: !!form.isActive,
        },
        ["name", "title", "price", "stock", "image", "category", "description", "fullSandwichPrice", "extraPattyPrice", "isActive"]
      );

      if (canEditPortions) {
        payload.portionOptions = sanitizePortionOptions(form.portionOptions);
      } else {
        delete payload.portionOptions;
      }

      const response = await api.put(`/api/products/${product._id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      onUpdate?.(response.data.product);

      // מציגים אנימציית הצלחה ואז סוגרים
      showStatus("success", "נשמר בהצלחה! 🎉");
      setTimeout(() => onClose(), 700); // נותן לאנימציה רגע להופיע
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || err.message || "שגיאה בעדכון מוצר";
      setError(msg);
      showStatus("error", "❌ " + msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose} aria-modal="true" role="dialog">
      <div
        className="relative bg-[#2a2a2a] rounded-xl p-6 w-full max-w-md shadow-lg text-white max-h-[90vh] overflow-y-auto"
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

          {form.category === "Sandwiches" && (
            <>
              <label className="block text-sm">מחיר סנדוויץ' מלא</label>
              <input
                type="number"
                name="fullSandwichPrice"
                inputMode="decimal"
                value={form.fullSandwichPrice}
                onChange={handleChange}
                placeholder="מחיר סנדוויץ' מלא"
                className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20"
              />
              <label className="block text-sm">מחיר תוספת קציצה</label>
              <input
                type="number"
                name="extraPattyPrice"
                inputMode="decimal"
                value={form.extraPattyPrice}
                onChange={handleChange}
                placeholder="מחיר תוספת קציצה"
                className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20"
              />
            </>
          )}

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

          {canEditPortions && (
            <div className="rounded-lg border border-white/10 bg-[#1f1f1f] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">גדלי מנה (עד 3)</div>
                <button
                  type="button"
                  onClick={addPortionOption}
                  disabled={(form.portionOptions?.length || 0) >= 3}
                  className="px-3 py-1 rounded bg-white/10 hover:bg-white/15 disabled:opacity-40 text-sm"
                >
                  + הוסף גודל
                </button>
              </div>

              {(form.portionOptions || []).length === 0 ? <div className="text-xs text-white/60">לא הוגדרו גדלים.</div> : null}

              {(form.portionOptions || []).map((opt, index) => (
                <div key={index} className="grid grid-cols-1 gap-2 rounded-md border border-white/10 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/70">גודל #{index + 1}</div>
                    <button
                      type="button"
                      onClick={() => removePortionOption(index)}
                      className="px-2 py-1 rounded bg-red-600/20 hover:bg-red-600/30 text-xs"
                    >
                      הסר
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={opt?.label_he ?? ""}
                      onChange={(e) => updatePortionOption(index, "label_he", e.target.value)}
                      placeholder="תווית בעברית (למשל אישי)"
                      className="w-full px-3 py-2 rounded bg-[#151515] border border-white/10"
                    />
                    <input
                      type="text"
                      value={opt?.label_en ?? ""}
                      onChange={(e) => updatePortionOption(index, "label_en", e.target.value)}
                      placeholder="Label in English (optional)"
                      className="w-full px-3 py-2 rounded bg-[#151515] border border-white/10"
                    />
                  </div>

                  <input
                    type="number"
                    inputMode="decimal"
                    value={opt?.price ?? ""}
                    onChange={(e) => updatePortionOption(index, "price", e.target.value)}
                    placeholder="מחיר (למשל 13)"
                    className="w-full px-3 py-2 rounded bg-[#151515] border border-white/10"
                  />
                </div>
              ))}
            </div>
          )}

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

        {/* אנימציות הצלחה/שגיאה */}
        <AnimatePresence>
          {status && (
            <motion.div
              key="status-toast"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className={`pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-4 px-4 py-3 rounded-xl shadow-lg text-sm
                ${status.type === "success" ? "bg-green-600/90" : "bg-red-600/90"}`}
            >
              <div className="flex items-center gap-2">
                {status.type === "success" ? (
                  // אייקון וי
                  <motion.svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="text-white"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.path d="M20 6L9 17l-5-5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.svg>
                ) : (
                  // אייקון X
                  <motion.svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="text-white"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  >
                    <path d="M18 6L6 18M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" />
                  </motion.svg>
                )}
                <span className="text-white">{status.msg}</span>
              </div>
              {/* הבזק קטן להצלחה */}
              {status.type === "success" && (
                <motion.div
                  initial={{ scale: 0, opacity: 0.6 }}
                  animate={{ scale: 1.4, opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0 rounded-xl border border-white/40"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EditProductModal;
