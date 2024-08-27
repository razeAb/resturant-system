import React, { createContext, createContext, useState } from "react";

const createContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  const addToCart = (item) => {
    setCartItems((prevItems) => [...prevItems, item]);
  };

  const removeFromCart = (itemId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  };

  return <createContext.provider value={{ cartItems, addToCart, removeFromCart }}>{children}</createContext.provider>;
};

export default createContext;
