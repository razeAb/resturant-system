import React, { useContext } from "react";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCartShopping } from "@fortawesome/free-solid-svg-icons";
import CartContext from "../../context/CartContext.jsx";
import "./CartIcon.css";

const CartIcon = ({ onOpen }) => {
  const { totalItems } = useContext(CartContext);
  const location = useLocation();

  // Only show on home route "/"
  if (location.pathname !== "/") {
    return null;
  }

  return (
    <button className="cart-container" type="button" onClick={onOpen} aria-label="Open cart">
      <FontAwesomeIcon icon={faCartShopping} size="2x" color="white" />
      {totalItems > 0 && <span className="cart-counter">{totalItems}</span>}
    </button>
  );
};

export default CartIcon;
