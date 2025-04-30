import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AddProductModal.css";

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
        "http://localhost:5001/api/products",
        {
          ...form,
          stock: Number(form.stock),
          price: Number(form.price),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      onAdd(response.data);
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

      const uploadRes = await axios.post("http://localhost:5001/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      const uploadedUrl = uploadRes.data.imageUrl;
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
        const res = await axios.get("http://localhost:5001/api/categories", {
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
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add New Product</h2>
        {error && <div className="error">{error}</div>}

        <input name="name" placeholder="Name" onChange={handleChange} value={form.name} />

        <input name="image" placeholder="Image URL" onChange={handleChange} value={form.image} />

        <label>Upload an image:</label>
        <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />

        {imageFile && (
          <button type="button" className="upload-button" onClick={handleImageUpload} style={{ marginTop: "0.5rem" }}>
            Upload Image
          </button>
        )}

        {form.image && (
          <div className="modal-preview">
            <img src={form.image} alt="Preview" />
          </div>
        )}

        <select name="category" onChange={handleChange} value={form.category}>
          <option value="">Select category</option>
          {categories.map((cat) => (
            <option key={cat._id || cat.name} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
        <input name="stock" placeholder="Stock" type="number" onChange={handleChange} value={form.stock} />
        <input name="price" placeholder="Price" type="number" onChange={handleChange} value={form.price} />

        <label style={{ marginTop: "1rem" }}>
          <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} /> Active
        </label>

        <div className="modal-buttons">
          <button onClick={handleSubmit} disabled={loading}>
            {loading ? "Adding..." : "Add"}
          </button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default AddProductModal;
