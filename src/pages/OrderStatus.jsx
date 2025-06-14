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

  const translateStatus = (status) => {
    switch (status) {
      case "preparing":
        return "בהכנה";
      case "delivering":
        return "במשלוח";
      case "done":
        return "הושלם";
      case "pending":
      default:
        return "ממתין לאישור";
    }
  };

  const getStatusStep = (status) => {
    switch (status) {
      case "pending":
        return 1;
      case "preparing":
        return 2;
      case "delivering":
        return 3;
      case "done":
        return 4;
      default:
        return 0;
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
              <p>
                <strong>:מספר הזמנה</strong> <br />
                <span dir="ltr" style={{ display: "inline-block" }}>
                  #{order._id.slice(-6).toUpperCase()}
                </span>
              </p>

              <p className="mt-4">
                <strong>סטטוס:</strong> {translateStatus(order.status)}
              </p>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="w-full bg-gray-300 h-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-700 ease-in-out"
                    style={{
                      width: `${(getStatusStep(order.status) / 4) * 100}%`,
                    }}
                  ></div>
                </div>

                <div className="flex justify-between text-sm mt-1 text-gray-600">
                  <span>ממתין</span>
                  <span>בהכנה</span>
                  <span>במשלוח</span>
                  <span>הושלם</span>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </>
  );
};

export default OrderStatus;
