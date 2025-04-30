import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCartShopping } from "@fortawesome/free-solid-svg-icons";
import CartContext from "../../context/CartContext.jsx";
import "./CartIcon.css";

const CartIcon = () => {
  const { totalItems } = useContext(CartContext);
  const location = useLocation();

  // Only show on home route "/"
  if (location.pathname !== "/") {
    return null;
  }

  return (
    <Link to="/cart">
      <div className="cart-container">
        <FontAwesomeIcon icon={faCartShopping} size="2x" color="white" />
        {totalItems > 0 && <span className="cart-counter">{totalItems}</span>}
      </div>
    </Link>
  );
};

export default CartIcon;
