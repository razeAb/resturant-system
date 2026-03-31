import React, { useContext, useState } from "react";
import CartContext from "../../context/CartContext";
import "../common/Modal.css";
import { useMenuOptions } from "../../context/MenuOptionsContext";
import { useLang } from "../../context/LangContext";
import { translateOptionLabel } from "../../utils/optionTranslations";
const Modal = ({ _id, img, title, price, description, options, isOpen, onClose, onAddToCart, name_en, name_he }) => {
  const [selectedGrams, setSelectedGrams] = useState(200); // Default quantity is 200 grams
  const [selectedOptions, setSelectedOptions] = useState({
    vegetables: [],
    additions: [],
  });
  const [selectedSauces, setSelectedSauces] = useState([]);

  const { addToCart } = useContext(CartContext); // Access addToCart function from CartContext
  const { t, lang } = useLang();

  const [comment, setComment] = useState(""); // Initial comment is an empty string

  const menuOptions = useMenuOptions() || {};
  const sourceOptions = options && Object.keys(options).length ? options : menuOptions;
  const { vegetables, fixedAdditions, sauces } = sourceOptions;

  const availableVegetables = vegetables?.length ? vegetables : [];
  const availableFixedAdditions = fixedAdditions?.length ? fixedAdditions : [];
  const availableSauces = Array.isArray(sauces) ? sauces : [];
  const sauceSelectionLimit = Number.isFinite(Number(sourceOptions?.sauceLimit)) ? Number(sourceOptions.sauceLimit) : null;

  if (!isOpen) return null;

  // Handle vegetable selection
  const handleVegetableChange = (vegetable) => {
    setSelectedOptions((prev) => ({
      ...prev,
      vegetables: prev.vegetables.includes(vegetable)
        ? prev.vegetables.filter((item) => item !== vegetable)
        : [...prev.vegetables, vegetable],
    }));
  };

  const handleAdditionChange = (addition) => {
    const label = `${addition.name} (+₪${addition.price})`;

    setSelectedOptions((prev) => ({
      ...prev,
      additions: prev.additions.some((item) => item.addition === label)
        ? prev.additions.filter((item) => item.addition !== label)
        : [...prev.additions, { addition: label, price: addition.price }],
    }));
  };

  const saucePrice = 2;
  const freeSauceLimit = 3 + Math.max(0, Math.floor((selectedGrams - 200) / 100)) * 2;
  const totalSauceCount = selectedSauces.length;
  const extraSauceCount = Math.max(0, totalSauceCount - freeSauceLimit);
  const extraSauceTotal = extraSauceCount * saucePrice;

  const getSauceCount = (sauce) => selectedSauces.filter((item) => item === sauce).length;

  const handleSauceIncrement = (sauce) => {
    setSelectedSauces((prev) => {
      if (sauceSelectionLimit && prev.length >= sauceSelectionLimit) return prev;
      return [...prev, sauce];
    });
  };

  const handleSauceDecrement = (sauce) => {
    setSelectedSauces((prev) => {
      const index = prev.lastIndexOf(sauce);
      if (index === -1) return prev;
      return [...prev.slice(0, index), ...prev.slice(index + 1)];
    });
  };

  const buildSauceAdditions = () => {
    const saucePrefix = t("modal.saucePrefix", "רוטב");
    return selectedSauces.map((sauce, index) => {
      const isPaid = index >= freeSauceLimit;
      const suffix = isPaid ? ` (+₪${saucePrice})` : "";
      const label = `${saucePrefix}: ${translateOptionLabel(sauce, lang)}${suffix}`;
      return { addition: label, price: isPaid ? saucePrice : 0, sauce: true };
    });
  };

  // Calculate the total price
  const calculateTotalPrice = () => {
    // Sum up the prices of the selected additions
    const additionsTotal = selectedOptions.additions.reduce((total, item) => total + item.price, 0);

    // Multiply the base price by the selected grams (divided by 100) and add the additions
    const totalPrice = parseFloat(price) * (selectedGrams / 100) + additionsTotal + extraSauceTotal;

    // Format to show no decimals for whole numbers and two decimals for non-whole numbers
    return Number.isInteger(totalPrice) ? totalPrice : totalPrice.toFixed(2);
  };

  const handleAddToCart = () => {
    // Calculate the total price based on grams and additions
    const sauceAdditions = buildSauceAdditions();
    const totalPrice = calculateTotalPrice();

    // Add the item to the cart
    const itemToAdd = {
      _id, // מזהה אמיתי שנשלח לבקנד
      id: `${title}-${Math.random().toString(36).substring(7)}`, // מזהה ייחודי פנימי לעגלה
      img,
      title,
      name_en,
      name_he,
      price: parseFloat(price),
      quantity: selectedGrams,
      isWeighted: true,
      selectedOptions: {
        ...selectedOptions,
        additions: [...selectedOptions.additions, ...sauceAdditions],
        sauces: selectedSauces,
      },
      comment,
      totalPrice: parseFloat(totalPrice),
    };

    const targetAdd = onAddToCart || addToCart;
    targetAdd(itemToAdd); // Add the item to the cart via context or caller
    setComment(""); // Clear the comment
    setSelectedSauces([]);
    onClose(); // Close the modal
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" dir="ltr" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>
          &times;
        </button>
        <img src={img} alt={title} className="modal-img" />
        <h2 className="font-semibold text-center text-xl pt-6">{title}</h2>

        <p className="modal-description font-semibold text-center text-xl pt-6">{description}</p>

        {/* Options for Vegetables */}
        <div className="modal-options">
          <h3 className="text-2xl font-semibold text-center pb-10">{t("modal.vegetablesSide", ":ירקות בצד למנה")}</h3>
          {availableVegetables.map((vegetable, index) => (
            <div key={index} className="checkbox-wrapper-30 checkbox-container">
              <span className="checkbox">
                <input type="checkbox" id={`vegetable-option-${index}`} onChange={() => handleVegetableChange(vegetable)} />
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

        {/* Options for Additions */}
        <div className="modal-options">
          <h3 className="text-2xl font-semibold text-center pb-10">{t("modal.additionsRegular", ":תוספת למנה רגילה")}</h3>
          {availableFixedAdditions.map((addition, index) => (
            <div key={index} className="checkbox-wrapper-30 checkbox-container">
              <span className="checkbox">
                <input
                  type="checkbox"
                  id={`addition-option-${index}`}
                  onChange={() => handleAdditionChange(addition)}
                  checked={selectedOptions.additions.some((item) => item.addition.includes(addition.name))}
                />
                <svg>
                  <use xlinkHref="#checkbox-30" className="checkbox"></use>
                </svg>
              </span>
              <label htmlFor={`addition-option-${index}`} className="checkbox-label pl-2">
                {translateOptionLabel(addition.name, lang)} (₪{addition.price}){" "}
              </label>
            </div>
          ))}

          {availableSauces.length > 0 && (
            <>
              <h4 className="text-lg font-semibold text-center pb-4">{t("modal.sauces", "תוספות רטבים")}</h4>
              <div className="text-sm text-center text-gray-500 pb-4 space-y-1">
                <div>{t("modal.weightSauceBaseNote", "")}</div>
                <div>{t("modal.weightSauceExtraNote", "")}</div>
                {sauceSelectionLimit !== null && (
                  <div className="font-semibold text-slate-700">
                    {totalSauceCount}/{sauceSelectionLimit}
                  </div>
                )}
              </div>
              {availableSauces.map((sauce, index) => (
                <div key={index} className="flex items-center justify-between gap-4 py-2">
                  <span className="checkbox-label pl-2">{translateOptionLabel(sauce, lang)}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSauceDecrement(sauce)}
                      disabled={getSauceCount(sauce) === 0}
                      className="h-8 w-8 rounded-full border border-slate-300 text-slate-700 disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="min-w-[2ch] text-center font-semibold">{getSauceCount(sauce)}</span>
                    <button
                      type="button"
                      onClick={() => handleSauceIncrement(sauce)}
                      disabled={sauceSelectionLimit !== null && totalSauceCount >= sauceSelectionLimit}
                      className="h-8 w-8 rounded-full border border-slate-300 text-slate-700 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

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
        </div>

        <div className="modal-footer sticky bottom-0 bg-white py-4 px-4 sm:px-6 shadow-inner flex flex-row items-center justify-between gap-4 z-10 flex-wrap">
          {/* Selected grams display */}
          <div className="flex items-center justify-between px-4 py-2 rounded-full bg-[#1f3a44] text-orange-400 font-bold w-full sm:w-40 shadow-md text-xl sm:text-base">
            <button onClick={() => setSelectedGrams((prev) => Math.max(200, prev - 100))} className="text-2xl px-2">
              −
            </button>
            <span className="mx-2">{selectedGrams}g</span>
            <button onClick={() => setSelectedGrams((prev) => Math.min(1000, prev + 100))} className="text-2xl px-2">
              +
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            className="w-full sm:w-auto flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-all duration-200 rounded-full font-semibold shadow-md text-base sm:text-base"
          >
            <span>{t("modal.addToCart", "הוספה לעגלה")}</span>
            <span className="font-bold text-2xl sm:text-base whitespace-nowrap">₪{calculateTotalPrice()}</span>
          </button>
        </div>

        {/* SVG for checkbox */}
        <svg xmlns="http://www.w3.org/2000/svg" style={{ display: "none" }}>
          <symbol id="checkbox-30" viewBox="0 0 22 22">
            <path
              fill="none"
              stroke="currentColor"
              d="M5.5,11.3L9,14.8L20.2,3.3l0,0c-0.5-1-1.5-1.8-2.7-1.8h-13c-1.7,0-3,1.3-3,3v13c0,1.7,1.3,3,3,3h13 c1.7,0,3-1.3,3-3v-13c0-0.4-0.1-0.8-0.3-1.2"
            />
          </symbol>
        </svg>
      </div>
    </div>
  );
};

export default Modal;
