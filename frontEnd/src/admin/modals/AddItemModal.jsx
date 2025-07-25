import React, { useState, useEffect } from "react";
import axios from "axios";

const AddItemModal = ({ orderId, onClose, onItemAdded }) => {
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(`/api/products`);
        setProducts(res.data.products || []);
      } catch (err) {
        console.error("Failed to fetch products", err);
      }
    };
    fetchProducts();
  }, []);

  const categoryTranslations = {
    Sandwiches: "סנדוויצ'ים",
    Drinks: "שתייה",
    "Side Dishes": "תוספות",
    Starters: "מנות פתיחה",
    Meats: "בשר במשקל",
  };

  const categories = [...new Set(products.map((p) => p.category))];
  const filteredProducts = selectedCategory ? products.filter((p) => p.category === selectedCategory) : products;

  const selectedProductObj = products.find((p) => p._id === selectedProduct);
  const isMeat = selectedProductObj?.category === "Meats";

  const handleAdd = async () => {
    const product = selectedProductObj;
    if (!product) return;

    const item = {
      product: product._id,
      title: product.name,
      price: product.price,
      quantity: quantity,
      isWeighted: isMeat, // optional: in case you need to flag it as a gram item
    };

    // 💡 If meat price is per 100 grams, use the following instead:
    // const addedPrice = isMeat ? (product.price / 100) * quantity : product.price * quantity;

    const addedPrice = isMeat
      ? (product.price * quantity) / 100 // every 100 grams = 1 unit
      : product.price * quantity;
    try {
      await axios.post(`api/orders/${orderId}/add-item`, {
        item,
        addedPrice,
      });
      onItemAdded();
      onClose();
    } catch (err) {
      console.error("Failed to add item", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1f1f1f] p-6 rounded text-white w-96">
        <h2 className="text-xl font-bold mb-4 text-center">הוסף פריט להזמנה</h2>

        {/* Category Dropdown */}
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setSelectedProduct("");
          }}
          className="w-full px-3 py-2 rounded bg-[#1f1f1f] border border-white/20 mb-3"
        >
          <option value="">כל הקטגוריות</option>
          {categories.map((cat, idx) => (
            <option key={idx} value={cat}>
              {categoryTranslations[cat] || cat}
            </option>
          ))}
        </select>

        {/* Product Dropdown */}
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="w-full px-3 py-2 rounded bg-[#1f1f1f] border border-white/20 mb-3"
        >
          <option value="">בחר פריט</option>
          {filteredProducts.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name} - ₪{p.price}
            </option>
          ))}
        </select>

        {/* Quantity or Gram Input */}
        <div className="mb-3">
          <label className="block mb-1 text-sm font-semibold">{isMeat ? "משקל בגרמים" : "כמות"}</label>
          <div className="relative">
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 pr-12 rounded bg-[#1f1f1f] border border-white/20"
              placeholder={isMeat ? "לדוגמה: 300" : "לדוגמה: 1"}
            />
            {isMeat && <span className="absolute inset-y-0 right-3 flex items-center text-white text-sm">גרם</span>}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-between">
          <button onClick={handleAdd} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded w-1/2 mr-2">
            הוסף
          </button>
          <button onClick={onClose} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded w-1/2 ml-2">
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddItemModal;
