import React, { useState } from "react";
import axios from "axios";

const EditCategoryModal = ({ category, onClose, onUpdate }) => {
  const [form, setForm] = useState({
    name: category.name || "",
    vegetables: category.vegetables || [],
    additions: {
      fixed: category.additions?.fixed || [],
      grams: category.additions?.grams || [],
    },
  });

  const handleVegChange = (index, value) => {
    const vegetables = [...form.vegetables];
    vegetables[index] = value;
    setForm({ ...form, vegetables });
  };

  const addVegetable = () => setForm({ ...form, vegetables: [...form.vegetables, ""] });
  const removeVegetable = (index) => setForm({ ...form, vegetables: form.vegetables.filter((_, i) => i !== index) });

  const handleFixedChange = (index, field, value) => {
    const fixed = [...form.additions.fixed];
    fixed[index] = { ...fixed[index], [field]: field === "price" ? Number(value) : value };
    setForm({ ...form, additions: { ...form.additions, fixed } });
  };
  const addFixed = () =>
    setForm({
      ...form,
      additions: { ...form.additions, fixed: [...form.additions.fixed, { name: "", price: 0 }] },
    });
  const removeFixed = (index) =>
    setForm({
      ...form,
      additions: { ...form.additions, fixed: form.additions.fixed.filter((_, i) => i !== index) },
    });

  const handleGramChange = (index, field, value) => {
    const grams = [...form.additions.grams];
    if (field === "name") {
      grams[index].name = value;
    } else {
      grams[index].prices = { ...grams[index].prices, [field]: Number(value) };
    }
    setForm({ ...form, additions: { ...form.additions, grams } });
  };
  const addGram = () =>
    setForm({
      ...form,
      additions: {
        ...form.additions,
        grams: [...form.additions.grams, { name: "", prices: { 50: 0, 100: 0 } }],
      },
    });
  const removeGram = (index) =>
    setForm({
      ...form,
      additions: { ...form.additions, grams: form.additions.grams.filter((_, i) => i !== index) },
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/categories/${category._id}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onUpdate(res.data);
      onClose();
    } catch (err) {
      console.error("Failed to update category", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-[#2a2a2a] rounded-xl p-6 w-full max-w-lg shadow-lg text-white overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4 text-center">✏️ עריכת קטגוריה</h2>
        <form onSubmit={handleSubmit} className="space-y-6 text-right" dir="rtl">
          {/* Category Name */}
          <div>
            <label className="block text-sm mb-1 font-medium">📝 שם הקטגוריה</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20"
              placeholder="לדוגמה: סנדוויצ'ים, שתייה, בשרים"
            />
          </div>

          {/* Vegetables Section */}
          <div>
            <label className="block text-sm font-semibold mb-2">🥬 ירקות זמינים לבחירה</label>
            {form.vegetables.map((veg, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={veg}
                  onChange={(e) => handleVegChange(idx, e.target.value)}
                  className="flex-1 px-3 py-1 rounded bg-[#1f1f1f] border border-white/20"
                  placeholder="שם הירק (לדוגמה: עגבנייה)"
                />
                <button type="button" onClick={() => removeVegetable(idx)} className="text-red-500">
                  ✖
                </button>
              </div>
            ))}
            <button type="button" onClick={addVegetable} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">
              ➕ הוסף ירק
            </button>
          </div>

          {/* Fixed Additions */}
          <div>
            <label className="block text-sm font-semibold mb-2">🧀 תוספות בתשלום קבוע</label>
            {form.additions.fixed.map((add, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={add.name}
                  onChange={(e) => handleFixedChange(idx, "name", e.target.value)}
                  className="flex-1 px-3 py-1 rounded bg-[#1f1f1f] border border-white/20"
                  placeholder="שם תוספת (לדוגמה: גבינה)"
                />
                <input
                  type="number"
                  value={add.price}
                  onChange={(e) => handleFixedChange(idx, "price", e.target.value)}
                  className="w-24 px-3 py-1 rounded bg-[#1f1f1f] border border-white/20"
                  placeholder="₪ מחיר"
                />
                <button type="button" onClick={() => removeFixed(idx)} className="text-red-500">
                  ✖
                </button>
              </div>
            ))}
            <button type="button" onClick={addFixed} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">
              ➕ הוסף תוספת קבועה
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">🥩 תוספות לפי גרמים</label>
            {form.additions.grams.map((add, idx) => (
              <div key={idx} className="border border-white/10 rounded-lg p-3 mb-4 space-y-2 bg-[#1f1f1f]">
                {/* Name */}
                <div>
                  <label className="text-sm mb-1 block">שם תוספת (לדוגמה: צלי כתף)</label>
                  <input
                    type="text"
                    value={add.name}
                    onChange={(e) => handleGramChange(idx, "name", e.target.value)}
                    className="w-full px-3 py-1 rounded bg-[#2a2a2a] border border-white/20"
                    placeholder="שם תוספת"
                  />
                </div>

                {/* 50g Price */}
                <div>
                  <label className="text-sm mb-1 block">מחיר ל־50 גרם</label>
                  <input
                    type="number"
                    value={add.prices[50]}
                    onChange={(e) => handleGramChange(idx, 50, e.target.value)}
                    className="w-full px-3 py-1 rounded bg-[#2a2a2a] border border-white/20"
                    placeholder="₪"
                  />
                </div>

                {/* 100g Price */}
                <div>
                  <label className="text-sm mb-1 block">מחיר ל־100 גרם</label>
                  <input
                    type="number"
                    value={add.prices[100]}
                    onChange={(e) => handleGramChange(idx, 100, e.target.value)}
                    className="w-full px-3 py-1 rounded bg-[#2a2a2a] border border-white/20"
                    placeholder="₪"
                  />
                </div>

                {/* Delete button */}
                <button type="button" onClick={() => removeGram(idx)} className="text-red-500 text-sm mt-1">
                  ✖ הסר תוספת זו
                </button>
              </div>
            ))}

            <button type="button" onClick={addGram} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">
              ➕ הוסף בשר לפי גרמים
            </button>
          </div>

          {/* Submit + Cancel */}
          <div className="flex justify-between pt-4">
            <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded font-bold">
              💾 שמור שינויים
            </button>
            <button type="button" onClick={onClose} className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded font-bold">
              ❌ ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCategoryModal;
