import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DishesCard from "../layouts/DishesCard";
import api from "../api";
import { useLang } from "../context/LangContext";
import { Beef, CupSoda, LayoutGrid, Salad, Sandwich, Soup } from "lucide-react";

const Menu = () => {
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { t, dir, lang } = useLang();

  const resolveName = (item) => (lang === "en" ? item.name_en ?? item.name : item.name ?? item.name_he);
  const resolveDescription = (item) => (lang === "en" ? item.description_en ?? item.description : item.description_he ?? item.description);

  const weightedCategories = ["Meats", "premium Meat", "Weighted Meat"];
  const categoriesList = [
    { id: "all", label: t("menu.categories.all", "הכל"), icon: LayoutGrid, accent: "bg-[#f59e0b]/15 text-[#f59e0b]" },
    { id: "starters", label: t("menu.categories.starters", "מנות פתיחה"), filter: ["Starters"], icon: Soup, accent: "bg-[#38bdf8]/15 text-[#38bdf8]" },
    { id: "sandwiches", label: t("menu.categories.sandwiches", "כריכים"), filter: ["Sandwiches"], icon: Sandwich, accent: "bg-[#f97316]/15 text-[#f97316]" },
    { id: "meats", label: t("menu.categories.meats", "בשרים במשקל"), filter: weightedCategories, icon: Beef, accent: "bg-[#ef4444]/15 text-[#ef4444]" },
    { id: "sides", label: t("menu.categories.sides", "תוספות בצד"), filter: ["Side Dishes"], icon: Salad, accent: "bg-[#22c55e]/15 text-[#22c55e]" },
    { id: "drinks", label: t("menu.categories.drinks", "שתיה"), filter: ["Drinks"], icon: CupSoda, accent: "bg-[#a78bfa]/15 text-[#a78bfa]" },
  ];

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await api.get("/api/products");
        const normalizedProducts = (response.data?.products || []).map((product) => ({
          ...product,
          isActive: product.isActive === true,
        }));
        setProducts(normalizedProducts);
      } catch (error) {
        console.error("❌ Error loading menu:", error);
        setProducts([]);
      }
    };

    fetchMenu();
  }, []);

  const renderSection = (title, categoryFilter) => {
    const filtered = products.filter((p) => categoryFilter.includes(p.category) && p.isActive);
    if (filtered.length === 0) return null;

    return (
      <div className="mb-10">
        <h2 className="text-3xl font-semibold text-center pb-6">{title}</h2>
        <div className="grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:gap-8 sm:justify-center w-full">
          {filtered.map((item) => (
            <DishesCard
              key={item._id}
              id={item._id}
              img={item.image}
              title={resolveName(item)}
              name_en={item.name_en}
              name_he={item.name}
              price={item.price}
              fullSandwichPrice={item.fullSandwichPrice}
              extraPattyPrice={item.extraPattyPrice}
              description={resolveDescription(item)}
              description_en={item.description_en}
              description_he={item.description_he}
              category={item.category}
              isWeighted={item.isWeighted}
              isActive={item.isActive}
              isOrder={item.isOrder}
              toggleOptions
              modalType={weightedCategories.includes(item.category) ? "weighted" : undefined}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center lg:px-32 px-5" dir={dir}>
      <h1 className="text-4xl font-semibold text-center pt-24 pb-10">{t("menu.heading", "התפריט שלנו")}</h1>

      <div className="w-full max-w-5xl mb-10">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-l from-[#1f1f1f] via-[#2a2a2a] to-[#111] p-5 sm:p-6 text-white shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">{t("menu.promo.title", "הצטרף וקבל הנחות")}</h2>
              <p className="text-sm text-white/70 mt-1">
                {t("menu.promo.subtitle", "פתח חשבון וקבל מבצעים וקופונים בלעדיים להזמנות הבאות")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/register" className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition">
                {t("menu.promo.cta", "הרשמה")}
              </Link>
              <Link to="/login" className="px-4 py-2 rounded-xl border border-white/30 text-white/90 hover:bg-white/10 transition">
                {t("menu.promo.secondary", "יש לי כבר חשבון")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ CATEGORY FILTER BUTTONS */}
      <div className="w-full overflow-x-auto mb-10 category-scroll">
        <div className="flex gap-3 justify-start px-2 md:justify-center min-w-max">
          {categoriesList.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              aria-pressed={selectedCategory === cat.id}
              className={`group whitespace-nowrap font-bold py-2 px-4 rounded-2xl border transition duration-200 ${
                selectedCategory === cat.id
                  ? "bg-gradient-to-br from-[#2b2b2b] via-[#1b1b1b] to-[#0f0f0f] text-white scale-[1.02] border-white/30 shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
                  : "bg-[#121212]/90 text-white/90 border-white/10 hover:border-white/30 hover:bg-[#1a1a1a] hover:scale-[1.02] shadow-[0_8px_20px_rgba(0,0,0,0.3)]"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className={`grid place-items-center w-9 h-9 rounded-xl ${cat.accent}`}>
                  <cat.icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <span className="text-sm sm:text-base">{cat.label}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ✅ RENDER SECTIONS */}
      {selectedCategory === "all" ? (
        <>
          {renderSection(t("menu.sections.starters", "מנות פתיחה"), ["Starters"])}
          {renderSection(t("menu.sections.sandwiches", "כריכים"), ["Sandwiches"])}
          {renderSection(t("menu.sections.meats", "בשרים במשקל"), weightedCategories)}
          {renderSection(t("menu.sections.sides", "תוספות בצד"), ["Side Dishes"])}
          {renderSection(t("menu.sections.drinks", "שתיה"), ["Drinks"])}
        </>
      ) : (
        (() => {
          const selected = categoriesList.find((c) => c.id === selectedCategory);
          if (!selected?.filter) return null;
          return renderSection(selected.label, selected.filter);
        })()
      )}
    </div>
  );
};

export default Menu;
