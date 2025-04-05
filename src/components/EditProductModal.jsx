import React, { useState, useEffect } from "react";
import axios from "axios";

const EditProductModal = ({ isOpen, onClose, product, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    stock: "",
    image: "",
    category: "",
    isWeighted: false,
  });

  useEffect(() => {
    if(isOpen && productId){
      axios.get(`/api/products/${productId}`)
      .then((res) => setProduct(res.data))
      .catch((err) => console.error("Failed to fetch product", err));
    }
    
    if (product) {
      setFormData({
        name: product.name || "",
        price: product.price || "",
        stock: product.stock || "",
        description: product.description || "",
        image: product.image || "",
        category: product.category || "",
        isWeighted: product.isWeighted || false,
      });
    }
  }, [product]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.put(`http://localhost:5001/api/products/${product._id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      onUpdate(); // Refresh product list
      onClose(); // Close modal
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Failed to update product.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-lg relative">
        <h2 className="text-xl font-semibold mb-4">Edit Product</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={formData.name}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2"
          />
          <input
            type="number"
            name="price"
            placeholder="Price"
            value={formData.price}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2"
          />
          <input
            type="number"
            name="stock"
            placeholder="Stock (in KG)"
            value={formData.stock}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2"
          />
          <input
            type="text"
            name="image"
            placeholder="Image URL"
            value={formData.image}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2"
          />
          <textarea
            name="description"
            placeholder="Description"
            value={formData.description}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2"
          />
          <select name="category" value={formData.category} onChange={handleChange} className="w-full border border-gray-300 rounded p-2">
            <option value="">Select Category</option>
            <option value="Sandwiches">Sandwiches</option>
            <option value="Weighted Meat">Weighted Meat</option>
            <option value="Sides">Side Dishes</option>
            <option value="Drinks">Drinks</option>
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isWeighted" checked={formData.isWeighted} onChange={handleChange} />
            Weighted (100g pricing)
          </label>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
              Cancel
            </button>
            <button type="submit" className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;
