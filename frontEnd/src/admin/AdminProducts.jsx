import React, { useEffect, useState } from "react";
import api from "../api";
import SideMenu from "../layouts/SideMenu";
import AddProductModal from "./modals/AddProductMoadl"; // keep your original filename
import EditProductModal from "./modals/EditProductModal";
import Button from "../components/common/Button";
import { Menu, Pencil, Trash2, Power } from "lucide-react";

/** Small section wrapper like on other pages */
function SectionCard({ title, children }) {
  return (
    <section className="bg-[#111824] border border-[#1f2a36] rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-[16px] font-bold truncate">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  /** fetch */
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await api.get(`/api/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const normalized = (res.data?.products ?? []).map((p) => ({
          ...p,
          isActive: Boolean(p.isActive),
        }));
        setProducts(normalized);
        setError("");
      } catch (err) {
        console.error("שגיאה בטעינת מוצרים:", err);
        setError("שגיאה בטעינת מוצרים");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  /** actions */
  const handleToggleActive = async (productId, currentStatus) => {
    try {
      const token = localStorage.getItem("token");
      await api.patch(
        `/api/products/${productId}/toggle-active`,
        { isActive: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProducts((prev) =>
        prev.map((p) => (p._id === productId ? { ...p, isActive: !currentStatus } : p))
      );
    } catch (err) {
      console.error("שגיאה בשינוי סטטוס מוצר:", err);
      alert("לא ניתן לעדכן את סטטוס המוצר.");
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm("למחוק את המוצר?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts((prev) => prev.filter((p) => p._id !== productId));
    } catch (err) {
      console.error("שגיאה במחיקת מוצר:", err);
      alert("מחיקה נכשלה.");
    }
  };

  /** derived */
  const groupedByCategory = products.reduce((acc, product) => {
    const cat = product.category || "לא מקוטלג";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {});

  /** top-level states */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f141c] text-[#aab2c4] grid place-items-center px-4">
        טוען מוצרים…
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-[#0f141c] text-white grid place-items-center px-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button title="רענן" onClick={() => window.location.reload()} />
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#0f141c] text-white flex">
      {/* Sidebar (desktop) */}
      <div className="hidden md:block">
        <SideMenu logoSrc="/developerTag.jpeg" brand="Hungry" />
      </div>

      {/* Mobile overlay + drawer */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      {isSidebarOpen && (
        <div className="md:hidden">
          <SideMenu onClose={() => setIsSidebarOpen(false)} logoSrc="/developerTag.jpeg" brand="Hungry" />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-[#11131a] border-b border-white/10">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <button
              className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="פתח תפריט"
            >
              <Menu size={20} />
            </button>

            <div className="min-w-0">
              <h1 className="text-[18px] font-bold tracking-tight truncate">מוצרים</h1>
              <p className="text-[11px] text-[#8b93a7] mt-1">ניהול המוצרים בחנות</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                title="הוסף מוצר חדש"
                onClick={() => {
                  setSelectedProduct(null);
                  setShowModal(true);
                }}
              />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="px-4 sm:px-6 pb-10">
          {products.length === 0 ? (
            <SectionCard title="מוצרים">
              <div className="text-[#8b93a7] text-sm py-6 text-center">אין מוצרים להצגה.</div>
            </SectionCard>
          ) : (
            Object.keys(groupedByCategory).map((category) => (
              <div key={category} className="mt-6">
                <SectionCard title={category}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {groupedByCategory[category].map((product) => {
                      const inactive = !product.isActive;
                      return (
                        <div
                          key={product._id}
                          className={`bg-[#0f141c] border border-[#1f2a36] rounded-xl overflow-hidden hover:border-white/20 transition`}
                        >
                          {/* image */}
                          <div className="relative h-40 bg-[#0d1219]">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full grid place-items-center text-white/30 text-sm">
                                אין תמונה
                              </div>
                            )}
                            {inactive && (
                              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] grid place-items-center text-[12px]">
                                ❌ לא זמין
                              </div>
                            )}
                          </div>

                          {/* body */}
                          <div className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="text-sm font-semibold leading-tight line-clamp-2">
                                {product.name}
                              </h3>
                              <span className="text-emerald-300 text-sm shrink-0">₪{product.price}</span>
                            </div>
                            <div className="text-[12px] text-white/50">
                              מלאי: {product.stock ?? "אין"}
                            </div>

                            {/* actions */}
                            <div className="grid grid-cols-3 gap-2 pt-1">
                              <button
                                onClick={() => setSelectedProduct(product)}
                                className="flex items-center justify-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-2 py-2 text-[12px]"
                                title="ערוך מוצר"
                              >
                                <Pencil size={14} />
                                ערוך
                              </button>
                              <button
                                onClick={() => handleDelete(product._id)}
                                className="flex items-center justify-center gap-1 bg-rose-600/90 hover:bg-rose-600 rounded-lg px-2 py-2 text-[12px]"
                                title="מחק מוצר"
                              >
                                <Trash2 size={14} />
                                מחק
                              </button>
                              <button
                                onClick={() => handleToggleActive(product._id, product.isActive)}
                                className={`flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-[12px] ${
                                  product.isActive
                                    ? "bg-amber-500/90 hover:bg-amber-500"
                                    : "bg-emerald-600/90 hover:bg-emerald-600"
                                }`}
                                title={product.isActive ? "השבת מוצר" : "הפעל מוצר"}
                              >
                                <Power size={14} />
                                {product.isActive ? "השבת" : "הפעל"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              </div>
            ))
          )}
        </main>
      </div>

      {/* Modals */}
      {showModal && !selectedProduct && (
        <AddProductModal
          onClose={() => setShowModal(false)}
          onAdd={(newProduct) => {
            setProducts((prev) => [...prev, { ...newProduct, isActive: Boolean(newProduct.isActive) }]);
            setShowModal(false);
          }}
        />
      )}

      {selectedProduct && (
        <EditProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onUpdate={(updated) => {
            setProducts((prev) => prev.map((p) => (p._id === updated._id ? { ...updated, isActive: Boolean(updated.isActive) } : p)));
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
}
