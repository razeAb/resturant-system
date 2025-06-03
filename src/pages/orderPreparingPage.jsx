import React from "react";
import { useNavigate } from "react-router-dom";

export default function OrderPreparingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-yellow-100 text-center px-4">
      <h1 className="text-3xl font-bold mb-4">🍽️ Your order is being prepared!</h1>
      <p className="text-lg mb-6">Estimated time: 15–45 minutes</p>
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-yellow-500 border-opacity-75 mb-6"></div>
      <button onClick={() => navigate("/")} className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 transition">
        Back to Home
      </button>
    </div>
  );
}
