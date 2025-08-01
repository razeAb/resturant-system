import React, { useState, useContext } from "react";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import WeightedModal from "../components/modals/WeightModal";
import CommentModal from "../components/modals/CommentModal";
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
    } else if (props.category === "Starters") {
      setIsModalOpen(true); // Salad/comment modal
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
    <div className={`w-full lg:w-1/4 p-5 shadow-[rgba(0,_0,_0,_0.24)_0px_3px_8px] ${!isActive ? "inactive-card" : ""} `}>
      <img className="rounded-xl" src={props.img} alt={props.title} />
      <div className="space-y-4">
        <h3 className="font-semibold text-center text-xl pt-6">{props.title}</h3>
        {!isActive && <p className="text-red-600 text-center text-sm font-semibold">❌ אזל מהמלאי</p>}

        <div className="flex flex-row justify-center"></div>
        <div className="flex flex-col items-center justify-center gap-2">
          {" "}
          <h3 className="font-semibold text-lg">{props.price} ILS</h3>
          <Button disabled={!isActive} title="הוספה לעגלה" onClick={handleButtonClick} />
        </div>
      </div>

      {/* Conditionally render the modal based on props.modalType */}
      {(props.isWeighted || props.category === "Sandwiches" || props.category === "Meats" || props.category === "Starters") && (
        <>
          {props.category === "Meats" ? (
            <WeightedModal
              _id={props.id} // ⬅️ חשוב
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
              _id={props.id} // ⬅️ חשוב
              img={props.img}
              title={props.title}
              price={props.price}
              description={props.description}
              options={props.options}
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              onAddToCart={handleAddToCart}
            />
          ) : props.category === "Starters" ? (
            <CommentModal
              _id={props.id}
              img={props.img}
              title={props.title}
              price={props.price}
              description={props.description}
              isOpen={isModalOpen}
              onClose={handleCloseModal}
            />
          ) : null}
        </>
      )}

      {/* Render the AlertModal */}
      <AlertModal isOpen={isAlertOpen} onClose={handleCloseAlert} />
    </div>
  );
};

export default DishesCard;
