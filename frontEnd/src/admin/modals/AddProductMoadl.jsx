import React, { useState, useEffect } from "react";
import axios from "axios";

const AddProductModal = ({ onClose, onAdd }) => {
  const [form, setForm] = useState({
    name: "",
    image: "",
    category: "",
    stock: "",
    price: "",
    displayOrder: "",

    isActive: true,
    isWeighted: false,
  });

  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    setForm((prev) => {
      const updated = { ...prev, [name]: val };
      if (name === "category") {
        const cat = categories.find((c) => c.name === value);
        updated.isWeighted = cat ? cat.isWeighted : false;
      }
      return updated;
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/products`,
        {
          ...form,
          stock: Number(form.stock),
          price: Number(form.price),
          displayOrder: Number(form.displayOrder),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      onAdd(response.data);
      onClose();
    } catch (err) {
      setError("❌ שגיאה בהוספת מוצר.");
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

      const uploadRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      const cloudinaryUrl = uploadRes.data.imageUrl;
      setForm((prev) => ({ ...prev, image: cloudinaryUrl }));

      alert("✅ תמונה הועלתה בהצלחה");
    } catch (err) {
      alert("❌ שגיאה בהעלאת תמונה.");
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/categories`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCategories(res.data);
      } catch (err) {
        console.error("❌ שגיאה בקבלת קטגוריות:", err);
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
          placeholder="שם מוצר"
          value={form.name}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20 mb-3"
        />

        <label className="font-semibold">העלה תמונה:</label>
        <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="w-full mb-2" />
        {imageFile && (
          <button
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
          value={form.category}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20 mb-3"
        >
          <option value="">בחר קטגוריה</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>

        <input
          name="stock"
          placeholder="מלאי"
          type="number"
          value={form.stock}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20 mb-3"
        />
        <input
          name="price"
          placeholder="מחיר"
          type="number"
          value={form.price}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20 mb-3"
        />

        <input
          name="displayOrder"
          placeholder="סדר הצגה"
          type="number"
          value={form.displayOrder}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20 mb-3"
        />

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
