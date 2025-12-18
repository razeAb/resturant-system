import React, { useEffect, useState, useRef } from "react";
import SideMenu from "../layouts/SideMenu";
import api from "../api";
import { useLang } from "../context/LangContext";
import Modal from "../components/common/Modal";
import WeightModal from "../components/modals/WeightModal";
import CommentModal from "../components/modals/CommentModal";

const STORAGE_KEY = "floorLayoutTables";

const statusStyles = {
  free: { bg: "bg-slate-800/80", text: "text-white", border: "border-white/10" },
  occupied: { bg: "bg-amber-500/80", text: "text-white", border: "border-amber-500/60" },
  cleaning: { bg: "bg-slate-400/80", text: "text-white", border: "border-slate-400/80" },
};

const TableIcon = ({ shape, size = 64, label }) => {
  if (shape === "bar") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" className="mx-auto">
        <rect x="10" y="40" width="80" height="20" rx="6" fill="#c49a6c" stroke="#8b5a2b" strokeWidth="3" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={18 + i * 18} y="25" width="12" height="10" rx="2" fill="#dcdcdc" stroke="#9a9a9a" strokeWidth="2" />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <rect key={`b-${i}`} x={18 + i * 18} y="65" width="12" height="10" rx="2" fill="#dcdcdc" stroke="#9a9a9a" strokeWidth="2" />
        ))}
        {label && (
          <text x="50" y="54" textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="700" fill="#2b1a0f">
            {label}
          </text>
        )}
      </svg>
    );
  }
  if (shape === "square") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" className="mx-auto">
        <rect x="22" y="22" width="56" height="56" rx="8" fill="#c49a6c" stroke="#8b5a2b" strokeWidth="3" />
        {[{ x: 50, y: 10 }, { x: 90, y: 50 }, { x: 50, y: 90 }, { x: 10, y: 50 }].map((p, i) => (
          <rect key={i} x={p.x - 8} y={p.y - 6} width="16" height="12" rx="2" fill="#dcdcdc" stroke="#9a9a9a" strokeWidth="2" transform={`rotate(${i * 90}, ${p.x}, ${p.y})`} />
        ))}
        {label && (
          <text x="50" y="52" textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="700" fill="#2b1a0f">
            {label}
          </text>
        )}
      </svg>
    );
  }
  if (shape === "booth") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" className="mx-auto">
        <rect x="20" y="34" width="60" height="32" rx="8" fill="#c49a6c" stroke="#8b5a2b" strokeWidth="3" />
        <rect x="12" y="28" width="10" height="44" rx="4" fill="#dcdcdc" stroke="#9a9a9a" strokeWidth="2" />
        <rect x="78" y="28" width="10" height="44" rx="4" fill="#dcdcdc" stroke="#9a9a9a" strokeWidth="2" />
        {label && (
          <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="700" fill="#2b1a0f">
            {label}
          </text>
        )}
      </svg>
    );
  }
  // round
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mx-auto">
      <circle cx="50" cy="50" r="26" fill="#c49a6c" stroke="#8b5a2b" strokeWidth="3" />
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const cx = 50 + Math.cos(rad) * 38;
        const cy = 50 + Math.sin(rad) * 38;
        return <circle key={i} cx={cx} cy={cy} r="7" fill="#dcdcdc" stroke="#9a9a9a" strokeWidth="2" />;
      })}
      {label && (
        <text x="50" y="52" textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="700" fill="#2b1a0f">
          {label}
        </text>
      )}
    </svg>
  );
};

