import React, { useEffect, useState } from "react";
import { FaSearch, FaEdit, FaTrash, FaToggleOn, FaToggleOff } from "react-icons/fa";
import AdminLayout from "../layouts/AdminLayout";
import api from "../api";
import SideMenu from "../layouts/SideMenu";
import AddProductModal from "./modals/AddProductMoadl";
import EditProductModal from "./modals/EditProductModal";

const ITEMS_PER_PAGE = 8;

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("הצג הכל");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await api.get(`/api/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const normalized = response.data.products.map((p) => ({
          ...p,
          isActive: Boolean(p.isActive),
        }));
        setProducts(normalized);
        setOrders(response.data.orders || []);
      } catch (err) {
        console.error("שגיאה בטעינת מוצרים:", err);
        setError("שגיאה בטעינת מוצרים");
      }
    };
    fetchProducts();
  }, []);

  const handleToggleActive = async (productId, currentStatus) => {
    try {
      const token = localStorage.getItem("token");
      await api.patch(
        `/api/products/${productId}/toggle-active`,
        { isActive: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProducts((prev) => prev.map((p) => (p._id === productId ? { ...p, isActive: !currentStatus } : p)));
    } catch (error) {
      console.error("שגיאה בשינוי סטטוס מוצר:", error);
    }
  };

  const handleDelete = async (productId) => {
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts((prev) => prev.filter((p) => p._id !== productId));
    } catch (error) {
      console.error("שגיאה במחיקת מוצר:", error);
    }
  };

  if (error) return <div className="text-center text-red-400 py-10">{error}</div>;

  const groupedByCategory = products.reduce((acc, product) => {
    const cat = product.category || "לא מקוטלג";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {});

  const filteredProducts = Object.entries(groupedByCategory)
    .filter(([category]) => selectedCategory === "הצג הכל" || category === selectedCategory)
    .flatMap(([_, items]) => items);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const displayedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const colors = ["#3daef9", "#f95050", "#facc15", "#9e6bff", "#40f99b", "#ff9f40"];

  return (
    <div className="min-h-screen bg-[#0f1015] text-white font-[Inter] flex flex-col lg:flex-row-reverse" dir="rtl">
      <div className="w-full lg:w-[260px] bg-[#0c0d12]">
        <SideMenu />
      </div>

      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
        {/* Topbar */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-6 gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold">מוצרים</h1>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                placeholder="חפש כאן"
                className="w-full bg-[#1a1c24] text-white text-sm pl-10 pr-4 py-2 rounded-lg placeholder-[#7d808a]"
              />
              <FaSearch className="absolute left-3 top-2.5 text-[#7d808a]" />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#1a1c24] text-white text-sm px-4 py-2 rounded-lg border border-[#2c2f3a]"
            >
              <option value="הצג הכל">הצג הכל</option>
              {Object.keys(groupedByCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setSelectedProduct(null);
                setShowModal(true);
              }}
              className="bg-[#40f99b] text-black font-semibold px-4 py-2 rounded-lg"
            >
              + מנה חדשה
            </button>
          </div>
        </div>

        {/* Modals */}
        {showModal && !selectedProduct && (
          <AddProductModal onClose={() => setShowModal(false)} onAdd={(newProduct) => setProducts((prev) => [...prev, newProduct])} />
        )}

        {selectedProduct && (
          <EditProductModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onUpdate={(updated) => setProducts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)))}
          />
        )}

        {/* Products Grid */}
        {displayedProducts.length === 0 ? (
          <p className="text-center text-[#7d808a]">לא נמצאו מוצרים</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayedProducts.map((product) => (
              <div
                key={product._id}
                className={`bg-[#1a1c24] rounded-xl p-4 flex flex-col items-center text-center ${!product.isActive ? "opacity-60" : ""}`}
              >
                <img src={product.image} alt={product.name} className="rounded-full w-24 h-24 object-cover mb-3" />
                <h3 className="font-semibold text-sm mb-1">{product.name}</h3>
                <p className="text-xs text-[#7d808a] mb-1">{product.category || "לא מקוטלג"}</p>
                <p className="text-xs text-[#7d808a] mb-3">
                  ₪{product.price} | מלאי: {product.stock ?? "אין"}
                </p>
                <div className="flex flex-wrap justify-center gap-2 text-xs">
                  <button
                    onClick={() => setSelectedProduct(product)}
                    className="flex items-center gap-1 bg-[#20222c] text-[#3daef9] px-2 py-1 rounded"
                  >
                    <FaEdit /> ערוך
                  </button>
                  <button
                    onClick={() => handleDelete(product._id)}
                    className="flex items-center gap-1 bg-[#20222c] text-[#f95050] px-2 py-1 rounded"
                  >
                    <FaTrash /> מחק
                  </button>
                  <button
                    onClick={() => handleToggleActive(product._id, product.isActive)}
                    className="flex items-center gap-1 bg-[#20222c] text-[#9e6bff] px-2 py-1 rounded"
                  >
                    {product.isActive ? <FaToggleOff /> : <FaToggleOn />}
                    {product.isActive ? "השבת" : "הפעל"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Category Donut Statistics */}
        <div className="bg-[#1a1c24] rounded-xl p-6 mt-10">
          <h2 className="text-white font-semibold mb-4">השוואת קטגוריות</h2>
          <div className="flex flex-wrap justify-center gap-8">
            {Object.entries(groupedByCategory).map(([category, items], idx) => {
              const categoryCount = items.reduce((acc, item) => {
                const orderQty = orders.flatMap((o) => o.items).filter((i) => i.product === item._id);
                const totalQty = orderQty.reduce((sum, i) => sum + (i.quantity || 1), 0);
                return acc + totalQty;
              }, 0);
              const totalOrdered = orders.flatMap((o) => o.items).reduce((sum, item) => sum + (item.quantity || 1), 0);
              const percent = totalOrdered ? Math.round((categoryCount / totalOrdered) * 100) : 0;

              return (
                <div key={category} className="text-center">
                  <div
                    className="w-[120px] h-[120px] sm:w-[160px] sm:h-[160px] bg-[#0f1015] rounded-full flex items-center justify-center text-2xl font-semibold text-white border-[20px] sm:border-[24px] border-[#0f1015]"
                    style={{ borderTopColor: colors[idx % colors.length] }}
                  >
                    {percent}%
                  </div>
                  <p className="text-sm text-white mt-2">{category}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6 flex-wrap">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1 rounded ${currentPage === i + 1 ? "bg-[#40f99b] text-black font-bold" : "bg-[#1a1c24] text-white"}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminProducts;
