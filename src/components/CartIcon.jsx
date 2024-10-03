import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCartShopping } from "@fortawesome/free-solid-svg-icons"; // Import the cart icon
import CartContext from "../context/CartContext"; // Import your cart context
import "../components/CartIcon.css"

const CartIcon = () => {
  const { totalItems } = useContext(CartContext); // Access total items in cart

  return (
    <Link to="/cart">
      <div className="cart-container">
        <FontAwesomeIcon icon={faCartShopping} size="2x" color="white" /> {/* Cart icon */}
        {totalItems > 0 && <span className="cart-counter">{totalItems}</span>}
      </div>
    </Link>
  );
};

export default CartIcon;
