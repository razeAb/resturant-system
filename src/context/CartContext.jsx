import React, { createContext, useState } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  // Add item to cart
  const addToCart = (item) => {
    setCartItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex((i) => i.id === item.id);
      if (existingItemIndex !== -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + item.quantity,
          totalPrice: updatedItems[existingItemIndex].totalPrice + item.totalPrice,
        };
        return updatedItems;
      }
      return [...prevItems, item];
    });
  };

  // Remove item from cart
  const removeFromCart = (itemId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  };

  // Calculate total number of items
  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, totalItems }}>{children}</CartContext.Provider>;
};

export default CartContext;
