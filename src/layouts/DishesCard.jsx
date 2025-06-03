import React, { useState, useContext } from "react";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import WeightedModal from "../components/modals/WeightModal";
import AlertModal from "../components/common/AlertModal";
import "../layouts/DishesCard.css";
import CartContext from "../context/CartContext";

const DishesCard = (props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const { addToCart } = useContext(CartContext);
  const isActive = props.isActive === true;

  const handleButtonClick = () => {
    if (props.isOrder === true || props.isOrder === "true") {
      setIsAlertOpen(true);
    } else if (props.category === "Meat" || props.category === "Sandwiches") {
      setIsModalOpen(true);
    } else {
      addToCart({
        id: props.id,
        img: props.img,
        category: props.category,
        title: props.title,
        price: props.price,
        quantity: 1,
      });
    }
  };

  const handleCloseModal = () => setIsModalOpen(false);
  const handleCloseAlert = () => setIsAlertOpen(false);

  const handleAddToCart = (quantity, selectedOptions) => {
    addToCart({
      id: props.id,
      img: props.img,
      category: props.category,
      title: props.title,
      price: props.price * quantity,
      quantity,
      selectedOptions,
    });
    setIsModalOpen(false);
  };

  return (
    <div
      className={`w-full lg:w-1/4 p-5 shadow-[rgba(0,_0,_0,_0.24)_0px_3px_8px] min-h-[420px] flex flex-col justify-between ${
        !isActive ? "inactive-card" : ""
      }`}
    >
      {/* Centered image container */}
      <div className="flex items-center justify-center h-[250px]">
        <img className="dish-img" src={props.img} alt={props.title} />
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-center text-xl pt-6">{props.title}</h3>
        {!isActive && <p className="text-red-600 text-center text-sm font-semibold">❌ אזל מהמלאי</p>}

        <div className="flex flex-row items-center justify-center gap-4">
          <h3 className="font-semibold text-lg">{props.price} ILS</h3>
          <Button disabled={!isActive} title="הוספה לעגלה" onClick={handleButtonClick} />
        </div>
      </div>

      {/* Modals */}
      {(props.isWeighted || props.category === "Sandwiches" || props.category === "Meat") && (
        <>
          {props.category === "Meat" ? (
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
          ) : (
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
          )}
        </>
      )}

      <AlertModal isOpen={isAlertOpen} onClose={handleCloseAlert} />
    </div>
  );
};

export default DishesCard;
