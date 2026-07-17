import React from "react";

const ImageModal = ({ isOpen, img, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="relative w-11/12 max-w-md px-4" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-0 right-0 mt-2 mr-2 text-white text-3xl font-bold" onClick={onClose}>
          &times;
        </button>
        <img src={img} alt="preview" className="w-full h-auto rounded-lg" />
      </div>
    </div>
  );
};

export default ImageModal;
