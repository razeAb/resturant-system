import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import SideMenu from "../layouts/SideMenu";
import AddProductModal from "./modals/AddProductMoadl";
import EditProductModal from "./modals/EditProductModal";
import Button from "../components/common/Button";

const AdminProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await api.get(`/api/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
        const normalized = response.data.products.map((p) => ({ ...p, isActive: Boolean(p.isActive) }));
        setProducts(normalized);
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
      await api.delete(`/api/products/${productId}`, { headers: { Authorization: `Bearer ${token}` } });
      setProducts((prev) => prev.filter((p) => p._id !== productId));
    } catch (error) {
      console.error("שגיאה במחיקת מוצר:", error);
    }
  };

  if (error) return <div className="text-center text-red-400 py-10">{error}</div>;
  if (!products.length) return <div className="text-center text-slate-400 py-10">טוען מוצרים...</div>;

  const groupedByCategory = products.reduce((acc, product) => {
    const cat = product.category || "לא מקוטלג";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {});

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#2a2a2a] text-white relative">
      <button onClick={() => setIsSidebarOpen(true)} className="md:hidden bg-[#2c2c2e] text-white px-4 py-3">
        ☰ תפריט
      </button>

      <aside className="w-60 bg-[#2c2c2e] hidden md:block">
        <SideMenu />
      </aside>

      <div
        className={`fixed top-0 left-0 h-full w-64 bg-[#2c2c2e] z-50 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:hidden`}
      >
        <div className="flex justify-end p-4">
          <button onClick={() => setIsSidebarOpen(false)} className="text-white text-lg">
            ❌
          </button>
        </div>
        <SideMenu />
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <main className="flex-1 p-5 overflow-x-auto text-right" dir="rtl">
        <div className="text-center mb-6 flex flex-wrap justify-center gap-4">
          <Button
            title="הוסף מוצר חדש"
            onClick={() => {
              setSelectedProduct(null);
              setShowModal(true);
            }}
          />
        </div>

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

        {Object.keys(groupedByCategory).map((category) => (
          <div key={category} className="mb-12">
            <h2 className="text-xl font-bold border-b border-white/20 pb-2 mb-4">{category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {groupedByCategory[category].map((product) => (
                <div key={product._id} className={`bg-[#1f1f1f] rounded-xl shadow p-4 space-y-3 ${!product.isActive ? "opacity-60" : ""}`}>
                  <img src={product.image} alt={product.name} className="w-full h-40 object-cover rounded-lg" />
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">{product.name}</h3>
                    {!product.isActive && <p className="text-red-400 text-sm">❌ לא זמין</p>}
                    <div className="flex justify-between text-sm text-white/80">
                      <span>₪{product.price}</span>
                      <span>מלאי: {product.stock ?? "אין"}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <button onClick={() => setSelectedProduct(product)} className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded">
                      ערוך מוצר
                    </button>
                    <button onClick={() => handleDelete(product._id)} className="bg-red-500 hover:bg-red-600 text-white py-2 rounded">
                      מחק מוצר
                    </button>
                    <button
                      onClick={() => handleToggleActive(product._id, product.isActive)}
                      className={`py-2 rounded ${
                        product.isActive ? "bg-yellow-500 hover:bg-yellow-600" : "bg-green-500 hover:bg-green-600"
                      } text-white`}
                    >
                      {product.isActive ? "השבת מוצר" : "הפעל מוצר"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default AdminProducts;
