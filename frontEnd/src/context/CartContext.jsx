import React, { createContext, useCallback, useMemo, useState } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  const clearCart = useCallback(() => {
    setCartItems([]);
    localStorage.removeItem("cartItems"); // optional: if you're storing in localStorage
  }, []);

  // Add item to cart
  const addToCart = useCallback((item) => {
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
  }, []);

  // Remove item from cart
  const removeFromCart = useCallback((itemId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  }, []);

  // Update item quantity (non-weighted items only)
  const updateItemQuantity = useCallback((itemId, nextQuantity) => {
    setCartItems((prevItems) =>
      prevItems.flatMap((item) => {
        if (item.id !== itemId || item.isWeighted) return [item];
        const safeQuantity = Number(nextQuantity);
        if (!Number.isFinite(safeQuantity) || safeQuantity <= 0) return [];
        const additionsTotal = item.selectedOptions?.additions?.reduce((sum, add) => sum + add.price, 0) || 0;
        const unitPrice = Number(item.price) + additionsTotal;
        return [
          {
            ...item,
            quantity: safeQuantity,
            totalPrice: Number.isFinite(unitPrice) ? unitPrice * safeQuantity : item.totalPrice,
          },
        ];
      })
    );
  }, []);

  // Replace/update an existing cart item by id
  const updateCartItem = useCallback((itemId, nextItem) => {
    if (!itemId) return;
    setCartItems((prevItems) => prevItems.map((item) => (item.id === itemId ? { ...item, ...nextItem, id: itemId } : item)));
  }, []);

  // Calculate total number of items
  const totalItems = cartItems.reduce((acc, item) => {
    const qty = item.isWeighted ? 1 : item.quantity || 0;
    return acc + qty;
  }, 0);
  const value = useMemo(
    () => ({ cartItems, addToCart, removeFromCart, updateItemQuantity, updateCartItem, clearCart, totalItems }),
    [cartItems, addToCart, removeFromCart, updateItemQuantity, updateCartItem, clearCart, totalItems]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartContext;
