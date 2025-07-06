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
              additions={item.additions}
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
    <div className="min-h-screen flex flex-col justify-center items-center lg:px-32 px-5">
      <h1 className="text-4xl font-semibold text-center pt-24 pb-10">תפריט שלנו</h1>

      {renderSection("כריכים", "Sandwiches")}
      {renderSection("בשרים במשקל", ["Meat", "premium Meat"], true)}
      {renderSection("מנות פתיחה", "Starters")}
      {renderSection("תוספות בצד", "Sides")}
      {renderSection("שתיה", "Drinks")}
    </div>
  );
};

export default Menu;
