import React, { useContext, useState } from "react";
import CartContext from "../../context/CartContext";
import "../common/Modal.css";
import { useLang } from "../../context/LangContext";

const CommentModal = ({ _id, img, title, price, description, isOpen, onClose, onAddToCart, name_en, name_he, isWingsMeal }) => {
  const { addToCart } = useContext(CartContext);
  const { t } = useLang();
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState("");
  const normalizedTitle = (title || "").toLowerCase();
  const normalizedNameEn = (name_en || "").toLowerCase();
  const normalizedNameHe = name_he || "";
  const normalizedTitlePlain = normalizedTitle.replace(/\s+/g, " ").trim();
  const normalizedNameHePlain = normalizedNameHe.replace(/\s+/g, " ").trim();
  const wingsNameRegex = /כנפ[יים]*\s+מעוש/i;
  const matchesWingsName =
    normalizedTitle.includes("wings") ||
    normalizedNameEn.includes("wings") ||
    normalizedTitle.includes("wing") ||
    normalizedNameEn.includes("wing") ||
    normalizedTitle.includes("כנפ") ||
    normalizedNameHe.includes("כנפ") ||
    wingsNameRegex.test(normalizedTitlePlain) ||
    wingsNameRegex.test(normalizedNameHePlain);
  const showSauceOptions = isWingsMeal || matchesWingsName;
  const sauceOptions = [
    { value: "sweet", label: `🍯 ${t("modal.sauceSweet", "מתוק")}` },
    { value: "hot", label: `🌶️ ${t("modal.sauceHot", "חריף")}` },
    { value: "mix", label: `🔥 ${t("modal.sauceMix", "מיקס מתוק/חריף")}` },
  ];
  const [sauceChoice, setSauceChoice] = useState(sauceOptions[0].value);

  if (!isOpen) return null;

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleAddToCart = () => {
    const totalPrice = parseFloat(price) * quantity;
    const selectedSauceLabel = sauceOptions.find((option) => option.value === sauceChoice)?.label || sauceOptions[0].label;
    const sauceAdditions = showSauceOptions ? [{ addition: `רוטב: ${selectedSauceLabel}`, price: 0 }] : [];
    const itemToAdd = {
      _id,
      id: `${title}-${Math.random().toString(36).substring(7)}`,
      img,
      title,
      name_en,
      name_he,
      price: parseFloat(price),
      quantity,
      isWeighted: false,
      selectedOptions: showSauceOptions ? { additions: sauceAdditions } : {},
      comment,
      totalPrice: parseFloat(totalPrice),
    };
    const targetAdd = onAddToCart || addToCart;
    targetAdd(itemToAdd);
    setComment("");
    setQuantity(1);
    if (showSauceOptions) {
      setSauceChoice(sauceOptions[0].value);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" dir="ltr" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>
          &times;
        </button>
        <img src={img} alt={title} className="modal-img" />
        <h2 className="font-semibold text-center text-xl pt-8">{title}</h2>
        {description && <p className="modal-description font-semibold text-center text-xl pt-6">{description}</p>}
        {showSauceOptions && (
          <div className="modal-options">
            <h3 className="text-2xl font-semibold text-center pb-6">{t("modal.chooseSauce", ":בחר רוטב")}</h3>
            <div className="flex flex-col gap-3 items-end">
              {sauceOptions.map((option, index) => (
                <div key={option.value} className="checkbox-wrapper-30 checkbox-container w-full justify-end">
                  <span className="checkbox">
                    <input
                      type="radio"
                      id={`sauce-option-${index}-${_id || title}`}
                      name={`sauce-choice-${_id || title}`}
                      value={option.value}
                      checked={sauceChoice === option.value}
                      onChange={() => setSauceChoice(option.value)}
                    />
                    <svg>
                      <use xlinkHref="#checkbox-30" className="checkbox"></use>
                    </svg>
                  </span>
                  <label htmlFor={`sauce-option-${index}-${_id || title}`} className="checkbox-label pl-2 text-right">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
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
        <div className="modal-footer sticky bottom-0 bg-white py-4 px-6 shadow-inner flex items-center justify-between gap-4 z-10">
          <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-[#1f3a44] text-orange-400 font-bold w-32">
            <button onClick={() => handleQuantityChange(-1)} className="text-xl">
              −
            </button>
            <span>{quantity}</span>
            <button onClick={() => handleQuantityChange(1)} className="text-xl">
              +
            </button>
          </div>
          <button
            onClick={handleAddToCart}
            className="w-full sm:w-auto flex flex-wrap sm:flex-nowrap items-center justify-center sm:justify-between gap-2 sm:gap-4 px-4 sm:px-6 py-3 border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-all duration-200 rounded-full font-semibold shadow-md text-center text-sm sm:text-base"
          >
            <span>{t("modal.addToCart", "הוספה לעגלה")}</span>
            <span className="font-bold whitespace-nowrap text-lg sm:text-base">₪{(parseFloat(price) * quantity).toFixed(2)}</span>
          </button>
        </div>
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

export default CommentModal;
