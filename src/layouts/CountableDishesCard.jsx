import React, { useState, useContext } from "react";
import Button from "../components/common/Button";
import CartContext from "../context/CartContext"; // Import CartContext
import "../layouts/DishesCard.css"; // Import the CSS file

const CountableDishesCard = (props) => {
  const [quantity, setQuantity] = useState(1); // Default quantity is 1
  const { addToCart } = useContext(CartContext); // Get the addToCart function from context

  const handleQuantityChange = (delta) => {
    setQuantity((prevQuantity) => Math.max(1, prevQuantity + delta)); // Ensure quantity doesn't go below 1
  };

  const handleAddToCart = () => {
    const itemToAdd = {
      id: props.id,
      img: props.img,
      title: props.title,
      price: props.price, // Calculate total price based on quantity
      quantity, // Include the selected quantity
    };

    addToCart(itemToAdd); // Add the item to the cart
  };

  return (
    <div className="w-full lg:w-1/4 p-5 shadow-[rgba(0,_0,_0,_0.24)_0px_3px_8px] rounded-lg">
      <img className="rounded-xl" src={props.img} alt={props.title} />
      <div className="space-y-4">
        <h3 className="font-semibold text-center text-xl pt-6">{props.title}</h3>
        <div className="flex flex-row items-center justify-center gap-4">
          <h3 className="font-semibold text-lg">{props.price} ILS</h3>
        </div>
        <div className="flex justify-center items-center space-x-4">
          {/* Quantity controls */}
          <button className="quantity-button" onClick={() => handleQuantityChange(-1)}>
            -
          </button>
          <span className="quantity-display">{quantity}</span>
          <button className="quantity-button" onClick={() => handleQuantityChange(1)}>
            +
          </button>
        </div>
        <div className="flex justify-center items-center">
          <Button title="הוספה לעגלה" onClick={handleAddToCart} />
        </div>
      </div>
    </div>
  );
};

export default CountableDishesCard;
