import React, { useContext, useState } from "react";
import CartContext from "../../context/CartContext";
import "../common/Modal.css";
import Button from "../common/Button";

const Modal = ({ _id, img, title, price, description, options = {}, isOpen, onClose, onAddToCart }) => {
  const [selectedGrams, setSelectedGrams] = useState(200);
  const [selectedOptions, setSelectedOptions] = useState({
    vegetables: [],
    additions: [],
  });
  const [comment, setComment] = useState("");
  const { addToCart } = useContext(CartContext);

  if (!isOpen) return null;

  const handleVegetableChange = (vegetable) => {
    setSelectedOptions((prev) => ({
      ...prev,
      vegetables: prev.vegetables.includes(vegetable)
        ? prev.vegetables.filter((item) => item !== vegetable)
        : [...prev.vegetables, vegetable],
    }));
  };

  const getFixedPrice = (addition) => {
    const fixed = options.additions?.fixed || [];
    const match = fixed.find((item) => item.name === addition);
    return match ? match.price : 0;
  };

  const getGramPrice = (addition, grams) => {
    const gram = options.additions?.grams?.find((g) => g.name === addition);
    return gram?.prices?.[grams] || 0;
  };

  const handleAdditionChange = (addition, grams = null) => {
    setSelectedOptions((prev) => {
      const additionName = grams ? `${addition} (${grams} גרם)` : addition;
      const alreadySelected = prev.additions.some((item) => item.addition === additionName);

      if (alreadySelected) {
        return {
          ...prev,
          additions: prev.additions.filter((item) => item.addition !== additionName),
        };
      } else {
        const updated = grams ? prev.additions.filter((item) => !item.addition.startsWith(addition)) : prev.additions;
        const price = grams ? getGramPrice(addition, grams) : getFixedPrice(addition);
        return {
          ...prev,
          additions: [...updated, { addition: additionName, price }],
        };
      }
    });
  };

  const calculateTotalPrice = () => {
    const additionsTotal = selectedOptions.additions.reduce((total, item) => total + item.price, 0);
    const totalPrice = parseFloat(price) * (selectedGrams / 100) + additionsTotal;
    return Number.isInteger(totalPrice) ? totalPrice : totalPrice.toFixed(2);
  };

  const handleAddToCart = () => {
    const totalPrice = calculateTotalPrice();
    const itemToAdd = {
      _id,
      id: `${title}-${Math.random().toString(36).substring(7)}`,
      img,
      title,
      price: parseFloat(price),
      quantity: selectedGrams,
      isWeighted: true,
      selectedOptions,
      comment,
      totalPrice: parseFloat(totalPrice),
    };

    addToCart(itemToAdd);
    setComment("");
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>
          &times;
        </button>
        <img src={img} alt={title} className="modal-img" />
        <h2 className="font-semibold text-center text-xl pt-6">{title}</h2>
        <p className="modal-description font-semibold text-center text-xl pt-6">{description}</p>

        {/* Vegetables */}
        <div className="modal-options">
          <h3 className="text-2xl font-semibold text-center pb-4">:ירקות בצד למנה</h3>
          {(options.vegetables || []).map((vegetable, index) => (
            <div key={index} className="checkbox-wrapper-30 checkbox-container">
              <span className="checkbox">
                <input type="checkbox" id={`veg-${index}`} onChange={() => handleVegetableChange(vegetable)} />
                <svg>
                  <use xlinkHref="#checkbox-30" className="checkbox" />
                </svg>
              </span>
              <label htmlFor={`veg-${index}`} className="checkbox-label pl-2">
                {vegetable}
              </label>
            </div>
          ))}
        </div>

        {/* Fixed Additions */}
        {options.additions?.fixed?.length > 0 && (
          <div className="modal-options">
            <h3 className="text-2xl font-semibold text-center pb-4">:תוספות</h3>
            {options.additions.fixed.map((item, idx) => (
              <div key={idx} className="checkbox-wrapper-30 checkbox-container">
                <span className="checkbox">
                  <input type="checkbox" id={`fixed-${idx}`} onChange={() => handleAdditionChange(item.name)} />
                  <svg>
                    <use xlinkHref="#checkbox-30" className="checkbox" />
                  </svg>
                </span>
                <label htmlFor={`fixed-${idx}`} className="checkbox-label pl-2">
                  {item.name} (+₪{item.price})
                </label>
              </div>
            ))}
          </div>
        )}

        {/* Gram Additions */}
        {options.additions?.grams?.length > 0 && (
          <div className="modal-options">
            <h3 className="text-2xl font-semibold text-center pb-4">:תוספות לפי גרם</h3>
            {options.additions.grams.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-2">
                <p className="font-semibold text-right">{item.name}</p>
                <div className="flex gap-4">
                  {[50, 100].map((g) => (
                    <label key={g} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        onChange={() => handleAdditionChange(item.name, g)}
                        checked={selectedOptions.additions.some((a) => a.addition === `${item.name} (${g} גרם)`)}
                      />
                      <span>
                        {g} גרם (+₪{item.prices[g]})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comment Section */}
        <div className="modal-comment">
          <h3 className="text-2xl font-semibold text-center pb-4">:הוסף הערה</h3>
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
          />
        </div>

        {/* Footer: Grams and Add to Cart */}
        <div className="modal-footer sticky bottom-0 bg-white py-4 px-4 sm:px-6 shadow-inner flex flex-row items-center justify-between gap-4 z-10 flex-wrap">
          <div className="flex items-center justify-between px-4 py-2 rounded-full bg-[#1f3a44] text-orange-400 font-bold w-full sm:w-40 shadow-md text-xl sm:text-base">
            <button onClick={() => setSelectedGrams((prev) => Math.max(200, prev - 100))} className="text-2xl px-2">
              −
            </button>
            <span className="mx-2">{selectedGrams}g</span>
            <button onClick={() => setSelectedGrams((prev) => Math.min(1000, prev + 100))} className="text-2xl px-2">
              +
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full sm:w-auto flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-all duration-200 rounded-full font-semibold shadow-md text-base sm:text-base"
          >
            <span>הוספה לעגלה</span>
            <span className="font-bold text-2xl sm:text-base whitespace-nowrap">₪{calculateTotalPrice()}</span>
          </button>
        </div>

        {/* SVG Checkbox */}
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
