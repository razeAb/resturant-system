import React, { useState } from "react";
import "./AddProductModal.css"; // Create a simple CSS file to style it

const AddProductModal = ({ onClose, onAdd }) => {
  const [form, setForm] = useState({
    name: "",
    image: "",
    category: "",
    stock: "",
    price: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5001/api/products",
        { ...form, stock: Number(form.stock), price: Number(form.price) },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      onAdd(response.data); // add new product to state
      onClose();
    } catch (err) {
      setError("Failed to add product.");
      console.error(err);
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
        <input name="image" placeholder="Image URL" onChange={handleChange} value={form.image} />
        <label>uplaod and image:</label>
        <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
        {imageFile && (
          <button type="button" className="uplaod-Button"
          onClick={async () => {
            try{
              const token = localStorage.getItem("token");
              const formData = new FormData();
              formData.append("image", imageFile);

              const uploadRes = await.axios.post("http://localhost:5001/api/upload", formData, {
                headers:{
                  "Content-Type": "multipart/form-data",
                  Authorization: `Bearer ${token}`,
                },
              });

              const uplaodedUrl = uploadRes.data.imageUrl;
              setForm((prev) => ({ ...prev, image: uplaodedUrl})
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
      
      {form.image && (
        <div className="modal-preview">
          <img src={form.image} alt="Preview" />
        </div>
      )}            }
          }}
        )}
        {form.image && (
          <div className="modal-preview">
            <img src={form.image} alt="Preview" />
          </div>
        )}
        <input name="category" placeholder="Category" onChange={handleChange} value={form.category} />
        <input name="stock" placeholder="Stock" type="number" onChange={handleChange} value={form.stock} />
        <input name="price" placeholder="Price" type="number" onChange={handleChange} value={form.price} />

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
