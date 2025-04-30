import React, { useContext, useState } from "react";
import CartContext from "../../context/CartContext";
import "../common/Modal.css";
import Button from "../common/Button"; // ✅

const Modal = ({ _id, img, title, price, description, options, isOpen, onClose, onAddToCart }) => {
  const [selectedGrams, setSelectedGrams] = useState(200); // Default quantity is 200 grams
  const [selectedOptions, setSelectedOptions] = useState({
    vegetables: [],
    additions: [],
  });

  const { addToCart } = useContext(CartContext); // Access addToCart function from CartContext

  const [comment, setComment] = useState(""); // Initial comment is an empty string

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

  // Extract the numeric price from the addition string
  const getPrice = (addition) => {
    const priceMatch = addition.match(/(\d+)/); // Extract number from string
    return priceMatch ? parseFloat(priceMatch[1]) : 0; // Return price as float
  };

  // Handle addition selection
  const handleAdditionChange = (addition) => {
    const additionPrice = getPrice(addition);

    setSelectedOptions((prev) => ({
      ...prev,
      additions: prev.additions.some((item) => item.addition === addition)
        ? prev.additions.filter((item) => item.addition !== addition) // Remove if deselected
        : [...prev.additions, { addition, price: additionPrice }], // Add the new addition
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
      price: parseFloat(price),
      quantity,
      isWeighted: true,
      selectedOptions,
      comment,
      totalPrice: parseFloat(totalPrice),
    };

    addToCart(itemToAdd); // Add the item to the cart via context
    setComment(""); // Clear the comment
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

        {/* Dropdown for selecting quantity in grams */}
        <div className="modal-options text-center">
          <h3 className="text-2xl font-semibold pb-10">:כמות (בגרמים)</h3>
          <select
            className="modal-dropdown mx-auto block"
            value={selectedGrams}
            onChange={(e) => setSelectedGrams(parseInt(e.target.value))}
          >
            {[200, 300, 400, 500, 600, 700, 800, 900, 1000].map((grams) => (
              <option key={grams} value={grams}>
                {grams} גרם
              </option>
            ))}
          </select>
        </div>

        {/* Options for Vegetables */}
        <div className="modal-options">
          <h3 className="text-2xl font-semibold text-center pb-10">:ירקות בצד למנה</h3>
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

        {/* Options for Additions */}
        <div className="modal-options">
          <h3 className="text-2xl font-semibold text-center pb-10">:תוספת למנה רגילה</h3>
          {["רוטב גבינה בצד 8", "פטריות 5", "ג׳בטה 5"].map((addition, index) => (
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
            </div>
          ))}

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
