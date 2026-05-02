import React, { createContext, useCallback, useMemo, useState } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  const clearCart = useCallback(() => {
    setCartItems([]);
    localStorage.removeItem("cartItems"); // optional: if you're storing in localStorage
  }, []);

  const normalizeCartItem = (item) => {
    if (!item || typeof item !== "object") return null;

    const normalizedId = item.id ?? item._id ?? item.product ?? null;
    if (!normalizedId) return null;

    const quantity = Number(item.quantity ?? 1);
    const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;

    const basePrice = Number(item.price ?? 0);
    const safePrice = Number.isFinite(basePrice) ? basePrice : 0;

    const incomingTotal = Number(item.totalPrice);
    const totalPrice = Number.isFinite(incomingTotal) ? incomingTotal : safePrice * safeQuantity;

    return {
      ...item,
      id: normalizedId,
      quantity: safeQuantity,
      price: safePrice,
      totalPrice,
      selectedOptions: item.selectedOptions ?? {},
    };
  };

  // Add item to cart
  const addToCart = useCallback((item) => {
    const normalized = normalizeCartItem(item);
    if (!normalized) return;
    setCartItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex((i) => i.id === normalized.id);
      if (existingItemIndex !== -1) {
        const updatedItems = [...prevItems];
        const prevTotal = Number(updatedItems[existingItemIndex].totalPrice) || 0;
        const nextTotal = Number(normalized.totalPrice) || 0;
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: (Number(updatedItems[existingItemIndex].quantity) || 0) + (Number(normalized.quantity) || 0),
          totalPrice: prevTotal + nextTotal,
        };
        return updatedItems;
      }
      return [...prevItems, normalized];
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
