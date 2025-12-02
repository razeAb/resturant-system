import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api";

export const DEFAULT_MENU_OPTIONS = {
  vegetables: ["🥬 חסה", "🥒 מלפפון חמוץ", "🍅 עגבניה", "🧅 בצל", "🥗 סלט קרוב", "🌿 צימצורי"],
  weightedAdditions: [
    { name: "🥩 צלי כתף", pricePer50: 13, pricePer100: 26 },
    { name: "🥩 אונטרייב", pricePer50: 13, pricePer100: 26 },
    { name: "🥩 אסאדו", pricePer50: 15, pricePer100: 30 },
    { name: "🥩 צוואר טלה", pricePer50: 15, pricePer100: 30 },
    { name: "🥩 בריסקת", pricePer50: 13, pricePer100: 26 },
  ],
  fixedAdditions: [
    { name: "🥓 ביקון טלה", price: 10 },
    { name: "🧀 רוטב גבינה", price: 8 },
    { name: "🍄 פטריות", price: 5 },
    { name: "🥖 ג׳בטה", price: 5 },
  ],
};

const MenuOptionsContext = createContext({
  ...DEFAULT_MENU_OPTIONS,
  loading: false,
  error: "",
  refresh: () => {},
  setOptions: () => {},
});

export const MenuOptionsProvider = ({ children }) => {
  const [options, setOptions] = useState(DEFAULT_MENU_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/api/menu-options`);
      const data = res.data?.options || res.data;
      if (data) {
        setOptions({
          vegetables: Array.isArray(data.vegetables) && data.vegetables.length ? data.vegetables : DEFAULT_MENU_OPTIONS.vegetables,
          weightedAdditions:
            Array.isArray(data.weightedAdditions) && data.weightedAdditions.length
              ? data.weightedAdditions
              : DEFAULT_MENU_OPTIONS.weightedAdditions,
          fixedAdditions:
            Array.isArray(data.fixedAdditions) && data.fixedAdditions.length
              ? data.fixedAdditions
              : DEFAULT_MENU_OPTIONS.fixedAdditions,
        });
      } else {
        setOptions(DEFAULT_MENU_OPTIONS);
      }
    } catch (err) {
      console.error("Failed to load menu options", err);
      setError("לא ניתן לטעון תוספות וסלטים כעת");
      setOptions(DEFAULT_MENU_OPTIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <MenuOptionsContext.Provider
      value={{ ...options, loading, error, refresh, setOptions }}
    >
      {children}
    </MenuOptionsContext.Provider>
  );
};

export const useMenuOptions = () => useContext(MenuOptionsContext);