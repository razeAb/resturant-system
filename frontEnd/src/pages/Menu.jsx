import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DishesCard from "../layouts/DishesCard";
import api from "../api";
import { useLang } from "../context/LangContext";

const Menu = () => {
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { t, dir, lang } = useLang();

  const resolveName = (item) => (lang === "en" ? item.name_en ?? item.name : item.name_he ?? item.name);
  const resolveDescription = (item) => (lang === "en" ? item.description_en ?? item.description : item.description_he ?? item.description);

  const categoriesList = [
    { id: "all", label: t("menu.categories.all", "הכל") },
    { id: "starters", label: t("menu.categories.starters", "מנות פתיחה"), filter: ["Starters"] },
    { id: "sandwiches", label: t("menu.categories.sandwiches", "כריכים"), filter: ["Sandwiches"] },
    { id: "meats", label: t("menu.categories.meats", "בשרים במשקל"), filter: ["Meats", "premium Meat"] },
    { id: "sides", label: t("menu.categories.sides", "תוספות בצד"), filter: ["Side Dishes"] },
    { id: "drinks", label: t("menu.categories.drinks", "שתיה"), filter: ["Drinks"] },
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
              name_he={item.name_he}
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
              modalType={item.category === "Meat" ? "weighted" : undefined}
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
      <div className="w-full overflow-x-auto mb-10">
        <div className="flex gap-3 justify-start px-2 md:justify-center min-w-max">
          {categoriesList.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap font-bold py-2 px-5 rounded-xl shadow-md transition transform duration-200 ${
                selectedCategory === cat.id
                  ? "bg-gradient-to-br from-[#666] to-[#2b2b2b] text-white scale-105"
                  : "bg-gradient-to-br from-[#444] to-[#1f1f1f] text-white hover:scale-105 hover:from-[#666] hover:to-[#2b2b2b]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ✅ RENDER SECTIONS */}
      {selectedCategory === "all" ? (
        <>
          {renderSection(t("menu.sections.starters", "מנות פתיחה"), ["Starters"])}
          {renderSection(t("menu.sections.sandwiches", "כריכים"), ["Sandwiches"])}
          {renderSection(t("menu.sections.meats", "בשרים במשקל"), ["Meats", "premium Meat"])}
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
