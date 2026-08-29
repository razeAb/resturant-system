import React, { useContext, useEffect, useState } from "react";
import CartContext from "../../context/CartContext";
import "../common/Modal.css";
import { useLang } from "../../context/LangContext";

const FixedItemModal = ({ _id, img, title, price, description, isOpen, onClose, onAddToCart, name_en, name_he }) => {
  const { addToCart } = useContext(CartContext);
  const { t } = useLang();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!isOpen) return;
    setQuantity(1);
  }, [isOpen, _id]);

  if (!isOpen) return null;

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleAddToCart = () => {
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
      selectedOptions: {},
      totalPrice: parseFloat(price) * quantity,
    };
    const targetAdd = onAddToCart || addToCart;
    targetAdd(itemToAdd);
    setQuantity(1);
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
      </div>
    </div>
  );
};

export default FixedItemModal;
