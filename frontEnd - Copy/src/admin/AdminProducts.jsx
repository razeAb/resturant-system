import React, { useEffect, useState, useMemo } from "react";
import api from "../api";
import SideMenu from "../layouts/SideMenu";
import AddProductModal from "./modals/AddProductMoadl"; // keep your original filename
import EditProductModal from "./modals/EditProductModal";
import Button from "../components/common/Button";
import { Menu, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { useLang } from "../context/LangContext";
import { ResponsiveContainer, PieChart, Pie, Tooltip, Label } from "recharts";

/** Spinner (ring) */
function Spinner({ size = 40 }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-white/20 border-t-white/80"
      style={{ width: size, height: size }}
      aria-label="Loading"
    />
  );
}

/** Full-page loading screen */
function LoadingScreen({ label = "טוען…" }) {
  return (
    <div className="min-h-screen bg-[#0f141c] text-[#aab2c4] grid place-items-center px-4">
      <div className="flex flex-col items-center gap-3">
        <Spinner size={48} />
        <div className="text-sm text-white/70">{label}</div>
      </div>
    </div>
  );
}

/** מעטפת מקטע */
function SectionCard({ title, children, extra }) {
  return (
    <section className="bg-[#111824] border border-[#1f2a36] rounded-2xl p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-[15px] sm:text-[16px] font-semibold tracking-tight">{title}</h3>
        {extra}
      </div>
      {children}
    </section>
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

  // ---- סינון/חיפוש
  const [activeCategory, setActiveCategory] = useState("הכל");
  const [query, setQuery] = useState("");

  // ---- סטטיסטיקות
  const [categoryStats, setCategoryStats] = useState([]); // [{name, count}]
  const { lang } = useLang();
  const resolveName = (p) => (lang === "en" ? p?.name_en ?? p?.name : p?.name_he ?? p?.name);

  /** טעינת מוצרים + סטטיסטיקות */
  useEffect(() => {
    const fetchAll = async () => {
      let normalized = [];
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await api.get(`/api/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        normalized = (res.data?.products ?? []).map((p) => ({
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

      // סטטיסטיקות (סכום פריטים מוזמנים לפי קטגוריה – החודש)
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

        // נפילה לחישוב מקומי אם ה‑API לא מחזיר כלום
        if (!list?.length) {
          const byCat = {};
          for (const p of normalized) {
            const cat = p.category || "לא מקוטלג";
            const c = Number(p.orderCount ?? p.timesOrdered ?? p.totalOrders ?? 0);
            byCat[cat] = (byCat[cat] || 0) + (isFinite(c) ? c : 0);
          }
          list = Object.entries(byCat).map(([name, count]) => ({ name, count }));
        }

        // להבטיח שכל הקטגוריות יופיעו (גם אם 0)
        const allCats = new Set(normalized.map((p) => p.category || "לא מקוטלג"));
        list = Array.from(allCats).map((name) => {
          const found = (list || []).find((x) => x.name === name);
          return { name, count: found ? Number(found.count) || 0 : 0 };
        });

        setCategoryStats(list);
      } catch (e) {
        console.warn("טעינת סטטיסטיקות נכשלה, מעבר לחישוב מקומי…", e);
        const byCat = {};
        const source = normalized.length ? normalized : products;
        for (const p of source) {
          const cat = p.category || "לא מקוטלג";
          const c = Number(p.orderCount ?? p.timesOrdered ?? p.totalOrders ?? 0);
          byCat[cat] = (byCat[cat] || 0) + (isFinite(c) ? c : 0);
        }
        let list = Object.entries(byCat).map(([name, count]) => ({ name, count }));

        // להבטיח שכל הקטגוריות יופיעו (גם אם 0)
        const allCats = new Set((normalized.length ? normalized : products).map((p) => p.category || "לא מקוטלג"));
        list = Array.from(allCats).map((name) => {
          const found = (list || []).find((x) => x.name === name);
          return { name, count: found ? Number(found.count) || 0 : 0 };
        });

        setCategoryStats(list);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** קטגוריות למסננים */
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category || "לא מקוטלג"));
    return ["הכל", ...Array.from(set)];
  }, [products]);

  /** חיפוש בלבד */
  const searchFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (!q) return true;
      const nameText = `${p.name_en || ""} ${p.name_he || ""} ${p.name || ""}`.toLowerCase();
      const descText = `${p.description_en || ""} ${p.description_he || ""} ${p.description || ""}`.toLowerCase();
      return nameText.includes(q) || descText.includes(q);
    });
  }, [products, query]);

  /** חיפוש + קטגוריה */
  const visibleProducts = useMemo(() => {
    return searchFiltered.filter((p) => {
      const cat = p.category || "לא מקוטלג";
      return activeCategory === "הכל" || cat === activeCategory;
    });
  }, [searchFiltered, activeCategory]);

  /** קיבוץ לתצוגה */
  const groupedByCategory = useMemo(() => {
    return visibleProducts.reduce((acc, product) => {
      const cat = product.category || "לא מקוטלג";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(product);
      return acc;
    }, {});
  }, [visibleProducts]);

  /** דאטה לדונאט (גלובלי) */
  const donutData = useMemo(() => {
    const total = categoryStats.reduce((s, i) => s + (Number(i.count) || 0), 0);
    const ordered = [...categoryStats].sort((a, b) => {
      const ca = Number(a.count) || 0;
      const cb = Number(b.count) || 0;
      if (cb !== ca) return cb - ca;
      return String(a.name).localeCompare(String(b.name));
    });

    if (total === 0) {
      return ordered.map((i) => ({ name: i.name, value: 0, pct: 0, total: 0 }));
    }
    return ordered.map((i) => {
      const value = Number(i.count) || 0;
      const pct = Math.round((value / total) * 100);
      return { name: i.name, value, pct, total };
    });
  }, [categoryStats]);

  /** פעולות על מוצר */
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

  /** מצבים עליונים */
  if (loading) {
    return <LoadingScreen label="טוען מוצרים…" />;
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

  // צבע לסגמנט מודגש + צבע לשאר הטבעת
  const COLORS = ["#22c3e6", "#ef476f", "#f7c948", "#10b981", "#a78bfa", "#fb923c", "#60a5fa"];
  const REST = "rgba(255,255,255,0.08)";

  return (
    <div dir="rtl" className="min-h-screen bg-[#0f141c] text-white flex">
      {/* תפריט צד לשולחן עבודה */}
      <div className="hidden md:block">
        <SideMenu logoSrc="/developerTag.jpeg" brand="Hungry" />
      </div>

      {/* חפיפה + מגירה בנייד */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      {isSidebarOpen && (
        <div className="md:hidden">
          <SideMenu onClose={() => setIsSidebarOpen(false)} logoSrc="/developerTag.jpeg" brand="Hungry" />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* סרגל עליון */}
        <header className="sticky top-0 z-20 bg-[#11131a] border-b border-white/10">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <button className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 transition" onClick={() => setIsSidebarOpen(true)} aria-label="פתח תפריט">
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

        {/* תוכן */}
        <main className="px-4 sm:px-6 pb-10">
          {/* מסננים */}
          <div className="mt-6">
            <SectionCard title="סינון מוצרים">
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const isActive = activeCategory === cat;
                  const count =
                    cat === "הכל" ? searchFiltered.length : searchFiltered.filter((p) => (p.category || "לא מקוטלג") === cat).length;

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

          {/* מוצרים */}
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
                        <div key={product._id} className={`bg-[#0f141c] border border-[#1f2a36] rounded-xl overflow-hidden hover:border-white/20 transition`}>
                          {/* תמונה */}
                          <div className="relative h-40 bg-[#0d1219]">
                            {product.image ? (
                              <img src={product.image} alt={resolveName(product)} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full grid place-items-center text-white/30 text-sm">אין תמונה</div>
                            )}
                            {inactive && <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] grid place-items-center text-[12px]">❌ לא זמין</div>}
                          </div>

                          {/* גוף הכרטיס */}
                          <div className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="text-sm font-semibold leading-tight line-clamp-2">{resolveName(product)}</h3>
                              <span className="text-emerald-300 text-sm shrink-0">₪{product.price}</span>
                            </div>
                            <div className="text-[12px] text-white/50">מלאי: {product.stock ?? "אין"}</div>

                            {/* פעולות */}
                            <div className="grid grid-cols-3 gap-2 pt-1">
                              <button onClick={() => setSelectedProduct(product)} className="flex items-center justify-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-2 py-2 text-[12px]" title="ערוך מוצר">
                                <Pencil size={14} />
                                ערוך
                              </button>
                              <button onClick={() => handleDelete(product._id)} className="flex items-center justify-center gap-1 bg-rose-600/90 hover:bg-rose-600 rounded-lg px-2 py-2 text-[12px]" title="מחק מוצר">
                                <Trash2 size={14} />
                                מחק
                              </button>
                              <button
                                onClick={() => handleToggleActive(product._id, product.isActive)}
                                className={`flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-[12px] ${product.isActive ? "bg-amber-500/90 hover:bg-amber-500" : "bg-emerald-600/90 hover:bg-emerald-600"}`}
                                title={product.isActive ? "הסתר מהתפריט" : "הצג בתפריט"}
                              >
                                {product.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                                {product.isActive ? "הסתר" : "הצג"}
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

          {/* ===== השוואת תפריט (דונאט גלובלי) ===== */}
          <div className="mt-6">
            <SectionCard title="השוואת תפריט">
              {/* תיאור קצר של המטרה */}
              <p className="text-xs text-white/60 mb-4">
                כל טבעת מציגה את <strong className="text-white/80">אחוז הפריטים שהוזמנו</strong> בקטגוריה מתוך כלל הפריטים שהוזמנו החודש.
                הנתון מבוסס על <em className="text-white/70">כמות פריטים</em> (לא על הכנסות).
              </p>

              {statsLoading ? (
                <div className="py-10 flex items-center justify-center">
                  <Spinner size={40} />
                </div>
              ) : !donutData.length ? (
                <div className="text-[#8b93a7] text-sm py-6 text-center">אין נתונים להצגה.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                  {donutData.map((d, idx) => {
                    const color = COLORS[idx % COLORS.length];
                    const restValue = d.total === 0 ? 1 : Math.max(0, d.total - d.value); // להשאיר טבעת גם כש‑total=0

                    return (
                      <div key={d.name} className="bg-[#111824] border border-[#1f2a36] rounded-2xl p-5 flex flex-col items-center">
                        <div className="w-full" style={{ height: 220 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: d.name, value: d.value, fill: color },
                                  { name: "שאר", value: restValue, fill: REST },
                                ]}
                                dataKey="value"
                                innerRadius="65%"
                                outerRadius="90%"
                                stroke="none"
                                labelLine={false}
                              >
                                <Label
                                  content={({ viewBox }) => {
                                    const { cx, cy } = viewBox || {};
                                    return (
                                      <text
                                        x={cx}
                                        y={cy}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill="#fff"
                                        style={{ fontSize: 20, fontWeight: 800 }}
                                      >
                                        {`${d.pct}%`}
                                      </text>
                                    );
                                  }}
                                />
                              </Pie>

                              <Tooltip
                                formatter={(val, name) => {
                                  if (name === d.name) {
                                    const pct = d.total ? Math.round((d.value / d.total) * 100) : 0;
                                    return [`${val} פריטים (${pct}%)`, d.name];
                                  }
                                  const rest = d.total ? d.total - d.value : 0;
                                  const pct = d.total ? Math.round((rest / d.total) * 100) : 0;
                                  return [`${rest} פריטים (${pct}%)`, "שאר"];
                                }}
                                contentStyle={{ background: "#0f141c", border: "1px solid #1f2a36", borderRadius: 8 }}
                                itemStyle={{ color: "#fff" }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-3 text-sm sm:text-base font-semibold text-white/90 text-center">{d.name}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>
        </main>
      </div>

      {/* מודלים */}
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
