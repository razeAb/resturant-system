import React, { useContext, useMemo, useState } from "react";
import CartContext from "../../context/CartContext";
import "../common/Modal.css";
import { useLang } from "../../context/LangContext";

const resolvePortionLabel = (option, lang) => {
  const he = String(option?.label_he || "").trim();
  const en = String(option?.label_en || "").trim();
  if (lang === "en") return en || he;
  return he || en;
};

const PortionSizeModal = ({ _id, img, title, description, isOpen, onClose, onAddToCart, name_en, name_he, portionOptions }) => {
  const { addToCart } = useContext(CartContext);
  const { t, lang } = useLang();
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState("");

  const options = useMemo(() => {
    if (!Array.isArray(portionOptions)) return [];
    return portionOptions
      .map((opt) => ({
        label: resolvePortionLabel(opt, lang),
        price: Number(opt?.price) || 0,
      }))
      .filter((opt) => opt.label && opt.price > 0);
  }, [portionOptions, lang]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!isOpen) return null;
  if (!options.length) return null;

  const selected = options[Math.min(selectedIndex, options.length - 1)] || options[0];
  const unitPrice = Number(selected?.price) || 0;
  const totalPrice = unitPrice * quantity;

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleAddToCart = () => {
    const sizeLabel = selected?.label || "";
    const sizeAddition = { addition: `🍽️ ${t("modal.portionSize", "גודל מנה")}: ${sizeLabel}`, price: 0, portion: true };

    const itemToAdd = {
      _id,
      id: `${title}-${Math.random().toString(36).substring(7)}`,
      img,
      title,
      name_en,
      name_he,
      price: unitPrice,
      quantity,
      isWeighted: false,
      selectedOptions: { additions: [sizeAddition] },
      comment,
      totalPrice,
    };

    const targetAdd = onAddToCart || addToCart;
    targetAdd(itemToAdd);
    setComment("");
    setQuantity(1);
    setSelectedIndex(0);
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

        <div className="modal-options">
          <h3 className="text-2xl font-semibold text-center pb-6">{t("modal.portionSize", "גודל מנה")}</h3>
          <div className="flex flex-col gap-3 items-start">
            {options.map((option, index) => (
              <div key={`${option.label}-${index}`} className="checkbox-wrapper-30 checkbox-container w-full">
                <span className="checkbox">
                  <input
                    type="radio"
                    id={`portion-size-${index}-${_id || title}`}
                    name={`portion-size-${_id || title}`}
                    value={index}
                    checked={selectedIndex === index}
                    onChange={() => setSelectedIndex(index)}
                  />
                  <svg>
                    <use xlinkHref="#checkbox-30" className="checkbox"></use>
                  </svg>
                </span>
                <label htmlFor={`portion-size-${index}-${_id || title}`} className="checkbox-label pl-2">
                  {option.label}
                  <span className="pl-2 text-sm text-gray-500">₪{option.price}</span>
                </label>
              </div>
            ))}
          </div>
        </div>

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
            <span className="font-bold whitespace-nowrap text-lg sm:text-base">
              ₪{Number.isInteger(totalPrice) ? totalPrice : totalPrice.toFixed(2)}
            </span>
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

export default PortionSizeModal;

