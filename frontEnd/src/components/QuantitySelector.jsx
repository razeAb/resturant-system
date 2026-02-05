import { useEffect, useState } from "react";
import { Plus, Minus } from "lucide-react";
import { motion } from "framer-motion";

export function QuantitySelector({
  quantity,
  initialQuantity = 1,
  minQuantity = 1,
  maxQuantity = 99,
  label = "Quantity",
  size = "md",
  variant = "default",
  onChange,
}) {
  const isSmall = size === "sm";
  const isCart = variant === "cart";
  const [internalQuantity, setInternalQuantity] = useState(initialQuantity);
  const currentQuantity = quantity ?? internalQuantity;

  useEffect(() => {
    if (quantity !== undefined) {
      setInternalQuantity(quantity);
    }
  }, [quantity]);

  useEffect(() => {
    if (quantity === undefined) {
      setInternalQuantity(initialQuantity);
    }
  }, [initialQuantity, quantity]);

  const handleIncrement = () => {
    if (currentQuantity < maxQuantity) {
      const newQuantity = currentQuantity + 1;
      setInternalQuantity(newQuantity);
      onChange?.(newQuantity);
    }
  };

  const handleDecrement = () => {
    if (currentQuantity > minQuantity) {
      const newQuantity = currentQuantity - 1;
      setInternalQuantity(newQuantity);
      onChange?.(newQuantity);
    }
  };

  return (
    <div
      className={`quantity-selector inline-flex items-center rounded-2xl border shadow-lg ${
        isCart ? "border-slate-200 bg-white" : "border-slate-200/50 bg-gradient-to-br from-slate-50 to-slate-100"
      } ${isSmall ? "gap-3 px-4 py-2" : "gap-4 px-6 py-4"}`}
    >
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleDecrement}
        disabled={currentQuantity <= minQuantity}
        className={`quantity-selector-btn group flex items-center justify-center rounded-full shadow-md transition-all duration-200 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-md disabled:hover:scale-100 ${
          isCart ? "bg-slate-800 hover:bg-slate-900" : "bg-white"
        } ${isSmall ? "h-8 w-8" : "h-12 w-12"}`}
      >
        <Minus
          className={`transition-colors ${isCart ? "text-white group-hover:text-white" : "text-slate-600 group-hover:text-red-500"} ${
            isSmall ? "h-4 w-4" : "h-5 w-5"
          }`}
        />
      </motion.button>

      <motion.div
        key={currentQuantity}
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`text-center ${isSmall ? "min-w-[2.5rem]" : "min-w-[4rem]"}`}
      >
        <div
          className={`font-bold ${isCart ? "text-slate-900" : "bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent"} ${
            isSmall ? "text-2xl" : "text-4xl"
          }`}
        >
          {currentQuantity}
        </div>
        <div className={`text-slate-500 ${isSmall ? "text-[10px]" : "mt-1 text-xs"}`}>{label}</div>
      </motion.div>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleIncrement}
        disabled={currentQuantity >= maxQuantity}
        className={`quantity-selector-btn flex items-center justify-center rounded-full shadow-md transition-all duration-200 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-md disabled:hover:scale-100 ${
          isCart ? "bg-blue-600 hover:bg-blue-700" : "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
        } ${isSmall ? "h-8 w-8" : "h-12 w-12"}`}
      >
        <Plus className={`${isSmall ? "h-4 w-4" : "h-5 w-5"} text-white`} />
      </motion.button>
    </div>
  );
}
