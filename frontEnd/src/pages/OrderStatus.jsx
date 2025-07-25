import React, { useState, useEffect } from "react";
import axios from "axios";
import CartNavbar from "../components/cart/CartNavbar";
import hourglassGif from "../assets/hourglass.gif";
import chefGif from "../assets/chef.gif";
import scooterGif from "../assets/delivery-scooter.gif";
import doneGif from "../assets/verified.gif";
import { ORDER_STATUS } from "../../constants/orderStatus";

const OrderStatus = () => {
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  // Logs for debugging
  useEffect(() => {
    console.log("✅ Order updated:", order);
  }, [order]);

  const isDelivery = order?.deliveryOption === "Delivery";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setOrder(null);

    const BASE_URL =  "http://localhost:5001";
    console.log("📡 Using BASE_URL:", BASE_URL);
    console.log("📞 Phone number entered:", phone);
    try {
      const res = await axios.get(`${BASE_URL}/api/orders/phone/${phone}`);
      console.log("✅ Order fetched from backend:", res.data);
      setOrder(res.data);
    } catch (err) {
      console.error("❌ Error fetching order:", err);
      if (err.response && err.response.status === 404) {
        setError("לא נמצאה הזמנה עבור מספר זה.");
      } else {
        setError("שגיאה בקבלת פרטי ההזמנה.");
      }
    }
  };

  const translateStatus = (status) => {
    switch (status?.toLowerCase()) {
      case ORDER_STATUS.PREPARING:
        return "בהכנה";
      case ORDER_STATUS.DELIVERING:
        return "במשלוח";
      case ORDER_STATUS.DONE:
        return "הושלם";
      case ORDER_STATUS.PENDING:
      default:
        return "ממתין לאישור";
    }
  };

  const getStatusStep = (status) => {
    if (!status) return 0;
    const normalized = status.toLowerCase();
    const orderStages = isDelivery ? ["pending", "preparing", "delivering", "done"] : ["pending", "preparing", "done"];
    const idx = orderStages.indexOf(normalized);
    return idx === -1 ? 0 : idx + 1;
  };

  const steps = [
    { label: "ממתין", gif: hourglassGif },
    { label: "בהכנה", gif: chefGif },
  ];

  if (isDelivery) steps.push({ label: "במשלוח", gif: scooterGif });

  steps.push({ label: "הושלם", gif: doneGif });

  const finalPrice = order && order.totalPrice ? order.totalPrice + (isDelivery ? 20 : 0) : 0;

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
                  #{order?._id?.slice(-6)?.toUpperCase?.() || "XXXXXX"}
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
                      width: `${(getStatusStep(order.status) / steps.length) * 100}%`,
                    }}
                  ></div>
                </div>

                <div className="flex justify-between text-sm mt-3 text-gray-600">
                  {steps.map((step, index) => {
                    const currentStep = getStatusStep(order.status);
                    const isCurrentStep = currentStep === index + 1;

                    return (
                      <div
                        key={step.label}
                        className={`flex-1 flex flex-col items-center ${isCurrentStep ? "text-green-700 font-semibold" : ""}`}
                      >
                        {isCurrentStep ? (
                          <img src={step.gif} alt={step.label} className="w-8 h-8 mb-1" />
                        ) : (
                          <div className="w-8 h-8 mb-1 rounded-full bg-gray-300 border border-gray-400" />
                        )}
                        <span>{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Details */}
              <div className="mt-6">
                <h4 className="text-lg font-bold">פרטי הזמנה</h4>
                <ul className="text-sm space-y-2">
                  {Array.isArray(order.items) && order.items.length > 0 ? (
                    order.items.map((item, idx) => (
                      <li key={idx}>
                        <strong>{item.product?.name || item.title || "פריט לא ידוע"}</strong> - כמות: {item.quantity}{" "}
                        {item.isWeighted ? "גרם" : ""}
                        <br />
                        ירקות: {Array.isArray(item.vegetables) && item.vegetables.length ? item.vegetables.join(", ") : "אין"}
                        <br />
                        תוספות:{" "}
                        {Array.isArray(item.additions) && item.additions.length
                          ? item.additions
                              .map((a) => (typeof a === "string" ? a : a.addition || ""))
                              .filter((v) => v)
                              .join(", ")
                          : "אין"}
                        <br />
                        הערות: {item.comment || "אין הערות"}
                      </li>
                    ))
                  ) : (
                    <li>לא נמצאו פריטים בהזמנה</li>
                  )}
                </ul>
                <p className="mt-4">
                  <strong>סכום לתשלום:</strong> {finalPrice} ₪
                </p>
              </div>
            </div>
          )}
        </form>
      </div>
    </>
  );
};

export default OrderStatus;
