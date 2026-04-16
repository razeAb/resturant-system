import React, { useState, useEffect } from "react";
import api from "../../api";

const AddProductModal = ({ onClose, onAdd }) => {
  const [form, setForm] = useState({
    name: "",
    image: "",
    category: "",
    stock: "",
    price: "",
    fullSandwichPrice: "",
    extraPattyPrice: "",
    portionOptions: [],
    isActive: true,
  });

  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
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
        price: Number(opt?.price) || 0,
      }))
      .filter((opt) => (opt.label_he || opt.label_en) && opt.price > 0);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");

      const payload = {
        ...form,
        stock: Number(form.stock),
        price: Number(form.price),
        fullSandwichPrice:
          form.category === "Sandwiches" && form.fullSandwichPrice !== "" ? Number(form.fullSandwichPrice) : undefined,
        extraPattyPrice:
          form.category === "Sandwiches" && form.extraPattyPrice !== "" ? Number(form.extraPattyPrice) : undefined,
        portionOptions: canEditPortions ? sanitizePortionOptions(form.portionOptions) : undefined,
      };

      const response = await api.post(`/api/products`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      onAdd(response.data.product);
      onClose();
    } catch (err) {
      setError("Failed to add product.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async () => {
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", imageFile);

      const uploadRes = await api.post(`/api/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      const imageUrl = uploadRes.data.imageUrl;
      setForm((prev) => ({ ...prev, image: imageUrl }));

      alert("✅ Image uploaded successfully!");
    } catch (err) {
      alert("❌ Failed to upload image.");
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get(`/api/categories`, { headers: { Authorization: `Bearer ${token}` } });
        console.log("Fetched categories:", res.data); // 👈 Add this
        setCategories(res.data);
      } catch (err) {
        console.error("❌ Failed to fetch categories:", err);
      }
    };

    fetchCategories();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-[#2a2a2a] rounded-xl p-6 w-full max-w-md shadow-lg text-white overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4 text-center">➕ הוספת מוצר חדש</h2>
        {error && <div className="text-red-500 text-center mb-2">{error}</div>}

        <input
          name="name"
          placeholder="שם"
          onChange={handleChange}
          value={form.name}
          className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20 mb-3 focus:outline-none"
        />

        <label className="font-semibold">העלה תמונה:</label>
        <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="w-full mb-2" />

        {imageFile && (
          <button
            type="button"
            onClick={handleImageUpload}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full mb-3"
          >
            העלה תמונה
          </button>
        )}

        {form.image && (
          <div className="text-center mb-3">
            <img src={form.image} alt="Preview" className="w-full max-w-[300px] mx-auto rounded border border-white/10" />
          </div>
        )}

        <select
          name="category"
          onChange={handleChange}
          value={form.category}
          className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20 mb-3"
        >
          <option value="">בחר קטגוריה</option>
          {categories.map((cat) => (
            <option key={cat._id || cat.name} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>

        <input
          name="stock"
          placeholder="מלאי"
          type="number"
          onChange={handleChange}
          value={form.stock}
          className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20 mb-3"
        />

        <input
          name="price"
          placeholder="מחיר"
          type="number"
          onChange={handleChange}
          value={form.price}
          className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20 mb-3"
        />

        {form.category === "Sandwiches" && (
          <>
            <input
              name="fullSandwichPrice"
              placeholder="מחיר סנדוויץ' מלא"
              type="number"
              onChange={handleChange}
              value={form.fullSandwichPrice}
              className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20 mb-3"
            />
            <input
              name="extraPattyPrice"
              placeholder="מחיר תוספת קציצה"
              type="number"
              onChange={handleChange}
              value={form.extraPattyPrice}
              className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20 mb-3"
            />
          </>
        )}

        {canEditPortions && (
          <div className="rounded-lg border border-white/10 bg-[#1f1f1f] p-4 mb-3 space-y-3">
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
                <input
                  type="number"
                  value={opt?.price ?? ""}
                  onChange={(e) => updatePortionOption(index, "price", e.target.value)}
                  placeholder="מחיר (למשל 13)"
                  className="w-full px-3 py-2 rounded bg-[#151515] border border-white/10"
                />
              </div>
            ))}
          </div>
        )}

        <label className="flex items-center gap-2 mt-2 mb-4">
          <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
          <span className="text-sm">פעיל</span>
        </label>

        <div className="flex justify-between">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-bold w-1/2 mr-2"
          >
            {loading ? "מוסיף..." : "הוסף"}
          </button>
          <button onClick={onClose} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-bold w-1/2 ml-2">
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProductModal;
