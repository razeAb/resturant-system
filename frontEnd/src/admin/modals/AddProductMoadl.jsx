import React, { useState, useEffect } from "react";
import axios from "axios";

const AddProductModal = ({ onClose, onAdd }) => {
  const [form, setForm] = useState({
    name: "",
    image: "",
    category: "",
    stock: "",
    price: "",
    isActive: true,
  });

  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [additions, setAdditions] = useState([]);

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
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
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
          additions: additions.filter((a) => a.name && a.price !== ""),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

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

      const uploadRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      const uploadedFileName = uploadRes.data.imageUrl;
      const fullUrl = `${import.meta.env.VITE_API_BASE_URL}${uploadedFileName}`;
      setForm((prev) => ({ ...prev, image: fullUrl }));
      console.log("✅ Uploaded Image URL:", uploadedUrl); // 👈 Add this

      setForm((prev) => ({ ...prev, image: uploadedUrl }));
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
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/categories`, {
          headers: { Authorization: `Bearer ${token}` },
        });
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

        <input
          name="image"
          placeholder="קישור לתמונה"
          onChange={handleChange}
          value={form.image}
          className="w-full px-4 py-2 rounded bg-[#1f1f1f] border border-white/20 mb-3"
        />
        <div className="space-y-2 mb-4">
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
