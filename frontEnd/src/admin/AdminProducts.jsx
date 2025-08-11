import React, { useEffect, useState, useMemo } from "react";
import api from "../api";
import SideMenu from "../layouts/SideMenu";
import AddProductModal from "./modals/AddProductMoadl"; // keep your original filename
import EditProductModal from "./modals/EditProductModal";
import Button from "../components/common/Button";
import { Menu, Pencil, Trash2, Power } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Tooltip } from "recharts";

/** Small section wrapper like on other pages */
function SectionCard({ title, children, extra }) {
  return (
    <section className="bg-[#111824] border border-[#1f2a36] rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-[16px] font-bold truncate">{title}</h3>
        {extra}
      </div>
      {children}
    </section>
  );
}

/** Center label for donut */
function CenterLabel({ viewBox, value }) {
  const { cx, cy } = viewBox || {};
  return (
    <g>
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="fill-white" style={{ fontSize: 18, fontWeight: 800 }}>
        {value}%
      </text>
    </g>
  );
}

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  // ---- filter/search state
  const [activeCategory, setActiveCategory] = useState("הכל");
  const [query, setQuery] = useState("");

  // ---- stats
  const [categoryStats, setCategoryStats] = useState([]); // [{name, count}]

  /** fetch products + stats */
  useEffect(() => {
    const fetchAll = async () => {
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

      // Stats (global percentages by category – current month)
      try {
        setStatsLoading(true);
        const token = localStorage.getItem("token");
        const statsRes = await api.get(`/api/admin/category-stats?period=month`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const raw = statsRes?.data;
        let list = [];
        if (Array.isArray(raw)) {
          list = raw; // [{name,count}]
        } else if (Array.isArray(raw?.categories)) {
          list = raw.categories;
        } else if (raw && typeof raw === "object") {
          list = Object.entries(raw)
            .filter(([, v]) => typeof v === "number")
            .map(([name, count]) => ({ name, count }));
        }

        // Fallback to local aggregation if API missing
        if (!list?.length) {
          const byCat = {};
          for (const p of normalized) {
            const cat = p.category || "לא מקוטלג";
            const c = Number(p.orderCount ?? p.timesOrdered ?? p.totalOrders ?? 0);
            byCat[cat] = (byCat[cat] || 0) + (isFinite(c) ? c : 0);
          }
          list = Object.entries(byCat).map(([name, count]) => ({ name, count }));
        }

        setCategoryStats(list);
      } catch (e) {
        console.warn("טעינת סטטיסטיקות נכשלה, מעבר לחישוב מקומי…", e);
        const byCat = {};
        for (const p of products) {
          const cat = p.category || "לא מקוטלג";
          const c = Number(p.orderCount ?? p.timesOrdered ?? p.totalOrders ?? 0);
          byCat[cat] = (byCat[cat] || 0) + (isFinite(c) ? c : 0);
        }
        const list = Object.entries(byCat).map(([name, count]) => ({ name, count }));
        setCategoryStats(list);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** derived: categories list */
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category || "לא מקוטלג"));
    return ["הכל", ...Array.from(set)];
  }, [products]);

  /** derived: search + category filtered list */
  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const cat = p.category || "לא מקוטלג";
      const matchCategory = activeCategory === "הכל" || cat === activeCategory;
      const matchQuery = !q || (p.name || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
      return matchCategory && matchQuery;
    });
  }, [products, activeCategory, query]);

  /** derived: grouped (AFTER filter/search) */
  const groupedByCategory = useMemo(() => {
    return visibleProducts.reduce((acc, product) => {
      const cat = product.category || "לא מקוטלג";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(product);
      return acc;
    }, {});
  }, [visibleProducts]);

  /** derived: GLOBAL donut data (does NOT follow filter) */
  const donutData = useMemo(() => {
    const total = categoryStats.reduce((s, i) => s + (Number(i.count) || 0), 0);
    if (!total) return [];
    const top = [...categoryStats]
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 6)
      .map((i) => {
        const pct = Math.round(((Number(i.count) || 0) / total) * 100);
        return { name: i.name, value: Number(i.count) || 0, pct };
      });
    return top;
  }, [categoryStats]);

  /** actions */
  const handleToggleActive = async (productId, currentStatus) => {
    try {
      const token = localStorage.getItem("token");
      await api.patch(
        `/api/products/${productId}/toggle-active`,
        { isActive: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProducts((prev) => prev.map((p) => (p._id === productId ? { ...p, isActive: !currentStatus } : p)));
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

  /** top-level states */
  if (loading) {
    return <div className="min-h-screen bg-[#0f141c] text-[#aab2c4] grid place-items-center px-4">טוען מוצרים…</div>;
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
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
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
          {/* Filters */}
          <div className="mt-6">
            <SectionCard
              title="סינון מוצרים"
              extra={
                <div className="w-full sm:w-64">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="חיפוש לפי שם/תיאור…"
                    className="w-full bg-[#0f141c] border border-[#1f2a36] text-sm rounded-lg px-3 py-2 outline-none focus:border-white/30"
                  />
                </div>
              }
            >
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const isActive = activeCategory === cat;
                  const count =
                    cat === "הכל" ? visibleProducts.length : visibleProducts.filter((p) => (p.category || "לא מקוטלג") === cat).length;

                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition
                        ${
                          isActive
                            ? "bg-emerald-600 text-white border-emerald-500"
                            : "bg-[#0f141c] text-white/80 border-[#1f2a36] hover:border-white/20"
                        }`}
                      title={cat}
                    >
                      {cat} <span className="text-white/60">({count})</span>
                    </button>
                  );
                })}
              </div>
            </SectionCard>
          </div>

          {/* Products */}
          {Object.keys(groupedByCategory).length === 0 ? (
            <SectionCard title="מוצרים">
              <div className="text-[#8b93a7] text-sm py-6 text-center">לא נמצאו מוצרים בהתאם לסינון.</div>
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
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full grid place-items-center text-white/30 text-sm">אין תמונה</div>
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
                              <h3 className="text-sm font-semibold leading-tight line-clamp-2">{product.name}</h3>
                              <span className="text-emerald-300 text-sm shrink-0">₪{product.price}</span>
                            </div>
                            <div className="text-[12px] text-white/50">מלאי: {product.stock ?? "אין"}</div>

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
                                  product.isActive ? "bg-amber-500/90 hover:bg-amber-500" : "bg-emerald-600/90 hover:bg-emerald-600"
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

          {/* ===== Menu Comparison (GLOBAL donuts) ===== */}
          <div className="mt-6">
            <SectionCard
              title="השוואת תפריט (אחוז הזמנות לפי קטגוריה – החודש)"
              extra={<span className="text-xs text-white/50">{statsLoading ? "טוען…" : "נתונים גלובליים"}</span>}
            >
              {!donutData.length && !statsLoading ? (
                <div className="text-[#8b93a7] text-sm py-6 text-center">אין נתונים להצגה.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {donutData.map((d) => (
                    <div key={d.name} className="bg-[#0f141c] border border-[#1f2a36] rounded-xl p-4 flex flex-col items-center">
                      <div className="w-full h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: d.name, value: d.value },
                                { name: "Other", value: Math.max(1, 100 - d.pct) }, // dummy remainder
                              ]}
                              dataKey="value"
                              innerRadius="65%"
                              outerRadius="90%"
                              stroke="none"
                              label={<CenterLabel value={d.pct} />}
                              isAnimationActive
                            />
                            <Tooltip
                              formatter={(val, name) => (name === d.name ? [`${d.value}`, d.name] : null)}
                              contentStyle={{
                                background: "#0f141c",
                                border: "1px solid #1f2a36",
                                borderRadius: 8,
                              }}
                              itemStyle={{ color: "#fff" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-2 text-sm font-semibold">{d.name}</div>
                      <div className="text-xs text-white/50">({d.pct}% מכלל ההזמנות)</div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
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