export default function FloorOrders() {
  const { t } = useLang();
  const [tables, setTables] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [guestCount, setGuestCount] = useState(2);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [modalProduct, setModalProduct] = useState(null);
  const [modalType, setModalType] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTables(JSON.parse(raw));
    } catch (e) {
      console.warn("Failed to load tables", e);
    }
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await api.get("/api/products");
        setProducts(res.data?.products || []);
      } catch (e) {
        console.warn("Failed to load products", e);
      } finally {
        setLoadingProducts(false);
      }
    };
    loadProducts();
  }, []);

  const startOrder = (table) => {
    setSelectedTable(table);
    setGuestCount(table?.seats || 2);
    setCart([]);
  };

  const addItem = (p) => {
    setCart((prev) => [...prev, { id: p._id, name: p.name, price: p.price }]);
  };

  const removeItem = (idx) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const submitOrder = () => {
    if (!selectedTable) return;
    alert(`Order for table ${selectedTable.label || ""} (${guestCount} guests): ${cart.length} items`);
    setSelectedTable(null);
    setCart([]);
  };

  const needsModal = (p) => {
    const needsModalCategory = ["Sandwiches", "Meats", "Starters"];
    return p.isOrder || p.isModal || p.isWeighted || (p.category && needsModalCategory.includes(p.category));
  };

  const openModalForProduct = (p) => {
    if (!needsModal(p)) {
      addItem(p);
      return;
    }
    let type = "modal";
    if (p.category === "Meats" || p.isWeighted) type = "weighted";
    else if (p.category === "Starters") type = "comment";
    setModalProduct(p);
    setModalType(type);
    setExpanded(p._id);
  };

  const handleModalAdd = (item) => {
    setCart((prev) => [...prev, { id: item._id || item.id, name: item.title, price: item.totalPrice || item.price }]);
    setModalProduct(null);
    setModalType(null);
    setExpanded(null);
  };

  const closeModal = () => {
    setModalProduct(null);
    setModalType(null);
    setExpanded(null);
  };

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];
  const filteredProducts =
    selectedCategory === "all" ? products.slice(0, 50) : products.filter((p) => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <div className="hidden md:block">
        <SideMenu />
      </div>
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <SideMenu onClose={() => setMenuOpen(false)} />
        </div>
      )}
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold">{t("floorOrders.title", "הזמנה לשולחן")}</h2>
            <button
              className="md:hidden inline-flex items-center px-3 py-2 rounded-lg bg-black text-white"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </button>
          </div>

          <div
            className="relative w-full rounded-2xl bg-slate-900 border border-white/10 overflow-hidden"
            style={{ minHeight: 480 }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#1f2937_1px,transparent_0)] [background-size:36px_36px] opacity-40 pointer-events-none" />
            {tables.map((t) => {
              const style = statusStyles[t.status] || statusStyles.free;
              return (
                <div
                  key={t.id}
                  className="absolute"
                  style={{ left: `${t.x}%`, top: `${t.y}%`, transform: `translate(-50%, -50%)` }}
                >
                  <button
                    className={`relative border text-center text-sm font-semibold shadow ${style.bg} ${style.text} ${style.border} rounded-2xl w-28 h-28`}
                    style={{ transform: `rotate(${t.rotation || 0}deg)` }}
                    onClick={() => startOrder(t)}
                    title={`שולחן ${t.label}`}
                  >
                    <div className="pointer-events-none mx-auto w-full h-full grid place-items-center">
                      <TableIcon shape={t.shape} size={90} label={t.label || "?"} />
                    </div>
                    <div className="text-[11px] opacity-90">{t.seats} מקומות</div>
                    <div className="text-[10px] capitalize opacity-80">{t.status}</div>
                  </button>
                </div>
              );
            })}
          </div>

          {selectedTable && (
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">
                    {t("floorOrders.table", "שולחן")} {selectedTable.label || ""}
                  </div>
                  <div className="text-sm text-slate-400">
                    {t("floorOrders.seats", "מקומות")}: {selectedTable.seats}
                  </div>
                </div>
                <button className="text-sm text-slate-300" onClick={() => setSelectedTable(null)}>
                  {t("floorOrders.close", "סגירה")}
                </button>
              </div>
              <label className="block text-sm text-slate-300">
                {t("floorOrders.guests", "מספר סועדים")}
                <input
                  type="number"
                  min="1"
                  max={selectedTable.seats || 20}
                  className="mt-1 w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 outline-none focus:border-emerald-500"
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value) || 1)}
                />
              </label>

              <div className="space-y-2">
                <div className="font-semibold text-sm">{t("floorOrders.quickMenu", "תפריט קצר")}</div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button
                      key={c}
                      className={`px-3 py-1 rounded-full text-sm border ${selectedCategory === c ? "bg-emerald-600 text-white border-emerald-600" : "bg-slate-800 text-slate-200 border-white/10"}`}
                      onClick={() => setSelectedCategory(c)}
                    >
                      {c === "all" ? t("menu.categories.all", "הכל") : t(`menu.categories.${c}`, c)}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {loadingProducts && <div className="text-sm text-slate-400">{t("floorOrders.loading", "טוען תפריט...")}</div>}
                  {!loadingProducts &&
                    filteredProducts.map((p) => {
                      const hasDetails = needsModal(p);
                      return (
                        <div key={p._id} className="rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate">
                              <div className="font-semibold truncate">{p.name}</div>
                              <div className="text-xs text-slate-300 truncate">{p.category}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-200">₪{p.price}</span>
                              <button
                                className="rounded bg-emerald-600 px-2 py-1 text-xs text-white"
                                onClick={() => {
                                  if (hasDetails) {
                                    openModalForProduct(p);
                                  } else {
                                    addItem(p);
                                  }
                                }}
                              >
                                {hasDetails ? "פתח" : "הוסף"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>פריטים בעגלה: {cart.length}</span>
                  <button className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-semibold" onClick={submitOrder} disabled={!cart.length}>
                    שליחת הזמנה
                  </button>
                </div>
                {cart.length > 0 && (
                  <ul className="space-y-1">
                    {cart.map((item, idx) => (
                      <li key={`${item.id}-${idx}`} className="flex items-center justify-between rounded border border-white/10 bg-slate-800 px-3 py-2">
                        <span className="truncate">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-200">₪{item.price}</span>
                          <button className="text-xs text-red-400 hover:text-red-200" onClick={() => removeItem(idx)}>
                            הסר
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {modalProduct && modalType === "modal" && (
        <Modal
          _id={modalProduct._id}
          img={modalProduct.image || modalProduct.img}
          title={modalProduct.name || modalProduct.title || "פריט"}
          price={modalProduct.price}
          description={modalProduct.description || ""}
          options={modalProduct.options || {}}
          isOpen={true}
          onClose={closeModal}
          onAddToCart={handleModalAdd}
        />
      )}
      {modalProduct && modalType === "weighted" && (
        <WeightModal
          _id={modalProduct._id}
          img={modalProduct.image || modalProduct.img}
          title={modalProduct.name || modalProduct.title || "פריט"}
          price={modalProduct.price}
          description={modalProduct.description || ""}
          options={modalProduct.options || {}}
          isOpen={true}
          onClose={closeModal}
          onAddToCart={handleModalAdd}
        />
      )}
      {modalProduct && modalType === "comment" && (
        <CommentModal
          _id={modalProduct._id}
          img={modalProduct.image || modalProduct.img}
          title={modalProduct.name || modalProduct.title || "פריט"}
          price={modalProduct.price}
          description={modalProduct.description || ""}
          isOpen={true}
          onClose={closeModal}
          onAddToCart={handleModalAdd}
        />
      )}
    </div>
  );
}
