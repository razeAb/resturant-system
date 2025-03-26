import React, { useState } from "react";
import axios from "axios";

const AddProductModal = ({ onClose, onProductAdded }) => {
  const [form, setForm] = useState({
    name: "",
    price: "",
    stock: "",
    image: "",
    category: "",
    isWeighted: false,
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:5001/api/products", form, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      onProductAdded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add product");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-lg w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">➕ Add New Product</h2>
        {error && <p className="text-red-500 mb-2">{error}</p>}

        <input name="name" placeholder="Name" className="input" value={form.name} onChange={handleChange} required />
        <input name="price" placeholder="Price" type="number" className="input" value={form.price} onChange={handleChange} required />
        <input name="stock" placeholder="Stock in Kg" type="number" className="input" value={form.stock} onChange={handleChange} required />
        <input name="image" placeholder="Image URL or path" className="input" value={form.image} onChange={handleChange} />
        <input name="category" placeholder="Category" className="input" value={form.category} onChange={handleChange} />

        <label className="flex items-center gap-2 mt-2">
          <input type="checkbox" name="isWeighted" checked={form.isWeighted} onChange={handleChange} />
          Weighted item?
        </label>

        <div className="mt-4 flex justify-between">
          <button type="submit" className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800">
            Add
          </button>
          <button type="button" onClick={onClose} className="text-gray-500 hover:underline">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProductModal;