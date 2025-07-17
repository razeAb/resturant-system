import React, { useEffect, useState } from "react";
import DishesCard from "../layouts/DishesCard";
import CountableDishesCard from "../layouts/CountableDishesCard";
import axios from "axios";

const Menu = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/products`);
        const normalizedProducts = response.data.products.map((product) => ({
          ...product,
          isActive: product.isActive === true,
        }));
        setProducts(normalizedProducts); // assuming your backend returns { products: [...] }
      } catch (error) {
        console.error("❌ Error loading menu:", error);
      }
    };

    fetchMenu();
  }, []);

  const renderSection = (title, categories, isWeighted = false) => {
    const filtered = products.filter((p) => (Array.isArray(categories) ? categories.includes(p.category) : p.category === categories));
    if (filtered.length === 0) return null;

    return (
      <>
        <h1 className="text-4xl font-semibold text-center pb-10">{title}</h1>
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
        <br />
        <br />
      </>
    );
  };
  return (
    <div className="min-h-screen flex flex-col items-center lg:px-32 px-5">
      <h1 className="text-4xl font-semibold text-center pt-24 pb-10">תפריט שלנו</h1>

      {/* ✅ CATEGORY NAVIGATION BAR */}
      <div className="w-full overflow-x-auto mb-10">
        <div className="flex gap-3 justify-start px-2 md:justify-center min-w-max">
          {[
            { id: "starters", label: "מנות פתיחה" },
            { id: "sandwiches", label: "כריכים" },
            { id: "meats", label: "בשרים במשקל" },
            { id: "sides", label: "תוספות בצד" },
            { id: "drinks", label: "שתיה" },
          ].map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="whitespace-nowrap bg-gradient-to-br from-[#444] to-[#1f1f1f] text-white font-bold py-2 px-5 rounded-xl shadow-md hover:scale-105 transition transform duration-200 hover:from-[#666] hover:to-[#2b2b2b]"
            >
              {section.label}
            </a>
          ))}
        </div>
      </div>

      {/* ✅ RENDER EACH SECTION WITH AN ID */}
      <div id="starters">{renderSection("מנות פתיחה", "Starters")}</div>
      <div id="sandwiches">{renderSection("כריכים", "Sandwiches")}</div>
      <div id="meats">{renderSection("בשרים במשקל", ["Meats", "premium Meat"], true)}</div>
      <div id="sides">{renderSection("תוספות בצד", "Side Dishes")}</div>
      <div id="drinks">{renderSection("שתיה", "Drinks")}</div>
    </div>
  );
};

export default Menu;
