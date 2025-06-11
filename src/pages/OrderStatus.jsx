import React, { useState } from "react";
import axios from "axios";
import CartNavbar from "../components/cart/CartNavbar";

const OrderStatus = () => {
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setOrder(null);

    try {
      const res = await axios.get(`/api/orders/phone/${phone}`);
      setOrder(res.data);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setError("לא נמצאה הזמנה עבור מספר זה.");
      } else {
        setError("שגיאה בקבלת פרטי ההזמנה.");
      }
    }
  };

  return (
    <>
      <CartNavbar />
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-md text-center">
          <h2 className="text-2xl font-semibold mb-6">בדיקת הזמנה</h2>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <input
            type="text"
            placeholder="מספר טלפון"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded mb-4"
            required
          />
          <button type="submit" className="bg-black text-white w-full py-2 rounded hover:bg-gray-800">
            בדיקה
          </button>
          {order && (
            <div className="mt-6 text-right">
              <p>סטטוס: {order.status}</p>
              <p>מספר הזמנה: {order._id.slice(-6)}</p>
            </div>
          )}
        </form>
      </div>
    </>
  );
};

export default OrderStatus;
