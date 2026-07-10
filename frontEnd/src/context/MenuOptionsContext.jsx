import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api";

export const DEFAULT_MENU_OPTIONS = {
  vegetables: ["🥬 חסה", "🥒 מלפפון חמוץ", "🍅 עגבניה", "🧅 בצל", "🥗 סלט קרוב", "🌿 צימצורי"].map((name) => ({
    name,
    isActive: true,
  })),
  sauces: [
    "איולי סומק",
    "איולי חריף",
    "ברביקיו",
    "חלפיניו",
    "קונפי שום",
    "דבש",
    "2 שקיות קטשוב",
    "2 שקיות מיונז",
    "2 שקיית אליפאים",
    "חרדל דיגון",
  ].map((name) => ({ name, isActive: true })),
  weightedAdditions: [
    { name: "🥩 צלי כתף", pricePer50: 13, pricePer100: 26, isActive: true },
    { name: "🥩 אונטרייב", pricePer50: 13, pricePer100: 26, isActive: true },
    { name: "🥩 אסאדו", pricePer50: 15, pricePer100: 30, isActive: true },
    { name: "🥩 צוואר טלה", pricePer50: 15, pricePer100: 30, isActive: true },
    { name: "🥩 בריסקת", pricePer50: 13, pricePer100: 26, isActive: true },
  ],
  fixedAdditions: [
    { name: "🥓 ביקון טלה", price: 10, isActive: true },
    { name: "🧀 רוטב גבינה", price: 8, isActive: true },
    { name: "🍄 פטריות", price: 5, isActive: true },
    { name: "🥖 ג׳בטה", price: 5, isActive: true },
  ],
};

const getOptionName = (item) => String(typeof item === "string" ? item : item?.name || "").trim();
const getOptionActive = (item) => (typeof item === "object" && item !== null && item.isActive === false ? false : true);

export const normalizeMenuOptions = (data = {}) => ({
  vegetables:
    Array.isArray(data.vegetables) && data.vegetables.length
      ? data.vegetables.map((item) => ({ name: getOptionName(item), isActive: getOptionActive(item) })).filter((item) => item.name)
      : DEFAULT_MENU_OPTIONS.vegetables,
  sauces:
    Array.isArray(data.sauces) && data.sauces.length
      ? data.sauces.map((item) => ({ name: getOptionName(item), isActive: getOptionActive(item) })).filter((item) => item.name)
      : DEFAULT_MENU_OPTIONS.sauces,
  weightedAdditions:
    Array.isArray(data.weightedAdditions) && data.weightedAdditions.length
      ? data.weightedAdditions
          .map((item) => ({
            name: getOptionName(item),
            pricePer50: Number(item?.pricePer50) || 0,
            pricePer100: Number(item?.pricePer100) || 0,
            isActive: getOptionActive(item),
          }))
          .filter((item) => item.name)
      : DEFAULT_MENU_OPTIONS.weightedAdditions,
  fixedAdditions:
    Array.isArray(data.fixedAdditions) && data.fixedAdditions.length
      ? data.fixedAdditions
          .map((item) => ({
            name: getOptionName(item),
            price: Number(item?.price) || 0,
            isActive: getOptionActive(item),
          }))
          .filter((item) => item.name)
      : DEFAULT_MENU_OPTIONS.fixedAdditions,
});

export const getActiveMenuOptionNames = (items = []) =>
  (Array.isArray(items) ? items : []).filter((item) => getOptionActive(item)).map((item) => getOptionName(item)).filter(Boolean);

export const getActiveMenuOptionObjects = (items = []) =>
  (Array.isArray(items) ? items : [])
    .filter((item) => getOptionActive(item) && getOptionName(item))
    .map((item) => (typeof item === "string" ? { name: item, isActive: true } : item));

const MenuOptionsContext = createContext({
  ...DEFAULT_MENU_OPTIONS,
  loading: false,
  error: "",
  refresh: () => {},
  setOptions: () => {},
});

export const MenuOptionsProvider = ({ children }) => {
  const [options, setOptionsState] = useState(DEFAULT_MENU_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const setOptions = (nextOptions) => setOptionsState(normalizeMenuOptions(nextOptions));

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/api/menu-options`);
      const data = res.data?.options || res.data;
      if (data) {
        setOptions(data);
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
