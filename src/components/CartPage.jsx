import React, { useContext, useState } from "react";
import CartContext from "../context/CartContext"; // Import the Cart Context
import CartNavbar from "./CartNavbar"; // Import the CartNavbar

const CartPage = () => {
  const { cartItems, removeFromCart } = useContext(CartContext); // Use context to get cart data
  const [showOptions, setShowOptions] = useState({}); // Track which item's options are visible
  const [showConfirmationModal, setShowConfirmationModal] = useState(false); // Modal state

  // Toggle options visibility for each item
  const toggleOptions = (id) => {
    setShowOptions((prev) => ({
      ...prev,
      [id]: !prev[id], // Toggle the visibility of the options for the item
    }));
  };

  // Show confirmation modal
  const handleOrderNow = () => {
    setShowConfirmationModal(true); // Show the modal
  };

  // Close the confirmation modal
  const closeModal = () => {
    setShowConfirmationModal(false); // Close the modal
  };

  // Calculate the total price for each item, including addons
  const calculateItemTotal = (item) => {
    // Sum the prices of the selected additions
    const additionsTotal = item.selectedOptions?.additions?.reduce((total, add) => total + add.price, 0) || 0;
    const itemTotal = item.isWeighted
      ? item.price * (item.quantity / 100) + additionsTotal // For weighted items, calculate based on grams
      : item.price * item.quantity + additionsTotal; // For regular items, multiply price by quantity
    return itemTotal.toFixed(2);
  };

  // Create the order details for WhatsApp message
  const getOrderDetailsForWhatsApp = () => {
    return cartItems
      .map((item) => {
        const itemTotalPrice = calculateItemTotal(item);

        const vegetables = item.selectedOptions?.vegetables?.join(", ") || "אין";
        const additions = item.selectedOptions?.additions?.map((add) => `${add.addition} (${add.price} ILS)`).join(", ") || "אין";

        return `
          מוצר: ${item.title}
          כמות: ${item.isWeighted ? item.quantity + " גרם" : item.quantity}
          ירקות: ${vegetables}
          תוספות: ${additions}
          מחיר ליחידה: ${item.price} ILS
          מחיר סופי: ${itemTotalPrice} ILS
        `.trim();
      })
      .join("\n\n");
  };

  // Send the order details to WhatsApp
  const sendWhatsAppOrder = () => {
    const orderDetails = getOrderDetailsForWhatsApp();
    const totalPrice = cartItems
      .reduce((total, item) => {
        const itemTotalPrice = parseFloat(calculateItemTotal(item));
        return total + itemTotalPrice;
      }, 0)
      .toFixed(2);

    const message = `פרטי הזמנה:\n\n${orderDetails}\n\nסה"כ: ${totalPrice} ILS`;
    const whatsappUrl = `https://wa.me/+972507203099?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  // If the cart is empty, show an empty cart message
  if (cartItems.length === 0) {
    return (
      <>
        <CartNavbar /> {/* Include the Cart-specific navbar */}
        <div style={{ padding: "20px" }}>
          <h2>העגלה שלך ריקה</h2>
        </div>
      </>
    );
  }

  return (
    <>
      <CartNavbar /> {/* Include the Cart-specific navbar */}
      <div style={{ padding: "20px" }}>
        <h2>העגלה שלך</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #ccc" }}>
              <th style={{ textAlign: "left", padding: "10px" }}>תמונה</th>
              <th style={{ textAlign: "left", padding: "10px" }}>שם מוצר</th>
              <th style={{ textAlign: "left", padding: "10px" }}>כמות</th>
              <th style={{ textAlign: "left", padding: "10px" }}>ירקות</th>
              <th style={{ textAlign: "left", padding: "10px" }}>תוספות</th>
              <th style={{ textAlign: "left", padding: "10px" }}>מחיר ליחידה</th>
              <th style={{ textAlign: "left", padding: "10px" }}>מחיר סופי</th>
              <th style={{ textAlign: "left", padding: "10px" }}>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {cartItems.map((item, index) => {
              const itemTotalPrice = calculateItemTotal(item);
              const vegetables = item.selectedOptions?.vegetables?.join(", ") || "אין";
              const additions = item.selectedOptions?.additions?.map((add) => add.addition).join(", ") || "אין";

              return (
                <tr key={index} style={{ borderBottom: "1px solid #ccc" }}>
                  <td style={{ padding: "10px" }}>
                    <img src={item.img} alt={item.title} style={{ width: "100px", borderRadius: "8px" }} />
                  </td>
                  <td style={{ padding: "10px" }}>{item.title}</td>
                  <td style={{ padding: "10px" }}>{item.isWeighted ? item.quantity + " גרם" : item.quantity}</td>
                  <td style={{ padding: "10px" }}>{vegetables}</td>
                  <td style={{ padding: "10px" }}>{additions}</td>
                  <td style={{ padding: "10px" }}>{item.price} ILS</td>
                  <td style={{ padding: "10px" }}>{itemTotalPrice} ILS</td>
                  <td style={{ padding: "10px" }}>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#ff6f61",
                        color: "#fff",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                      }}
                    >
                      הסר
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ marginTop: "20px", fontWeight: "bold", fontSize: "16px" }}>
          סה"כ: {cartItems.reduce((total, item) => total + parseFloat(calculateItemTotal(item)), 0).toFixed(2)} ILS
        </div>

        {/* Order Now Button */}
        <div style={{ marginTop: "20px" }}>
          <button
            onClick={handleOrderNow}
            style={{
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "#fff",
              borderRadius: "5px",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            הזמן עכשיו
          </button>
        </div>

        {/* Confirmation Modal */}
        {showConfirmationModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <button className="modal-close-button" onClick={closeModal}>
                &times;
              </button>
              <h2 className="font-semibold text-center text-xl">אישור הזמנה</h2>
              <p className="text-center">ההזמנה שלך תישלח לוואטסאפ. נא לאשר.</p>
              <div className="modal-buttons" style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                <button
                  onClick={sendWhatsAppOrder}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#25D366",
                    color: "#fff",
                    borderRadius: "5px",
                  }}
                >
                  שלח דרך וואטסאפ
                </button>
                <button
                  onClick={closeModal}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#ccc",
                    borderRadius: "5px",
                  }}
                >
                  בטל
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CartPage;
