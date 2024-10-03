import React, { useContext, useState } from "react";
import CartContext from "../context/CartContext"; // Import the CartContext
import "./Modal.css"; // Ensure this includes your existing modal and checkbox styles
import Button from "../layouts/Button";

const Modal = ({ img, title, price, description, isOpen, onClose }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState({
    vegetables: [],
    additions: [],
  });

  const { addToCart } = useContext(CartContext); // Access addToCart function

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
    const priceMatch = addition.match(/(\d+)/);
    return priceMatch ? parseFloat(priceMatch[1]) : 0;
  };

  // Handle gram adjustment for certain additions (limit to 50g or 100g)
  const handleGramAdjustment = (addition, delta) => {
    setSelectedOptions((prev) => ({
      ...prev,
      additions: prev.additions.map((item) =>
        item.addition === addition
          ? {
              ...item,
              grams: item.grams + delta <= 100 && item.grams + delta >= 50 ? item.grams + delta : item.grams,
            }
          : item
      ),
    }));
  };

  const handleAdditionChange = (addition) => {
    const additionPrice = getPrice(addition);
    const isWeightAddition = addition.includes("50 גרם");

    setSelectedOptions((prev) => ({
      ...prev,
      additions: prev.additions.some((item) => item.addition === addition)
        ? prev.additions.filter((item) => item.addition !== addition)
        : [...prev.additions, { addition, price: additionPrice, grams: isWeightAddition ? 50 : null }],
    }));
  };

  const calculateTotalPrice = () => {
    const additionsTotal = selectedOptions.additions.reduce((total, item) => {
      // Check if grams are 50 or 100 and return corresponding pricing logic
      if (item.grams === 50) {
        return total + 13; // Add 13 for 50 grams
      } else if (item.grams === 100) {
        return total + 26; // Add 26 for 100 grams
      } else {
        return total + item.price; // Default price if no grams
      }
    }, 0);

    const totalPrice = (parseFloat(price) + additionsTotal) * quantity;
    return Number.isInteger(totalPrice) ? totalPrice : totalPrice.toFixed(2);
  };
  const handleAddToCart = () => {
    const totalPrice = calculateTotalPrice();
    const isWeighted = selectedOptions.additions.some((add) => add.grams !== null);

    const itemToAdd = {
      id: `${title}-${Math.random().toString(36).substring(7)}`, // Generate a unique ID
      img,
      title,
      price: parseFloat(price), // base price
      quantity, // quantity of the meal
      selectedOptions, // includes additions and their grams
      totalPrice: parseFloat(totalPrice), // calculated total price
      isWeighted,
    };

    console.log("Adding to cart:", itemToAdd); // Add this to debug
    addToCart(itemToAdd); // Add to cart via context
    onClose(); // Close the modal
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close-button" onClick={onClose}>
          &times;
        </button>
        <img src={img} alt={title} className="modal-img" />
        <h2 className="font-semibold text-center text-xl pt-6">{title}</h2>

        {/* Dynamically updated price */}
        <p className="modal-price text-center">
          {Number.isInteger(calculateTotalPrice()) ? calculateTotalPrice() : calculateTotalPrice().toFixed(2)} ILS
        </p>

        <p className="modal-description font-semibold text-center text-xl pt-6">{description}</p>

        {/* Options for Vegetables */}
        <div className="modal-options">
          <h3 className="text-2xl font-semibold text-center pb-10">:ירקות על המנה</h3>
          {["חסה", "מלפפון חמוץ", "עגבניה", "בצל", "סלט קרוב", "צימצורי"].map((vegetable, index) => (
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

        {/* Options for Additions with Gram Control */}
        <div className="modal-options">
          <h3 className="text-2xl font-semibold text-center pb-10">:תוספת למנה רגילה</h3>
          {[
            "הקפצת בלסמי 5",
            "13 (תוספת 50 גרם) צלי כתף",
            "אונטרייב (תוספת 50 גרם) 13",
            "ביקון טלה  10",
            "אסאדו (תוספת 50 גרם) 15",
            "רוטב גבינה 8",
            "פטריות 5",
            "ג׳בטה 5",
          ].map((addition, index) => (
            <div key={index} className="checkbox-wrapper-30 checkbox-container">
              <span className="checkbox">
                <input type="checkbox" id={`addition-option-${index}`} onChange={() => handleAdditionChange(addition)} />
                <svg>
                  <use xlinkHref="#checkbox-30" className="checkbox"></use>
                </svg>
              </span>
              <label htmlFor={`addition-option-${index}`} className="checkbox-label pl-2">
                {addition}
              </label>

              {/* If addition includes weight, add gram adjustment buttons */}
              {addition.includes("50 גרם") && (
                <div className="gram-adjustment-buttons">
                  {/* Conditionally hide minus button if it's already 50 */}
                  {selectedOptions.additions.find((item) => item.addition === addition)?.grams > 50 && (
                    <button className="gram-button" onClick={() => handleGramAdjustment(addition, -50)}>
                      -
                    </button>
                  )}
                  <span className="gram-display">
                    {selectedOptions.additions.find((item) => item.addition === addition)?.grams || 50} גרם
                  </span>
                  {/* Conditionally hide plus button if it's already 100 */}
                  {selectedOptions.additions.find((item) => item.addition === addition)?.grams < 100 && (
                    <button className="gram-button" onClick={() => handleGramAdjustment(addition, 50)}>
                      +
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="modal-quantity">
          <button className="quantity-button" onClick={() => handleQuantityChange(-1)}>
            -
          </button>
          <span className="quantity-display">{quantity}</span>
          <button className="quantity-button" onClick={() => handleQuantityChange(1)}>
            +
          </button>
        </div>

        <div className="modal-add-button-container">
          <Button title="הוספה לעגלה" className="modal-add-button" onClick={handleAddToCart} />
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
