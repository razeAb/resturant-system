import React from "react";

const ProductCard = ({
  image,
  title,
  category,
  subcategory,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
  return (
    <div className="relative w-[190px] bg-[#1a1c24] rounded-[20px] pt-16 pb-6 px-6 text-center shadow-md mx-auto">
      {/* Circular Image */}
      <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-[100px] h-[100px] rounded-full overflow-hidden shadow-lg border-4 border-[#0f1015]">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Title */}
      <h3 className="text-sm font-bold text-white leading-snug mb-1 mt-2">
        {title}
      </h3>

      {/* Category */}
      <p className="text-xs mb-5">
        <span className="text-[#40f99b] font-medium">{category}</span>
        <span className="text-[#7d808a] font-normal"> / {subcategory}</span>
      </p>

      {/* Actions */}
      <div className="flex justify-between">
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onView}
            className="w-8 h-8 flex items-center justify-center bg-[#1d3c34] text-[#40f99b] rounded-md"
          >
            <i className="fas fa-eye text-xs"></i>
          </button>
          <span className="text-[10px] text-white">View</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onEdit}
            className="w-8 h-8 flex items-center justify-center bg-[#3b2323] text-[#f95050] rounded-md"
          >
            <i className="fas fa-pen text-xs"></i>
          </button>
          <span className="text-[10px] text-white">Edit</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onDelete}
            className="w-8 h-8 flex items-center justify-center bg-[#1c2d3a] text-[#3daef9] rounded-md"
          >
            <i className="fas fa-trash text-xs"></i>
          </button>
          <span className="text-[10px] text-white">Delete</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onDuplicate}
            className="w-8 h-8 flex items-center justify-center bg-[#2a2a33] text-[#9e6bff] rounded-md"
          >
            <i className="fas fa-plus text-xs"></i>
          </button>
          <span className="text-[10px] text-white">Duplicate</span>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
