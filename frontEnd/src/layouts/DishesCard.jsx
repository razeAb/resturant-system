import React, { useState, useContext } from "react";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import WeightedModal from "../components/modals/WeightModal";
import CommentModal from "../components/modals/CommentModal";
import PortionSizeModal from "../components/modals/PortionSizeModal";
import AlertModal from "../components/common/AlertModal"; // Import AlertModal
import "./DishesCard.css"; // Import the CSS file
import CartContext from "../context/CartContext"; // Import CartContext
import ImageModal from "../components/common/ImageModal";

const DishesCard = (props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false); // State for AlertModal
  const { addToCart } = useContext(CartContext); // Get the addToCart function from context
  const isActive = props.isActive === true;
  const normalizedTitle = (props.title || "").toLowerCase();
  const normalizedNameEn = (props.name_en || "").toLowerCase();
  const normalizedNameHe = props.name_he || "";
  const normalizedTitlePlain = normalizedTitle.replace(/\s+/g, " ").trim();
  const normalizedNameHePlain = normalizedNameHe.replace(/\s+/g, " ").trim();
  const wingsNameRegex = /כנפ[יים]*\s+מעוש/i;
  const isWingsMeal =
    normalizedTitle.includes("wings") ||
    normalizedNameEn.includes("wings") ||
    normalizedTitle.includes("wing") ||
    normalizedNameEn.includes("wing") ||
    normalizedTitle.includes("כנפ") ||
    normalizedNameHe.includes("כנפ") ||
    wingsNameRegex.test(normalizedTitlePlain) ||
    wingsNameRegex.test(normalizedNameHePlain);

  const isWeightedCategory = props.category === "Meats" || props.category === "premium Meat" || props.category === "Weighted Meat";
  const isSideCategory = (props.category || "").toLowerCase().includes("side");
  const hasPortionOptions = Array.isArray(props.portionOptions) && props.portionOptions.length > 0;
  const riceRegex = /rice|אורז/i;
  const isRiceSide = isSideCategory && [props.title, props.name_en, props.name_he].some((value) => riceRegex.test(String(value || "")));
  const fallbackRicePortions = isRiceSide
    ? [
        { label_he: "אישי", label_en: "Personal", price: 13 },
        { label_he: "זוגי", label_en: "Couple", price: 25 },
        { label_he: "מגש משפחתי", label_en: "Family tray", price: 45 },
      ]
    : null;
  const effectivePortionOptions = hasPortionOptions ? props.portionOptions : fallbackRicePortions;
  const hasSidePortions = isSideCategory && Array.isArray(effectivePortionOptions) && effectivePortionOptions.length > 0;

  const handleButtonClick = () => {
    console.log("isOrder:", props.isOrder);
    if (props.isOrder === true || props.isOrder === "true") {
      setIsAlertOpen(true); // Show AlertModal
    } else if (isWingsMeal) {
      setIsModalOpen(true); // Wings/comment modal
    } else if (isWeightedCategory) {
      setIsModalOpen(true); // Weighted modal
    } else if (hasSidePortions) {
      setIsModalOpen(true); // Side portion size modal
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
        name_en: props.name_en,
        name_he: props.name_he,
        price: props.price,
        quantity: 1,
        isWeighted: false,
        selectedOptions: {},
        totalPrice: Number(props.price) || 0,
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

  const handleAddToCart = (itemOrQuantity, selectedOptions) => {
    if (itemOrQuantity && typeof itemOrQuantity === "object") {
      addToCart(itemOrQuantity);
      setIsModalOpen(false);
      return;
    }

    const quantity = Number(itemOrQuantity) || 1;
    const itemToAdd = {
      id: props.id,
      img: props.img,
      category: props.category,
      title: props.title,
      name_en: props.name_en,
      name_he: props.name_he,
      price: props.price,
      quantity,
      isWeighted: false,
      selectedOptions: selectedOptions || {},
      totalPrice: (Number(props.price) || 0) * quantity,
    };

    addToCart(itemToAdd);
    setIsModalOpen(false);
  };

  return (
    <div className={`w-full lg:w-1/4 p-5 shadow-[rgba(0,_0,_0,_0.24)_0px_3px_8px] ${!isActive ? "inactive-card" : ""} `}>
      <img className="rounded-xl cursor-pointer" src={props.img} alt={props.title} onClick={() => setIsImageOpen(true)} />{" "}
      <div className="space-y-4">
        <h3 className="font-semibold text-center text-xl pt-6">{props.title}</h3>
        {!isActive && <p className="text-red-600 text-center text-sm font-semibold">❌ אזל מהמלאי</p>}
        {props.description && <p className="text-center text-sm text-gray-600">{props.description}</p>}
        <div className="flex flex-row justify-center"></div>
        <div className="flex flex-col items-center justify-center gap-2">
          {" "}
<h3 className="font-semibold text-lg" dir="rtl">
  ₪ {props.price}
</h3>
          <Button disabled={!isActive} title="הוספה לעגלה" onClick={handleButtonClick} />
        </div>
      </div>
      {/* Conditionally render the modal based on props.modalType */}
      {(props.isWeighted || props.category === "Sandwiches" || isWeightedCategory || props.category === "Starters" || isWingsMeal || hasSidePortions) && (
        <>
          {isWingsMeal ? (
            <CommentModal
              _id={props.id}
              img={props.img}
              title={props.title}
              name_en={props.name_en}
              name_he={props.name_he}
              price={props.price}
              description={props.description}
              isWingsMeal={isWingsMeal}
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              onAddToCart={handleAddToCart}
            />
          ) : hasSidePortions ? (
            <PortionSizeModal
              _id={props.id}
              img={props.img}
              title={props.title}
              name_en={props.name_en}
              name_he={props.name_he}
              description={props.description}
              portionOptions={effectivePortionOptions}
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              onAddToCart={handleAddToCart}
            />
          ) : isWeightedCategory ? (
            <WeightedModal
              _id={props.id} // ⬅️ חשוב
              img={props.img}
              title={props.title}
              name_en={props.name_en}
              name_he={props.name_he}
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
              name_en={props.name_en}
              name_he={props.name_he}
              price={props.price}
              fullSandwichPrice={props.fullSandwichPrice}
              extraPattyPrice={props.extraPattyPrice}
              description={props.description}
              options={props.options}
              category={props.category}
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              onAddToCart={handleAddToCart}
            />
          ) : props.category === "Starters" ? (
            <CommentModal
              _id={props.id}
              img={props.img}
              title={props.title}
              name_en={props.name_en}
              name_he={props.name_he}
              price={props.price}
              description={props.description}
              isWingsMeal={isWingsMeal}
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              onAddToCart={handleAddToCart}
            />
          ) : null}
        </>
      )}
      {/* Render the AlertModal */}
      <AlertModal isOpen={isAlertOpen} onClose={handleCloseAlert} />
      {/* Render full screen image modal */}
      <ImageModal isOpen={isImageOpen} img={props.img} onClose={() => setIsImageOpen(false)} />
    </div>
  );
};

export default DishesCard;
