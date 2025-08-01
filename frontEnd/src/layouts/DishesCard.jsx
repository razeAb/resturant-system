import React, { useState, useContext } from "react";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import WeightedModal from "../components/modals/WeightModal";
import AlertModal from "../components/common/AlertModal"; // Import AlertModal
import "./DishesCard.css"; // Import the CSS file
import CartContext from "../context/CartContext"; // Import CartContext

const DishesCard = (props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false); // State for AlertModal
  const { addToCart } = useContext(CartContext); // Get the addToCart function from context
  const isActive = props.isActive === true;

  const handleButtonClick = () => {
    console.log("isOrder:", props.isOrder);
    if (props.isOrder === true || props.isOrder === "true") {
      setIsAlertOpen(true); // Show AlertModal
    } else if (props.category === "Meats") {
      setIsModalOpen(true); // Weighted modal
    } else if (props.category === "Sandwiches") {
      setIsModalOpen(true); // Sandwich modal
    } else {
      // Direct add to cart
      const itemToAdd = {
        id: props.id,
        img: props.img,
        category: props.category,
        title: props.title,
        price: props.price,
        quantity: 1,
      };
      addToCart(itemToAdd);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleCloseAlert = () => {
    setIsAlertOpen(false); // Close the AlertModal
  };

  const handleAddToCart = (quantity, selectedOptions) => {
    const itemToAdd = {
      id: props.id,
      img: props.img,
      category: props.category,
      title: props.title,
      price: props.price * quantity, // Multiply the price by the quantity
      quantity,
      selectedOptions, // Include the selected options
    };

    addToCart(itemToAdd); // Add the item to the cart with options and quantity
    setIsModalOpen(false); // Close the modal
  };

  return (
    <div className={`bg-[#ab4c20] rounded-2xl p-3 flex flex-col items-center text-white relative ${!isActive ? "opacity-50" : ""}`}>
      <img src={props.img} alt={props.title} className="rounded-full w-24 h-24 object-cover -mt-12 mb-2" />

      <div className="space-y-1 text-center">
        <h3 className="font-semibold text-sm">{props.title}</h3>
        <p className="text-xs text-[#f5cf9f]">{props.category}</p>
        <p className="font-semibold text-sm">${props.price}</p>
      </div>

      {!isActive && <p className="text-red-500 text-xs mt-1">❌ אזל מהמלאי</p>}

      <button
        disabled={!isActive}
        onClick={handleButtonClick}
        className="mt-3 bg-[#f8b91c] w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-50"
      >
        <i className="fas fa-shopping-bag text-white text-sm"></i>
      </button>

      {/* Modals */}
      {(props.isWeighted || props.category === "Sandwiches" || props.category === "Meats") && (
        <>
          {props.category === "Meats" ? (
            <WeightedModal
              _id={props.id}
              img={props.img}
              title={props.title}
              price={props.price}
              description={props.description}
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              onAddToCart={handleAddToCart}
            />
          ) : props.category === "Sandwiches" ? (
            <Modal
              _id={props.id}
              img={props.img}
              title={props.title}
              price={props.price}
              description={props.description}
              options={props.options}
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              onAddToCart={handleAddToCart}
            />
          ) : null}
        </>
      )}

      <AlertModal isOpen={isAlertOpen} onClose={handleCloseAlert} />
    </div>
  );
};

export default DishesCard;
