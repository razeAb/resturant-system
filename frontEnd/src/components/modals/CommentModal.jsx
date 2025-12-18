import React, { useContext, useState } from "react";
import CartContext from "../../context/CartContext";
import "../common/Modal.css";

const CommentModal = ({ _id, img, title, price, description, isOpen, onClose, onAddToCart }) => {
  const { addToCart } = useContext(CartContext);
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState("");

  if (!isOpen) return null;

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleAddToCart = () => {
    const totalPrice = parseFloat(price) * quantity;
    const itemToAdd = {
      _id,
      id: `${title}-${Math.random().toString(36).substring(7)}`,
      img,
      title,
      price: parseFloat(price),
      quantity,
      isWeighted: false,
      selectedOptions: {},
      comment,
      totalPrice: parseFloat(totalPrice),
    };
    const targetAdd = onAddToCart || addToCart;
    targetAdd(itemToAdd);
    setComment("");
    setQuantity(1);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>
          &times;
        </button>
        <img src={img} alt={title} className="modal-img" />
        <h2 className="font-semibold text-center text-xl pt-8">{title}</h2>
        {description && <p className="modal-description font-semibold text-center text-xl pt-6">{description}</p>}
        <div className="modal-comment">
          <h3 className="text-2xl font-semibold text-center pb-10">:הוסף הערה</h3>
          <textarea
            placeholder="הוסף הערה (לא חובה)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              direction: "rtl",
              textAlign: "right",
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
            <span>הוספה לעגלה</span>
            <span className="font-bold whitespace-nowrap text-lg sm:text-base">₪{(parseFloat(price) * quantity).toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;
