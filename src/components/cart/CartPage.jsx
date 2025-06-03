import React, { useContext, useState, useEffect } from "react";
import CartContext from "../../context/CartContext";

import CartNavbar from "./CartNavbar";
import ClosedModal from "../modals/ClosedModal";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { comment } from "postcss";
import { AuthContext } from "../../context/AuthContext"; // ✅ Also make sure you import AuthContext

const isValidPhoneNumber = (phone) => {
  return /^05\d{8}$/.test(phone); // starts with 05 and has exactly 10 digits
};

const CartPage = () => {
  const { cartItems, removeFromCart, clearCart } = useContext(CartContext);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [isClosedModalOpen, setIsClosedModalOpen] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const [eligibleReward, setEligibleReward] = useState(null); // 'drink' or 'side'
  const [couponUsedForItemId, setCouponUsedForItemId] = useState(null);
  const [deliveryOption, setDeliveryOption] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [visaDetails, setVisaDetails] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
  });

  const { cartItems, removeFromCart, clearCart } = useContext(CartContext);

  //state to track in the order is ready to got to backend
  const [isOrderReady, setIsOrderReady] = useState(false);
  const { user } = useContext(AuthContext); // ✅ get user
  const navigate = useNavigate();

  const handleCloseModal = () => {
    setIsClosedModalOpen(false);
  };

  const handleOrderNow = () => {
    setShowConfirmationModal(true);
  };

  const closeModal = () => {
    setShowConfirmationModal(false);

    setPaymentMethod(null);
    setDeliveryOption(null);
    setVisaDetails({
      cardNumber: "",
      expiryDate: "",
      cvv: "",
      cardholderName: "",
    });
    setIsOrderReady(false);
  };

  //isguest component
  const isGuest = () => !user;

  // Handle visa input changes
  const handleVisaInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "expiryDate") {
      // Handle expiry date formatting: MM/YY
      let cleaned = value.replace(/\D/g, "");

      if (cleaned.length >= 3) {
        cleaned = cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4);
      }

      if (cleaned.length > 5) {
        cleaned = cleaned.slice(0, 5);
      }

      setVisaDetails((prevDetails) => ({
        ...prevDetails,
        [name]: cleaned,
      }));
    } else if (name === "cardNumber") {
      // Allow only digits, limit to 16 digits
      const cleaned = value.replace(/\D/g, "").slice(0, 16);

      setVisaDetails((prevDetails) => ({
        ...prevDetails,
        [name]: cleaned,
      }));
    } else if (name === "cvv") {
      // Allow only digits, limit to 3 digits
      const cleaned = value.replace(/\D/g, "").slice(0, 3);

      setVisaDetails((prevDetails) => ({
        ...prevDetails,
        [name]: cleaned,
      }));
    } else {
      // Normal text input (like cardholder name)
      setVisaDetails((prevDetails) => ({
        ...prevDetails,
        [name]: value,
      }));
    }
  };

  const applyCouponOnce = () => {
    const groupedItems = groupCartItems();
    const eligibleItem = groupedItems.find((item) => {
      return eligibleReward === "drink" ? item.category.toLowerCase() === "drinks" : item.category.toLowerCase() === "side";
    });

    if (eligibleItem) {
      setCouponUsedForItemId(eligibleItem.id);
      setCouponApplied(true);
    }
  };

  useEffect(() => {
    if (user) {
      clearCart();
      localStorage.removeItem("cartItems");
      // Reset cart state when user logs in
      setPaymentMethod(null);
      setDeliveryOption(null);
      setVisaDetails({
        cardNumber: "",
        expiryDate: "",
        cvv: "",
        cardholderName: "",
      });
      setPhoneNumber("");
      setCouponApplied(false);
      setEligibleReward(null);
      setShowConfirmationModal(false);
      setIsClosedModalOpen(false);
      setIsOrderReady(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || couponApplied || cartItems.length === 0) return;

    const { orderCount, _id, usedDrinkCoupon } = user;

    if (orderCount >= 5 && orderCount < 10 && !usedDrinkCoupon) {
      const hasDrink = cartItems.some((item) => item.category.toLowerCase() === "drinks");
      if (hasDrink) setEligibleReward("drink");
    } else if (orderCount >= 10) {
      const hasSide = cartItems.some((item) => item.category === "side");
      if (hasSide) {
        setEligibleReward("side");

        // ✅ Reset order count to 0 and reset drink coupon usage
        axios
          .patch(`http://localhost:5001/api/users/${_id}`, {
            orderCount: 0,
            usedDrinkCoupon: false,
          })
          .then(() => console.log("✅ Order count and drink coupon reset"))
          .catch((err) => console.error("❌ Reset error:", err.response?.data || err.message));
      }
    }
  }, [cartItems, user, couponApplied]);

  //check if payment and delivery options are selected
  const checkOrderReadiness = () => {
    if (paymentMethod === "Visa") {
      const { cardNumber, expiryDate, cvv, cardholderName } = visaDetails;
      return cardNumber && expiryDate && cvv && cardholderName && deliveryOption;
    }

    return paymentMethod && deliveryOption;
  };

  //Final submission handler
  const handleFinalSubmit = () => {
    if (!checkOrderReadiness()) {
      alert("אנא בחר אמצעי תשלום ואפשרות משלוח לפני השלמת ההזמנה");
      return;
    }

    // ✅ Guest phone validation
    if (isGuest() && !isValidPhoneNumber(phoneNumber)) {
      alert("אנא הזן מספר טלפון תקין שמתחיל ב-05 וכולל 10 ספרות");
      return;
    }

    submitOrderToBackend(deliveryOption);
  };

  //submitting order to backend
  const submitOrderToBackend = async (deliveryOption) => {
    const groupedItems = groupCartItems();

    const itemsForBackend = groupedItems
      .map((item) => ({
        product: item._id || item.id,
        title: item.title,
        price: item.price,
        img: item.img,
        quantity: item.quantity,
        isWeighted: item.isWeighted,
        vegetables: item.selectedOptions?.vegetables || [],
        additions: item.selectedOptions?.additions || [],
        comment: item.comment || "",
      }))
      .filter(
        (item) =>
          typeof item.product === "string" && item.product.match(/^[a-f\d]{24}$/i) && typeof item.quantity === "number" && item.quantity > 0
      );

    const loggedInUserId = user?._id;

    let paymentDetails = {};
    if (paymentMethod === "Visa") {
      paymentDetails = {
        method: "Visa",
        cardLastFour: visaDetails.cardNumber.slice(-4),
        cardholderName: visaDetails.cardholderName,
      };
    } else {
      paymentDetails = { method: paymentMethod };
    }

    const totalPrice = parseFloat(calculateCartTotal());

    const payload = {
      ...(loggedInUserId && { user: loggedInUserId }),
      ...(phoneNumber && !loggedInUserId && { phone: phoneNumber }),
      items: itemsForBackend,
      totalPrice,
      deliveryOption,
      paymentDetails,
      status: "pending",
      createdAt: new Date(),
      ...(couponApplied && { couponUsed: eligibleReward }),
    };

    console.log("📦 Submitting order payload:", payload);

    try {
      const response = await axios.post("http://localhost:5001/api/orders", payload);
      console.log("✅ Order submitted:", response.data);
      alert("ההזמנה נשלחה בהצלחה!");
      setShowConfirmationModal(false);
      clearCart(); // ✅ Reset cart context
      localStorage.removeItem("cartItems"); // ✅ Clear localStorage
      setShowConfirmationModal(false);
      // ✅ Redirect after successful order
      navigate("/order-preparing");
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("userId");
        alert("החיבור שלך פג תוקף. אנא התחבר מחדש");
        window.location.reload();
      } else {
        console.error("❌ Failed to submit order:", error.response?.data || error.message);
        alert("שגיאה בשליחת ההזמנה");
      }
    }
  };

  // Group items by id and calculate the quantity for identical items
  const groupCartItems = () => {
    const groupedItems = {};

    cartItems.forEach((item) => {
      if (groupedItems[item.id]) {
        groupedItems[item.id].quantity += item.quantity;
      } else {
        groupedItems[item.id] = { ...item };
      }
    });

    return Object.values(groupedItems);
  };

  // This function is only used to display individual row prices
  const calculateItemTotal = (item, index = 0) => {
    const hasAdditions = item.selectedOptions?.additions || [];
    const additionsTotal = hasAdditions.reduce((sum, add) => sum + add.price, 0);

    let basePrice = item.price;

    // ❗️Avoid applying coupon here completely – it’s handled in calculateCartTotal
    // But if you insist on showing discounted price per item visually, you can:
    const grouped = groupCartItems();
    let drinkCouponApplied = false;
    let sideCouponApplied = false;

    if (couponApplied && item.id === couponUsedForItemId) {
      basePrice = 0;
    }

    return item.isWeighted ? (basePrice / 100) * item.quantity + additionsTotal : (basePrice + additionsTotal) * item.quantity;
  };

  // Function to calculate the total for the entire cart
  const calculateCartTotal = () => {
    const groupedItems = groupCartItems();
    let drinkCouponApplied = false;
    let sideCouponApplied = false;

    return groupedItems
      .reduce((total, item) => {
        let basePrice = item.price;
        const hasAdditions = item.selectedOptions?.additions || [];
        const additionsTotal = hasAdditions.reduce((sum, add) => sum + add.price, 0);

        // 💥 Apply coupon to ONE eligible item only
        if (couponApplied) {
          if (eligibleReward === "drink" && item.category.toLowerCase() === "drinks" && !drinkCouponApplied) {
            basePrice = 0;
            drinkCouponApplied = true;
          }

          if (eligibleReward === "side" && item.category.toLowerCase() === "side" && !sideCouponApplied) {
            basePrice = 0;
            sideCouponApplied = true;
          }
        }

        const itemTotal = item.isWeighted
          ? (basePrice / 100) * item.quantity + additionsTotal
          : (basePrice + additionsTotal) * item.quantity;

        return total + itemTotal;
      }, 0)
      .toFixed(2);
  };
  console.log("Final total price sent:", calculateCartTotal());

  const sendWhatsAppOrder = (deliveryOption) => {
    const currentDay = new Date().getDay(); // Get the current day of the week (0 = Sunday, 1 = Monday, ..., 3 = Wednesday)

    // If it's Wednesday (day 3), show the modal instead of sending the message
    if (currentDay === 3) {
      setIsClosedModalOpen(true); // Open the modal that says the restaurant is closed
      return; // Stop execution here to prevent sending the WhatsApp message
    }

    const deliveryOptionHebrew = deliveryOption === "Pickup" ? "איסוף עצמי" : deliveryOption === "Delivery" ? "משלוח" : "אכילה במסעדה";

    const orderDetails = groupCartItems()
      .map((item) => {
        const itemTotalPrice = calculateItemTotal(item);
        const vegetables = item.id >= 10 && item.id <= 17 ? "" : item.selectedOptions?.vegetables?.join(", ") || "אין";
        const additions =
          item.id >= 10 && item.id <= 16
            ? ""
            : item.selectedOptions?.additions?.map((add) => `${add.addition} (${add.price} ILS)`).join(", ") || "אין";

        const comment = item.comment ? `הערות: ${item.comment}` : "הערות: אין";

        if (item.id >= 10 && item.id <= 17) {
          return `
            מוצר: ${item.title}
            כמות: ${item.isWeighted ? `${item.quantity} גרם` : item.quantity}

            מחיר ליחידה: ${item.price} ILS
                        ${comment}
            מחיר סופי: ${itemTotalPrice} ILS
          `.trim();
        }

        return `
          מוצר: ${item.title}
          כמות: ${item.isWeighted ? `${item.quantity} גרם` : item.quantity}

          ירקות: ${vegetables}
          תוספות: ${additions}
          מחיר ליחידה: ${item.price} ILS
                    ${comment}
          מחיר סופי: ${itemTotalPrice} ILS
        `.trim();
      })
      .join("\n\n");

    const totalPrice = groupCartItems().reduce((total, item) => total + parseFloat(calculateItemTotal(item)), 0);

    const message = `פרטי הזמנה:\n\n${orderDetails}\n\nאפשרות משלוח: ${deliveryOptionHebrew}\n\nסה"כ: ${totalPrice} ILS`;
    const whatsappUrl = `https://wa.me/+972507203099?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (user === undefined) {
    return null; // Wait for AuthContext to resolve
  }

  if (cartItems.length === 0) {
    return (
      <>
        <CartNavbar />
        <div style={{ padding: "20px" }}>
          <h2>העגלה שלך ריקה</h2>
        </div>
      </>
    );
  }

  return (
    <>
      <CartNavbar />
      <div style={{ padding: "20px" }}>
        <h2>העגלה שלך</h2>
        <div className="cart-table-container">
          <table className="cart-table">
            <thead>
              <tr>
                <th>תמונה</th>
                <th>שם מוצר</th>
                <th>כמות</th>
                {groupCartItems().some((item) => item.id < 11 || item.id > 17) && (
                  <>
                    <th>ירקות</th>
                    <th>תוספות</th>
                  </>
                )}
                <th>מחיר ליחידה</th>
                <th>מחיר סופי</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {groupCartItems().map((item, index) => {
                const itemTotalPrice = calculateItemTotal(item, index);
                return (
                  <tr key={index}>
                    <td data-label="תמונה">
                      <img src={item.img} alt={item.title} style={{ width: "100px", borderRadius: "8px" }} />
                    </td>
                    <td data-label="שם מוצר">{item.title}</td>
                    <td data-label="כמות">{item.isWeighted ? `${item.quantity} גרם` : item.quantity}</td>

                    {/* Show vegetables and additions for all items */}
                    <td data-label="ירקות">{item.selectedOptions?.vegetables?.join(", ") || "אין"}</td>
                    <td data-label="תוספות">{item.selectedOptions?.additions?.map((add) => add.addition).join(", ") || "אין"}</td>

                    <td data-label="מחיר ליחידה">{item.price} ILS</td>
                    <td data-label="מחיר סופי">{itemTotalPrice} ILS</td>
                    <td data-label="פעולות">
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
        </div>
        <div className="cart-total">סה"כ: {calculateCartTotal()} ILS</div>
        <div style={{ marginTop: "20px" }}>
          <button
            onClick={handleOrderNow}
            style={{
              backgroundColor: "#22c55e", // Tailwind green-500
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "5px",
              fontWeight: "bold",
              fontSize: "16px",
              marginTop: "10px",
              cursor: "pointer",
            }}
          >
            הזמן עכשיו
          </button>{" "}
          {console.log("🎯 eligibleReward:", eligibleReward, "couponApplied:", couponApplied)}
          {eligibleReward && !couponApplied && (
            <button
              onClick={applyCouponOnce}
              style={{
                backgroundColor: "#3b82f6",
                padding: "10px",
                borderRadius: "5px",
                fontWeight: "bold",
                marginTop: "10px",
              }}
            >
              {eligibleReward === "drink" ? "השתמש בקופון לשתייה חינם" : "השתמש בקופון לתוספת חינם"}
            </button>
          )}
        </div>

        {showConfirmationModal && !isClosedModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2 style={{ direction: "rtl", textAlign: "right" }}>אישור הזמנה</h2>
              <p style={{ direction: "rtl", textAlign: "right", paddingBottom: "20px" }}>
                {" "}
                אנא בחר באפשרות משלוח, איסוף עצמי, או אכילה במקום להשלמת ההזמנה שתישלח לוואטסאפ{" "}
              </p>{" "}
              {isGuest() && (
                <div style={{ marginBottom: "5px" }}>
                  <h4 style={{ direction: "rtl", textAlign: "right", marginBottom: "5px" }}>מספר טלפון לסטטוס הזמנה:</h4>
                  <input
                    type="tel"
                    placeholder="הכנס מספר טלפון"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    pattern="^05\d{8}$"
                    title="יש להזין מספר טלפון תקין שמתחיל ב-05 וכולל 10 ספרות"
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "5px",
                      border: "1px solid #ccc",
                    }}
                  />
                </div>
              )}
              <div style={{ marginTop: "5px" }}>
                <h4 style={{ direction: "rtl", textAlign: "right", marginBottom: "10px" }}>בחר אמצעי תשלום:</h4>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => setPaymentMethod("Cash")}
                    style={{
                      flex: "1",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 20px",
                      backgroundColor: paymentMethod === "Cash" ? "#16a34a" : "#22c55e", // ✅ green/dark green
                      border: paymentMethod === "Cash" ? "3px solid black" : "1px solid transparent", // Black border if selected

                      color: "#fff",
                      borderRadius: "5px",
                    }}
                  >
                    <img src="/svg/coins.png" alt="Cash Icon" style={{ width: "20px", height: "20px" }} />
                    מזומן
                  </button>

                  <button
                    onClick={() => {
                      setPaymentMethod("Visa");
                    }}
                    style={{
                      flex: "1",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 20px",
                      backgroundColor: paymentMethod === "Visa" ? "#1d4ed8" : "#2563eb", // ✅ blue/darker blue
                      border: paymentMethod === "Visa" ? "3px solid black" : "1px solid transparent", // Black border if selected

                      color: "#fff",
                      borderRadius: "5px",
                    }}
                  >
                    <img src="/svg/visa.svg" alt="Visa Icon" style={{ width: "20px", height: "20px" }} />
                    ויזה
                  </button>

                  <button
                    onClick={() => setPaymentMethod("Bit")}
                    style={{
                      flex: "1",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 20px",
                      backgroundColor: paymentMethod === "Bit" ? "#581c87" : "#6b21a8", // ✅ purple/darker purple
                      border: paymentMethod === "Bit" ? "3px solid black" : "1px solid transparent", // Black border if selected

                      color: "#fff",
                      borderRadius: "5px",
                    }}
                  >
                    <img src="/svg/bit.svg" alt="Bit Icon" style={{ width: "20px", height: "20px" }} />
                    ביט
                  </button>
                </div>
              </div>
              {/* ✅ Delivery buttons */}
              <div
                className="modal-delivery-buttons"
                style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginTop: "20px" }}
              >
                <button
                  onClick={() => setDeliveryOption("Pickup")}
                  style={{
                    flex: "1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    padding: "12px 24px",
                    border: "2px solid #f97316",
                    color: deliveryOption === "Pickup" ? "#ffffff" : "#f97316",
                    backgroundColor: deliveryOption === "Pickup" ? "#f97316" : "transparent",
                    borderRadius: "8px",
                    fontWeight: "600",
                    fontSize: "16px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <img src="/photos/waiter.svg" alt="Pickup Icon" style={{ width: "20px", height: "20px" }} />
                  איסוף עצמי
                </button>

                <button
                  onClick={() => setDeliveryOption("Delivery")}
                  style={{
                    flex: "1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    padding: "12px 24px",
                    border: "2px solid #f97316",
                    color: deliveryOption === "Delivery" ? "#ffffff" : "#f97316",
                    backgroundColor: deliveryOption === "Delivery" ? "#f97316" : "transparent",
                    borderRadius: "8px",
                    fontWeight: "600",
                    fontSize: "16px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <img src="/photos/scooter.svg" alt="Delivery Icon" style={{ width: "20px", height: "20px" }} />
                  משלוח
                </button>

                <button
                  onClick={() => setDeliveryOption("EatIn")}
                  style={{
                    flex: "1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    padding: "12px 24px",
                    border: "2px solid #f97316",
                    color: deliveryOption === "EatIn" ? "#ffffff" : "#f97316",
                    backgroundColor: deliveryOption === "EatIn" ? "#f97316" : "transparent",
                    borderRadius: "8px",
                    fontWeight: "600",
                    fontSize: "16px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <img src="/photos/dish.svg" alt="EatIn Icon" style={{ width: "20px", height: "20px" }} />
                  אכילה במסעדה
                </button>
              </div>
              {paymentMethod === "Visa" && (
                <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <input
                    type="text"
                    name="cardNumber"
                    placeholder="מספר כרטיס"
                    value={visaDetails.cardNumber}
                    onChange={handleVisaInputChange}
                    required
                    style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
                  />
                  <input
                    type="text"
                    name="expiryDate"
                    placeholder="תוקף (MM/YY)"
                    value={visaDetails.expiryDate}
                    onChange={handleVisaInputChange}
                    required
                    style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
                  />
                  <input
                    type="text"
                    name="cvv"
                    placeholder="CVV"
                    value={visaDetails.cvv}
                    onChange={handleVisaInputChange}
                    required
                    style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
                  />
                  <input
                    type="text"
                    name="cardholderName"
                    placeholder="שם בעל הכרטיס"
                    value={visaDetails.cardholderName}
                    onChange={handleVisaInputChange}
                    required
                    style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
                  />
                </div>
              )}
              {/* ✅ Send and Cancel buttons */}
              <div className="modal-action-buttons" style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "20px" }}>
                <button
                  onClick={handleFinalSubmit}
                  disabled={!paymentMethod || !deliveryOption}
                  style={{
                    padding: "12px 24px",
                    backgroundColor: !paymentMethod || !deliveryOption ? "gray" : "green",
                    color: "white",
                    fontSize: "16px",
                    fontWeight: "bold",
                    borderRadius: "8px",
                    cursor: !paymentMethod || !deliveryOption ? "not-allowed" : "pointer",
                    border: "none",
                  }}
                >
                  שלח הזמנה
                </button>

                <button
                  onClick={closeModal}
                  style={{
                    padding: "12px 24px",
                    backgroundColor: "black",
                    color: "white",
                    fontSize: "16px",
                    fontWeight: "bold",
                    borderRadius: "8px",
                    cursor: "pointer",
                    border: "none",
                  }}
                >
                  בטל
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.6); /* Semi-transparent background */
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000; /* Ensures it appears on top */
        }

        .modal-content {
          width: 90%;
          max-width: 450px;
          background-color: #ffffff;
          padding: 30px;
          border-radius: 15px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3); /* Softer shadow */
          text-align: center;
          font-family: "Arial", sans-serif;
          animation: slideIn 0.3s ease-out; /* Subtle animation */
        }

        @keyframes slideIn {
          from {
            transform: translateY(-30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .modal-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          justify-content: center;
          margin-top: 20px;
        }

        .modal-buttons button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px 20px;
          background-color: #25d366; /* WhatsApp green */
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: background-color 0.3s, transform 0.2s;
          width: 48%; /* Consistent button layout */
        }

        .modal-buttons button img {
          width: 24px;
          height: 24px;
        }

        .modal-buttons button:hover {
          background-color: #1da558; /* Darker green on hover */
          transform: scale(1.05); /* Slight zoom effect */
        }

        .modal-buttons button:last-child {
          background-color: #f44336; /* Red for cancel */
        }

        .modal-buttons button:last-child:hover {
          background-color: #d32f2f;
        }

        .modal-content h2 {
          font-size: 22px;
          font-weight: bold;
          margin-bottom: 15px;
          color: #333;
        }

        .modal-content p {
          font-size: 16px;
          color: #666;
          margin-bottom: 25px;
          line-height: 1.6; /* Better readability */
        }

        .cart-table {
          padding-top: 40px;
          width: 100%;
          border-collapse: collapse;
        }

        .cart-table th,
        .cart-table td {
          text-align: left;
          padding: 10px;
          border-bottom: 1px solid #ccc;
        }

        .cart-total {
          margin-top: 20px;
          font-weight: bold;
          font-size: 16px;
        }

        button {
          padding: 10px 20px;
          background-color: #007bff;
          color: #fff;
          border-radius: 5px;
          font-size: 16px;
          cursor: pointer;
        }

        @media (max-width: 460px) {
          .cart-table {
            display: block;
            width: 100%;
            overflow-x: auto;
            position: relative;
          }

          thead {
            display: none;
          }

          tbody {
            display: block;
          }

          tr {
            display: block;
            border-bottom: 1px solid #ccc;
            padding: 10px 0;
            margin-bottom: 10px;
          }

          td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border: none;
          }

          td:after {
            content: attr(data-label);
            flex: 0 0 100px;
            font-weight: bold;
            color: #555;
          }

          .cart-table td img {
            width: 80px;
            margin-bottom: 10px;
          }

          .modal-content {
            padding: 20px;
            width: 95%;
          }

          .modal-buttons button {
            width: 100%; /* Stack buttons on small screens */
          }

          .modal-content h2 {
            font-size: 18px;
          }

          .modal-content p {
            font-size: 14px;
          }
          @media (max-width: 460px) {
            .cart-table {
              display: block;
              width: 100%;
              overflow-x: auto;
              position: relative;
            }

            thead {
              display: none;
            }

            tbody {
              display: block;
            }

            tr {
              display: block;
              border-bottom: 1px solid #ccc;
              padding: 10px 0;
              margin-bottom: 10px;
            }

            td {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 10px 0;
              border: none;
            }

            td:after {
              content: attr(data-label);
              flex: 0 0 100px;
              font-weight: bold;
              color: #555;
            }

            .cart-table td img {
              width: 80px;
              margin-bottom: 10px;
            }

            .modal-content {
              padding: 20px;
              width: 95%;
            }

            /* 💥 Add this */
            .modal-buttons {
              flex-direction: column;
              gap: 10px;
            }

            .modal-buttons button {
              width: 100%;
            }
              @media (max-width: 460px) {
  .modal-delivery-buttons {
    flex-direction: column;
    align-items: center;
  }

  .modal-delivery-buttons button {
    width: 100%;
  }
          }
        }
      `}</style>

      <ClosedModal isOpen={isClosedModalOpen} onClose={handleCloseModal} />
    </>
  );
};

export default CartPage;
