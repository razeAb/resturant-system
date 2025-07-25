import React, { useContext, useState } from "react";
import CartContext from "../../context/CartContext";
import "./Modal.css"; // Ensure this includes your existing modal and checkbox styles
import Button from "./Button"; // ✅ correct

const Modal = ({ _id, img, title, price, description, options, isOpen, onClose, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState({
    vegetables: [],
    additions: [],
  });

  const { addToCart } = useContext(CartContext); // Access addToCart function
  const [comment, setComment] = useState("");

  if (!isOpen) return null;

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

  const getPrice = (addition) => {
    const fixed = options?.additions?.fixed || [];
    const match = fixed.find((item) => item.name === addition);
    return match ? match.price : 0;
  };

  const handleAdditionChange = (addition, grams = null) => {
    setSelectedOptions((prev) => {
      const additionName = grams ? `${addition} (${grams} גרם)` : addition;

      const alreadySelected = prev.additions.some((item) => item.addition === additionName);

      if (alreadySelected) {
        // Toggle off: remove same selection
        return {
          ...prev,
          additions: prev.additions.filter((item) => item.addition !== additionName),
        };
      } else {
        // Remove any other variant of the same meat
        const updatedAdditions = prev.additions.filter((item) => !item.addition.startsWith(addition));

        return {
          ...prev,
          additions: [
            ...updatedAdditions,
            {
              addition: additionName,
              price: grams === 50 ? 13 : grams === 100 ? 26 : getPrice(addition),
            },
          ],
        };
      }
    });
  };

  const calculateTotalPrice = () => {
    const additionsTotal = selectedOptions.additions.reduce((total, item) => total + item.price, 0);
    const totalPrice = parseFloat(price) * quantity + additionsTotal;
    return Number.isInteger(totalPrice) ? totalPrice : parseFloat(totalPrice.toFixed(2));
  };
  const handleAddToCart = () => {
    // Calculate the total price for one unit of the item (including additions)
    const totalPrice = calculateTotalPrice();

    const itemToAdd = {
      _id, // מזהה אמיתי שנשלח לבקנד
      id: `${title}-${Math.random().toString(36).substring(7)}`, // מזהה ייחודי פנימי לעגלה
      img,
      title,
      price: parseFloat(price),
      quantity,
      isWeighted: false,
      selectedOptions,
      comment,
      totalPrice: parseFloat(totalPrice),
    };
    console.log("Adding to cart:", itemToAdd); // Debug log
    addToCart(itemToAdd); // Add to cart via context

    //reset modal state
    setQuantity(1);
    setSelectedOptions({
      vegetables: [],
      additions: [],
    });
    setComment(""); // Clear the comment
    onClose(); // Close the modal
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>
          &times;
        </button>
        <img src={img} alt={title} className="modal-img" />
        <h2 className="font-semibold text-center text-xl pt-8">{title}</h2>

        {/* Dynamically updated price */}

        <p className="modal-description font-semibold text-center text-xl pt-6">{description}</p>

        {/* Options for Vegetables */}
        {/* Options for Vegetables */}
        <div className="modal-options">
          <h3 className="text-2xl font-semibold text-center pb-10">:ירקות על המנה</h3>
          {(options?.vegetables || []).map((vegetable, index) => (
            <div key={index} className="checkbox-wrapper-30 checkbox-container">
              <span className="checkbox">
                <input type="checkbox" id={`vegetable-option-${index}`} onChange={() => handleVegetableChange(vegetable)} />
                <svg>
                  <use xlinkHref="#checkbox-30" className="checkbox"></use>
                </svg>
              </span>
              <label htmlFor={`vegetable-option-${index}`} className="checkbox-label pl-2">
                {vegetable}
              </label>
            </div>
          ))}
        </div>

        {/* Options for Additions with Buttons */}
        <div className="modal-options">
          <h3 className="text-2xl font-semibold text-center pb-10">:תוספת למנה רגילה</h3>

          {/* Gram-based additions */}
          {(options?.additions?.grams || []).map((addition, index) => (
            <div key={index} className="addition-buttons">
              <span>{addition.name}</span>
              {[50, 100].map((grams) => (
                <button
                  key={grams}
                  className={`gram-button ${
                    selectedOptions.additions.some((item) => item.addition === `${addition.name} (${grams} גרם)`) ? "selected" : ""
                  }`}
                  onClick={() => handleAdditionChange(addition.name, grams)}
                >
                  {grams} גרם
                </button>
              ))}
            </div>
          ))}
          {/* Fixed-price additions */}
          {(options?.additions?.fixed || []).map((addition, index) => (
            <div key={index} className="checkbox-wrapper-30 checkbox-container">
              <span className="checkbox">
                <input
                  type="checkbox"
                  id={`addition-option-${index}`}
                  onChange={() => handleAdditionChange(addition.name)}
                  checked={selectedOptions.additions.some((item) => item.addition === addition.name)}
                />
                <svg>
                  <use xlinkHref="#checkbox-30" className="checkbox"></use>
                </svg>
              </span>
              <label htmlFor={`addition-option-${index}`} className="checkbox-label pl-2">
                {addition.name} {addition.price}₪
              </label>
            </div>
          ))}
        </div>

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

          {/* Add to Cart Button with Price */}
          <button
            onClick={handleAddToCart}
            className="w-full sm:w-auto flex flex-wrap sm:flex-nowrap items-center justify-center sm:justify-between gap-2 sm:gap-4 px-4 sm:px-6 py-3 border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-all duration-200 rounded-full font-semibold shadow-md text-center text-sm sm:text-base"
          >
            <span>הוספה לעגלה</span>
            <span className="font-bold whitespace-nowrap text-lg sm:text-base">₪{calculateTotalPrice()}</span>
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
