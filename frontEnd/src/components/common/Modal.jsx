import React, { useContext, useRef, useState } from "react";
import CartContext from "../../context/CartContext";
import "./Modal.css"; // Ensure this includes your existing modal and checkbox styles

import { useMenuOptions } from "../../context/MenuOptionsContext";
import { useLang } from "../../context/LangContext";
import { translateOptionLabel } from "../../utils/optionTranslations";

const Modal = ({
  _id,
  img,
  title,
  price,
  fullSandwichPrice,
  extraPattyPrice,
  description,
  options,
  isOpen,
  onClose,
  onAddToCart,
  name_en,
  name_he,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState({
    vegetables: [],
    additions: [],
    doneness: "",
  });
  const [comment, setComment] = useState(""); // ✅ missing state added
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const { addToCart } = useContext(CartContext); // Access addToCart function
  const { t, lang } = useLang();
  const menuOptions = useMenuOptions() || {};
  const sourceOptions = options && Object.keys(options).length ? options : menuOptions;
  const { vegetables = [], weightedAdditions = [], fixedAdditions = [] } = sourceOptions;

  const availableVegetables = vegetables;
  const availableWeightedAdditions = weightedAdditions;
  const availableFixedAdditions = fixedAdditions;

  if (!isOpen) return null;

  const basePrice = Number(price) || 0;
  const fullPrice = Number(fullSandwichPrice);
  const hasFullSandwichOption = Number.isFinite(fullPrice) && fullPrice > 0;
  const fullSandwichExtra = hasFullSandwichOption ? fullPrice - basePrice : 0;
  const extraPattyValue = Number(extraPattyPrice);
  const hasExtraPattyOption = Number.isFinite(extraPattyValue) && extraPattyValue > 0;

  const formatAdditionLabel = (name, suffix, priceValue) => `${name}${suffix ? ` ${suffix}` : ""} (+₪${priceValue})`;
  const formatPrice = (value) => (Number.isInteger(value) ? value : Number(value).toFixed(2));
  const getWeightedGrams = (label) => {
    const match = String(label).match(/(\d+)\s*(?:גרם|g)/i);
    return match ? Number(match[1]) : 0;
  };

  const showToast = (message) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2000);
  };

  const calculateTotalPrice = () => {
    const additionsTotal = selectedOptions.additions.reduce((total, item) => total + item.price, 0);
    const totalPrice = basePrice * quantity + additionsTotal;
    return Number.isInteger(totalPrice) ? totalPrice : parseFloat(totalPrice.toFixed(2));
  };

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleVegetableChange = (vegetable) => {
    setSelectedOptions((prev) => ({
      ...prev,
      vegetables: prev.vegetables.includes(vegetable)
        ? prev.vegetables.filter((item) => item !== vegetable)
        : [...prev.vegetables, vegetable],
    }));
  };

  const handleWeightedAdditionChange = (addition, grams) => {
    setSelectedOptions((prev) => {
      const price = grams === 100 ? addition.pricePer100 : addition.pricePer50;
      const label = formatAdditionLabel(addition.name, `(${grams} גרם)`, price);
      const alreadySelected = prev.additions.some((item) => item.addition === label);

      // If this exact option is already selected – remove it
      if (alreadySelected) {
        return {
          ...prev,
          additions: prev.additions.filter((item) => item.addition !== label),
        };
      }

      // Remove same addition with other grams (so only one per meat)
      const updatedAdditions = prev.additions.filter((item) => !item.addition.includes(addition.name));
      const totalGrams = updatedAdditions.reduce((sum, item) => sum + getWeightedGrams(item.addition), 0);

      if (totalGrams + grams > 100) {
        showToast(t("modal.meatAdditionsMax", "מקסימום 100 גרם לתוספות בשר"));
        return prev;
      }

      return {
        ...prev,
        additions: [...updatedAdditions, { addition: label, price }],
      };
    });
  };

  const handleFixedAdditionChange = (addition) => {
    setSelectedOptions((prev) => {
      const label = formatAdditionLabel(addition.name, "", addition.price);
      const alreadySelected = prev.additions.some((item) => item.addition === label);

      if (alreadySelected) {
        // Remove if already selected
        return {
          ...prev,
          additions: prev.additions.filter((item) => item.addition !== label),
        };
      }

      // Add if not selected
      return {
        ...prev,
        additions: [...prev.additions, { addition: label, price: addition.price }],
      };
    });
  };

  const handleAddToCart = () => {
    if (isBurgerItem && !selectedOptions.doneness) {
      showToast(t("modal.donenessRequired", "Please choose a doneness option"));
      return;
    }
    const totalPrice = calculateTotalPrice();

    const itemToAdd = {
      _id, // מזהה אמיתי שנשלח לבקנד
      id: `${title}-${Math.random().toString(36).substring(7)}`, // מזהה ייחודי פנימי לעגלה
      img,
      title,
      name_en,
      name_he,
      price: parseFloat(price),
      quantity,
      isWeighted: false,
      selectedOptions,
      comment,
      totalPrice: parseFloat(totalPrice),
    };

    const targetAdd = onAddToCart || addToCart;
    targetAdd(itemToAdd);

    // reset modal state
    setQuantity(1);
    setSelectedOptions({
      vegetables: [],
      additions: [],
      doneness: "",
    });
    setComment(""); // Clear the comment
    onClose(); // Close the modal
  };

  const handleFullSandwichToggle = () => {
    const fullSandwichLabel = t("modal.fullSandwich", "סנדוויץ' מלא");
    const extraPrice = Math.max(0, fullSandwichExtra);

    setSelectedOptions((prev) => {
      const withoutFull = prev.additions.filter((item) => !item.fullSandwich && !item.halfSandwich);
      const isSelected = prev.additions.some((item) => item.fullSandwich);

      if (isSelected) {
        return { ...prev, additions: withoutFull };
      }

      return {
        ...prev,
        additions: [...withoutFull, { addition: fullSandwichLabel, price: extraPrice, fullSandwich: true }],
      };
    });
  };

  const handleHalfSandwichToggle = () => {
    const halfSandwichLabel = t("modal.halfSandwich", "חצי סנדוויץ'");

    setSelectedOptions((prev) => {
      const withoutHalf = prev.additions.filter((item) => !item.fullSandwich && !item.halfSandwich);
      const isSelected = prev.additions.some((item) => item.halfSandwich);

      if (isSelected) {
        return { ...prev, additions: withoutHalf };
      }

      return {
        ...prev,
        additions: [...withoutHalf, { addition: halfSandwichLabel, price: 0, halfSandwich: true }],
      };
    });
  };

  // add burger detections
  const burgerRegex = /burger|hamburger|בורגר|המבורגר/i;
  const isBurgerItem = [title, name_en, name_he].some((value) => burgerRegex.test(String(value || "")));

  const donenessOptions = [
    { value: "medium", label: t("modal.donenessMedium", "Medium") },
    { value: "medium-well", label: t("modal.donenessMediumWell", "Medium well") },
    { value: "well-done", label: t("modal.donenessWellDone", "Well done") },
  ];

  const handleDonenessChange = (value) => {
    setSelectedOptions((prev) => ({ ...prev, doneness: value }));
  };

  const handleExtraPattyToggle = () => {
    const extraPattyLabel = t("modal.extraPatty", "תוספת קציצה");

    setSelectedOptions((prev) => {
      const withoutPatty = prev.additions.filter((item) => !item.extraPatty);
      const isSelected = prev.additions.some((item) => item.extraPatty);

      if (isSelected) {
        return { ...prev, additions: withoutPatty };
      }

      return {
        ...prev,
        additions: [...withoutPatty, { addition: extraPattyLabel, price: extraPattyValue, extraPatty: true }],
      };
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" dir="ltr" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>
          &times;
        </button>

        <img src={img} alt={title} className="modal-img" />
        <h2 className="font-semibold text-center text-xl pt-8">{title}</h2>

        <p className="modal-description font-semibold text-center text-xl pt-6">{description}</p>

        {/* Sandwich size */}
        {hasFullSandwichOption && (
          <div className="modal-options">
            <h3 className="text-2xl font-semibold text-center pb-10">{t("modal.sandwichSize", "גודל סנדוויץ'")}</h3>
            <div className="checkbox-wrapper-30 checkbox-container">
              <span className="checkbox">
                <input
                  type="checkbox"
                  id="half-sandwich-option"
                  onChange={handleHalfSandwichToggle}
                  checked={selectedOptions.additions.some((item) => item.halfSandwich)}
                />
                <svg>
                  <use xlinkHref="#checkbox-30" className="checkbox"></use>
                </svg>
              </span>
              <label htmlFor="half-sandwich-option" className="checkbox-label pl-2">
                🥪 {t("modal.halfSandwich", "חצי סנדוויץ'")}
                <span className="pl-2 text-sm text-gray-500">
                  ({t("modal.halfSandwichPrice", "מחיר חצי")} ₪{formatPrice(basePrice)})
                </span>
              </label>
            </div>
            <div className="checkbox-wrapper-30 checkbox-container">
              <span className="checkbox">
                <input
                  type="checkbox"
                  id="full-sandwich-option"
                  onChange={handleFullSandwichToggle}
                  checked={selectedOptions.additions.some((item) => item.fullSandwich)}
                />
                <svg>
                  <use xlinkHref="#checkbox-30" className="checkbox"></use>
                </svg>
              </span>
              <label htmlFor="full-sandwich-option" className="checkbox-label pl-2">
                🥪 {t("modal.fullSandwich", "סנדוויץ' מלא")}
                <span className="pl-2 text-sm text-gray-500">
                  (+₪{formatPrice(Math.max(0, fullSandwichExtra))} · {t("modal.fullSandwichTotal", 'סה"כ')} ₪{formatPrice(fullPrice)})
                </span>
              </label>
            </div>
          </div>
        )}

        {hasExtraPattyOption && (
          <div className="modal-options">
            <h3 className="text-2xl font-semibold text-center pb-10">{t("modal.extraPatty", "תוספת קציצה")}</h3>
            <div className="checkbox-wrapper-30 checkbox-container">
              <span className="checkbox">
                <input
                  type="checkbox"
                  id="extra-patty-option"
                  onChange={handleExtraPattyToggle}
                  checked={selectedOptions.additions.some((item) => item.extraPatty)}
                />
                <svg>
                  <use xlinkHref="#checkbox-30" className="checkbox"></use>
                </svg>
              </span>
              <label htmlFor="extra-patty-option" className="checkbox-label pl-2">
                🍔 {t("modal.extraPatty", "תוספת קציצה")}
                <span className="pl-2 text-sm text-gray-500">(+₪{formatPrice(extraPattyValue)})</span>
              </label>
            </div>
          </div>
        )}

        {isBurgerItem && (
          <div className="modal-options">
            <h3 className="text-2xl font-semibold text-center pb-10">{t("modal.burgerDoneness", "Burger doneness")}</h3>
            {donenessOptions.map((option) => (
              <div key={option.value} className="checkbox-wrapper-30 checkbox-container">
                <span className="checkbox">
                  <input
                    type="radio"
                    name={`doneness-${_id || title}`}
                    id={`doneness-${option.value}-${_id || title}`}
                    value={option.value}
                    checked={selectedOptions.doneness === option.value}
                    onChange={() => handleDonenessChange(option.value)}
                  />
                  <svg>
                    <use xlinkHref="#checkbox-30" className="checkbox"></use>
                  </svg>
                </span>
                <label htmlFor={`doneness-${option.value}-${_id || title}`} className="checkbox-label pl-2">
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        )}

        {/* Vegetables */}
        <div className="modal-options">
          <h3 className="text-2xl font-semibold text-center pb-10">{t("modal.vegetablesOnDish", ":ירקות על המנה")}</h3>
          {availableVegetables.map((vegetable, index) => (
            <div key={index} className="checkbox-wrapper-30 checkbox-container">
              <span className="checkbox">
                <input
                  type="checkbox"
                  id={`vegetable-option-${index}`}
                  onChange={() => handleVegetableChange(vegetable)}
                  checked={selectedOptions.vegetables.includes(vegetable)}
                />
                <svg>
                  <use xlinkHref="#checkbox-30" className="checkbox"></use>
                </svg>
              </span>
              <label htmlFor={`vegetable-option-${index}`} className="checkbox-label pl-2">
                {translateOptionLabel(vegetable, lang)}
              </label>
            </div>
          ))}
        </div>

        {/* Additions */}
        <div className="modal-options">
          <h3 className="text-2xl font-semibold text-center pb-10">{t("modal.additionsRegular", ":תוספת למנה רגילה")}</h3>

          {/* Fixed-price additions */}
          {availableFixedAdditions.map((addition, index) => (
            <div key={index} className="checkbox-wrapper-30 checkbox-container">
              <span className="checkbox">
                <input
                  type="checkbox"
                  id={`addition-option-${index}`}
                  onChange={() => handleFixedAdditionChange(addition)}
                  checked={selectedOptions.additions.some((item) => item.addition.includes(addition.name))}
                />
                <svg>
                  <use xlinkHref="#checkbox-30" className="checkbox"></use>
                </svg>
              </span>
              <label htmlFor={`addition-option-${index}`} className="checkbox-label pl-2">
                {translateOptionLabel(addition.name, lang)} (₪{addition.price})
              </label>
            </div>
          ))}

          <h4 className="text-lg font-semibold text-center pb-6">{t("modal.meatAdditions", "תוספת בשר")}</h4>
          {/* Gram-based additions */}
          {availableWeightedAdditions.map((addition, index) => (
            <div key={index} className="addition-buttons">
              <span>{translateOptionLabel(addition.name, lang)}</span>
              <button
                className={`gram-button ${
                  selectedOptions.additions.some((item) => item.addition.includes(`${addition.name} (50 גרם)`)) ? "selected" : ""
                }`}
                onClick={() => handleWeightedAdditionChange(addition, 50)}
              >
                <span className="gram-weight">50{t("modal.grams", "גרם")}</span>
                <span className="gram-price">₪{addition.pricePer50}</span>
              </button>
              <button
                className={`gram-button ${
                  selectedOptions.additions.some((item) => item.addition.includes(`${addition.name} (100 גרם)`)) ? "selected" : ""
                }`}
                onClick={() => handleWeightedAdditionChange(addition, 100)}
              >
                <span className="gram-weight">100{t("modal.grams", "גרם")}</span>
                <span className="gram-price">₪{addition.pricePer100}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Comment */}
        <div className="modal-comment">
          <h3 className="text-2xl font-semibold text-center pb-10">{t("modal.addComment", ":הוסף הערה")}</h3>
          <textarea
            placeholder={t("modal.commentPlaceholder", "הוסף הערה (לא חובה)")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              margin: "10px 0",
            }}
          ></textarea>
        </div>

        {toast && (
          <div className="modal-toast" role="status" aria-live="polite">
            {toast}
          </div>
        )}

        {/* Footer */}
        <div className="modal-footer sticky bottom-0 bg-white py-4 px-6 shadow-inner flex items-center justify-between gap-4 z-10">
          {/* Quantity Selector */}
          <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-[#1f3a44] text-orange-400 font-bold w-32">
            <button onClick={() => handleQuantityChange(-1)} className="text-xl">
              −
            </button>
            <span>{quantity}</span>
            <button onClick={() => handleQuantityChange(1)} className="text-xl">
              +
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            className="w-full sm:w-auto flex flex-wrap sm:flex-nowrap items-center justify-center sm:justify-between gap-2 sm:gap-4 px-4 sm:px-6 py-3 border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-all duration-200 rounded-full font-semibold shadow-md text-center text-sm sm:text-base"
          >
            <span>{t("modal.addToCart", "הוספה לעגלה")}</span>
            <span className="font-bold whitespace-nowrap text-lg sm:text-base">₪{calculateTotalPrice()}</span>
          </button>
        </div>

        {/* SVG for checkbox */}
        <svg xmlns="http://www.w3.org/2000/svg" style={{ display: "none" }}>
          <symbol id="checkbox-30" viewBox="0 0 22 22">
            <path
              fill="none"
              stroke="currentColor"
              d="M5.5,11.3L9,14.8L20.2,3.3l0,0c-0.5-1-1.5-1.8-2.7-1.8h-13c-1.7,0-3,1.3-3,3v13c0,1.7,1.3,3,3,3h13
               c1.7,0,3-1.3,3-3v-13c0-0.4-0.1-0.8-0.3-1.2"
            />
          </symbol>
        </svg>
      </div>
    </div>
  );
};

export default Modal;
