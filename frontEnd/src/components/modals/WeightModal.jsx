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

  const { addToCart } = useContext(CartContext); // Access addToCart function from CartContext
  const { t, lang } = useLang();

  const [comment, setComment] = useState(""); // Initial comment is an empty string

  const { vegetables, fixedAdditions } = useMenuOptions();

  const availableVegetables = vegetables?.length ? vegetables : [];
  const availableFixedAdditions = fixedAdditions?.length ? fixedAdditions : [];

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

  // Calculate the total price
  const calculateTotalPrice = () => {
    // Sum up the prices of the selected additions
    const additionsTotal = selectedOptions.additions.reduce((total, item) => total + item.price, 0);

    // Multiply the base price by the selected grams (divided by 100) and add the additions
    const totalPrice = parseFloat(price) * (selectedGrams / 100) + additionsTotal;

    // Format to show no decimals for whole numbers and two decimals for non-whole numbers
    return Number.isInteger(totalPrice) ? totalPrice : totalPrice.toFixed(2);
  };

  const handleAddToCart = () => {
    // Calculate the total price based on grams and additions
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
      selectedOptions,
      comment,
      totalPrice: parseFloat(totalPrice),
    };

    const targetAdd = onAddToCart || addToCart;
    targetAdd(itemToAdd); // Add the item to the cart via context or caller
    setComment(""); // Clear the comment
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
