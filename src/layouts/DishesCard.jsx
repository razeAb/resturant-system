import React, { useState, useContext } from "react";
import Button from "./Button";
import Modal from "../components/Modal"; // Default modal
import WeightedModal from "../components/WeightModal"; // Import WeightedModal
import AlertModal from "../components/AlertModal"; // Import AlertModal
import "../layouts/DishesCard.css"; // Import the CSS file
import CartContext from "../context/CartContext"; // Import CartContext

const DishesCard = (props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false); // State for AlertModal
  const { addToCart } = useContext(CartContext); // Get the addToCart function from context

  const handleButtonClick = () => {
    if (props.id === "8" || props.id === "9") {
      setIsAlertOpen(true); // Open the AlertModal for items that require a day-before order
    } else if (props.toggleOptions) {
      setIsModalOpen(true); // Open the modal for items with options
    } else {
      // For items without options, simply log or handle the action as before
      console.log(`Added ${props.title} to cart.`);
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
      title: props.title,
      price: props.price * quantity, // Multiply the price by the quantity
      quantity,
      selectedOptions, // Include the selected options
    };

    addToCart(itemToAdd); // Add the item to the cart with options and quantity
    setIsModalOpen(false); // Close the modal
  };

  return (
    <div className="w-full lg:w-1/4 p-5 shadow-[rgba(0,_0,_0,_0.24)_0px_3px_8px] rounded-lg">
      <img className="rounded-xl" src={props.img} alt={props.title} />
      <div className="space-y-4">
        <h3 className="font-semibold text-center text-xl pt-6">{props.title}</h3>
        <div className="flex flex-row justify-center"></div>
        <div className="flex flex-row items-center justify-center gap-4">
          <h3 className="font-semibold text-lg">{props.price} ILS</h3>
          <Button title="הוספה לעגלה" onClick={handleButtonClick} />
        </div>
      </div>

      {/* Conditionally render the modal based on props.modalType */}
      {props.toggleOptions && (
        <>
          {props.modalType === "weighted" ? (
            <WeightedModal
              img={props.img}
              title={props.title}
              price={props.price}
              description={props.description}
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              onAddToCart={handleAddToCart}
            />
          ) : (
            <Modal
              img={props.img}
              title={props.title}
              price={props.price}
              description={props.description}
              options={props.options}
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              onAddToCart={handleAddToCart}
            />
          )}
        </>
      )}

      {/* Render the AlertModal */}
      <AlertModal isOpen={isAlertOpen} onClose={handleCloseAlert} />
    </div>
  );
};

export default DishesCard;
