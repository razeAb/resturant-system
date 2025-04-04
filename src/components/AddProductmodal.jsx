import React, { useState } from "react";
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
      let imageUrl = form.image;

      // ⬆️ Upload image file if selected
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);

        const uploadRes = await axios.post("http://localhost:5001/api/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        });

        imageUrl = uploadRes.data.imageUrl;
      }

      const response = await axios.post(
        "http://localhost:5001/api/products",
        {
          ...form,
          image: imageUrl,
          stock: Number(form.stock),
          price: Number(form.price),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      onAdd(response.data); // update products in state
      onClose(); // close modal
    } catch (err) {
      console.error("Error adding product:", err);
      setError("Failed to add product.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add New Product</h2>
        {error && <div className="error">{error}</div>}

        <input name="name" placeholder="Name" onChange={handleChange} value={form.name} />
        <input name="category" placeholder="Category" onChange={handleChange} value={form.category} />
        <input name="stock" type="number" placeholder="Stock" onChange={handleChange} value={form.stock} />
        <input name="price" type="number" placeholder="Price (₪)" onChange={handleChange} value={form.price} />

        {/* Image Upload Section */}
        <label>Upload Product Image:</label>
        <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />

        {imageFile && (
          <button
            type="button"
            onClick={async () => {
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
                setForm((prev) => ({ ...prev, image: uploadedUrl }));
                alert("✅ Image uploaded successfully!");
              } catch (err) {
                alert("❌ Failed to upload image.");
                console.error(err);
              }
            }}
            style={{ marginTop: "0.5rem" }}
          >
            Upload Image
          </button>
        )}

        {/* Show preview only if uploaded */}
        {form.image && (
          <div style={{ marginTop: "1rem" }}>
            <strong>Image Preview:</strong>
            <br />
            <img
              src={form.image}
              alt="Uploaded Preview"
              style={{ width: "100%", maxWidth: "200px", borderRadius: "8px", marginTop: "0.5rem" }}
            />
          </div>
        )}
        <label>
          <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
          Active
        </label>

        <div className="modal-buttons">
          <button onClick={handleSubmit} disabled={loading}>
            {loading ? "Adding..." : "Add Product"}
          </button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default AddProductModal;
