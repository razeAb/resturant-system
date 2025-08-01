import React, { useEffect, useState } from "react";
import DishesCard from "../layouts/DishesCard";
import axios from "axios";


const categoriesList = [
  { id: "all", label: "הכל" },
  { id: "starters", label: "מנות פתיחה", filter: ["Starters"] },
  { id: "sandwiches", label: "כריכים", filter: ["Sandwiches"] },
  { id: "meats", label: "בשרים במשקל", filter: ["Meats", "premium Meat"] },
  { id: "sides", label: "תוספות בצד", filter: ["Side Dishes"] },
  { id: "drinks", label: "שתיה", filter: ["Drinks"] },
];

const Menu = () => {
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/products`);
        const normalizedProducts = response.data.products.map((product) => ({
          ...product,
          isActive: product.isActive === true,
        }));
        setProducts(normalizedProducts);
      } catch (error) {
        console.error("❌ Error loading menu:", error);
      }
    };

    fetchMenu();
  }, []);

  const renderSection = (title, categoryFilter) => {
    const filtered = products.filter((p) => categoryFilter.includes(p.category));
    if (filtered.length === 0) return null;

    return (
      <div className="mb-10">
        <h2 className="text-3xl font-semibold text-center pb-6">{title}</h2>
        <div className="flex flex-wrap gap-8 justify-center">
          {filtered.map((item) => (
            <DishesCard
              key={item._id}
              id={item._id}
              img={item.image}
              title={item.name}
              price={item.price}
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
    <div className="min-h-screen flex flex-col items-center lg:px-32 px-5">
      <h1 className="text-4xl font-semibold text-center pt-24 pb-10">התפריט שלנו</h1>

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
          {renderSection("מנות פתיחה", ["Starters"])}
          {renderSection("כריכים", ["Sandwiches"])}
          {renderSection("בשרים במשקל", ["Meats", "premium Meat"])}
          {renderSection("תוספות בצד", ["Side Dishes"])}
          {renderSection("שתיה", ["Drinks"])}
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
