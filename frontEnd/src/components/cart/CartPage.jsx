import React, { useContext, useState, useEffect } from "react";
import CartContext from "../../context/CartContext";
import CartNavbar from "./CartNavbar";
import ClosedModal from "../modals/ClosedModal";
import api from "../../api";
import { AuthContext } from "../../context/AuthContext"; // ✅ Also make sure you import AuthContext
import { ORDER_STATUS } from "../../../constants/orderStatus";
import checkGif from "../../assets/check.gif";
import TranzilaIframe from "../TranzilaIframe";

const isValidPhoneNumber = (phone) => {
  return /^05\d{8}$/.test(phone); // starts with 05 and has exactly 10 digits
};

const CartPage = () => {
  const { cartItems, removeFromCart, clearCart } = useContext(CartContext);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [isClosedModalOpen, setIsClosedModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [couponApplied, setCouponApplied] = useState(false);
  const [eligibleReward, setEligibleReward] = useState(null); // 'drink' or 'side'
  const [deliveryOption, setDeliveryOption] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [guestName, setGuestName] = useState("");
  const [showCardPayment, setShowCardPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null); // 'success' | 'failure' | null
  const [orderId, setOrderId] = useState(null);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
  const [policyChecked, setPolicyChecked] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  useEffect(() => {
    let interval;
    if (paymentMethod === "Card" && orderSubmitted && orderId && !isPaymentConfirmed) {
      interval = setInterval(async () => {
        try {
          const res = await api.get(`/api/orders/${orderId}`);
          if (res.data?.paymentStatus === "paid" || res.data?.status === "paid") {
            console.log("✅ Payment confirmed via webhook");
            setIsPaymentConfirmed(true);
            clearInterval(interval);
          }
        } catch (err) {
          console.warn("❌ Error checking payment status:", err.response?.data || err.message);
        }
      }, 3000); // Poll every 3 seconds
    }

    return () => clearInterval(interval); // Cleanup
  }, [paymentMethod, orderId, orderSubmitted, isPaymentConfirmed]);

  //state to track in the order is ready to got to backend
  const [, setIsOrderReady] = useState(false);
  const { user, updateUser } = useContext(AuthContext); // ✅ get user and updater
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
    setShowCardPayment(false);

    setPaymentResult(null);
    setOrderSubmitted(false);
    setPolicyChecked(false);
    setShowPolicyModal(false);

    setIsOrderReady(false);
  };
  //vegetables Order
  const VEGETABLES_ORDER = ["חסה", "מלפפון חמוץ", "עגבניה", "בצל", "סלט כרוב", "צימצורי"];

  //isguest component
  const isGuest = () => !user;

  useEffect(() => {
    if (user) {
      clearCart();
      localStorage.removeItem("cartItems");
      // Reset cart state when user logs in
      setPaymentMethod(null);
      setDeliveryOption(null);
      setShowCardPayment(false);
      setPhoneNumber("");
      setGuestName("");
      setCouponApplied(false);
      setEligibleReward(null);
      setShowConfirmationModal(false);
      setIsClosedModalOpen(false);
      setIsOrderReady(false);
      setOrderSubmitted(false);
      setPolicyChecked(false);
      setShowPolicyModal(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || couponApplied || cartItems.length === 0) return;

    const { orderCount, _id, usedDrinkCoupon } = user;

    if (orderCount >= 5 && orderCount < 10 && !usedDrinkCoupon) {
      const hasDrink = cartItems.some((item) => item.category?.toLowerCase() === "drinks");
      if (hasDrink) setEligibleReward("drink");
    } else if (orderCount >= 10) {
      const hasSide = cartItems.some((item) => item.category.toLowerCase() === "side" || item.category.toLowerCase() === "starters");
      if (hasSide) {
        setEligibleReward("side");

        // ✅ Reset order count to 0 and reset drink coupon usage
        const token = localStorage.getItem("token");

        api
          .patch(
            `/api/users/${_id}`,
            {
              orderCount: 0,
              usedDrinkCoupon: false,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          )
          .then(() => console.log("✅ Order count and drink coupon reset"))
          .catch((err) => console.error("❌ Reset error:", err.response?.data || err.message));
      }
    }
  }, [cartItems, user, couponApplied]);

  //check if payment and delivery options are selected
  const checkOrderReadiness = () => {
    return paymentMethod && deliveryOption;
  };

  //Final submission handler
  const handleFinalSubmit = () => {
    if (orderSubmitted) return;

    if (!checkOrderReadiness()) {
      alert("אנא בחר אמצעי תשלום ואפשרות משלוח לפני השלמת ההזמנה");
      return;
    }

    if (isGuest()) {
      if (!guestName.trim()) {
        alert("אנא הזן שם לפני השלמת ההזמנה");
        return;
      }

      if (deliveryOption !== "EatIn" && !isValidPhoneNumber(phoneNumber)) {
        alert("אנא הזן מספר טלפון תקין שמתחיל ב-05 וכולל 10 ספרות");
        return;
      }
    }

    if (paymentMethod === "Card") {
      if (!orderId) {
        alert("התשלום בכרטיס לא הושלם");
        return;
      }
      setOrderSubmitted(true);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      clearCart();
      setShowConfirmationModal(false);
      setGuestName("");
      setPolicyChecked(false);
      setShowPolicyModal(false);
      return;
    }

    submitOrderToBackend();
  };

  // Build order payload shared by submission and pre-payment creation
  const buildOrderPayload = () => {
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

    const totalPrice = parseFloat(calculateCartTotal());

    return {
      ...(loggedInUserId && { user: loggedInUserId }),
      ...(phoneNumber && !loggedInUserId && { phone: phoneNumber }),
      ...(guestName && !loggedInUserId && { customerName: guestName }),
      items: itemsForBackend,
      totalPrice,
      deliveryOption,
      paymentDetails: { method: paymentMethod },
      status: ORDER_STATUS.PENDING,
      createdAt: new Date(),
      ...(couponApplied && { couponUsed: eligibleReward }),
    };
  };

  // Create order before payment and return stable ID
  const createPrePaymentOrder = async (forcedMethod) => {
    const payload = buildOrderPayload();
    // ensure method is present even if React state hasn't updated yet
    payload.paymentDetails = {
      ...(payload.paymentDetails || {}),
      method: forcedMethod || payload.paymentDetails?.method || "Card",
    };
    console.log("📦 Creating pre-payment order:", payload);
    const res = await api.post(`/api/orders/create-pre-payment`, payload);
    setOrderId(res.data.orderId);
  };

  // Submit order for non-card payments
  const submitOrderToBackend = async () => {
    const payload = buildOrderPayload();

    console.log("📦 Submitting order payload:", payload); // ✅ Important log

    try {
      const response = await api.post(`/api/orders`, payload);
      console.log("✅ Order submitted:", response.data);

      const createdOrder = response.data.order; // ✅ Get full order object
      const orderId = createdOrder._id; // ✅ This is the MongoDB _id
      console.log("📦 Order ID (MongoDB _id):", orderId);

      setOrderId(orderId);

      setOrderSubmitted(true);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      clearCart();

      if (user?._id) {
        try {
          const token = localStorage.getItem("token");
          const profile = await api.get(`/api/users/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          updateUser(profile.data.user);
        } catch (e) {
          console.error("❌ Failed to refresh user:", e.response?.data || e.message);
        }
      }

      setShowConfirmationModal(false);
      setGuestName("");
      setPolicyChecked(false);
      setShowPolicyModal(false);
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

    if (couponApplied) {
      for (let i = 0; i <= index; i++) {
        const currentItem = grouped[i];
        if (eligibleReward === "drink" && currentItem.category.toLowerCase() === "drinks" && !drinkCouponApplied) {
          if (currentItem.id === item.id) {
            basePrice = 0;
            drinkCouponApplied = true;
          }
        } else if (eligibleReward === "side" && ["side", "starters"].includes(currentItem.category.toLowerCase()) && !sideCouponApplied) {
          if (currentItem.id === item.id) {
            basePrice = 0;
            sideCouponApplied = true;
          }
        }
      }
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
          if (eligibleReward === "drink" && item.category?.toLowerCase() === "drinks" && !drinkCouponApplied) {
            basePrice = 0;
            drinkCouponApplied = true;
          }

          if (eligibleReward === "side" && ["side", "starters"].includes(item.category?.toLowerCase()) && !sideCouponApplied) {
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

  // calculate final total including delivery fee if selected
  const calculateFinalTotal = () => {
    const base = parseFloat(calculateCartTotal());
    return base.toFixed(2); // Removed + deliveryFee
  };

  const _sendWhatsAppOrder = (deliveryOption) => {
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
        const vegetables = item.id >= 10 && item.id <= 17 ? "" : item.selectedOptions?.vegetables?.join(", ") || "כל הירקות";
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
        {showSuccess && (
          <div
            className="order-success"
            role="alert"
            aria-live="assertive"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "#ffffff",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              animation: "fadeOut 3s forwards",
            }}
          >
            <img src={checkGif} alt="Order Confirmed" style={{ width: "120px", marginBottom: "16px" }} />
            <p style={{ fontSize: "18px", fontWeight: "bold", color: "#16a34a" }}>ההזמנה נשלחה בהצלחה!</p>
          </div>
        )}

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
                    <td data-label="ירקות">
                      {Array.isArray(item.selectedOptions?.vegetables) && item.selectedOptions.vegetables.length > 0
                        ? VEGETABLES_ORDER.filter((v) => item.selectedOptions.vegetables.includes(v)).join(", ")
                        : "כל הירקות"}
                    </td>

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
        <div className="cart-total">
          סה&quot;כ: {calculateFinalTotal()} ILS <br />
        </div>{" "}
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
              onClick={() => setCouponApplied(true)}
              style={{
                backgroundColor: "#10b981", // Tailwind emerald-500
                padding: "12px 20px",
                borderRadius: "10px",
                fontWeight: "bold",
                marginTop: "20px",
                fontSize: "16px",
                color: "#fff",
                boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#059669")} // darker green
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#10b981")}
            >
              🎉 {eligibleReward === "drink" ? "קופון לשתייה חינם" : "קופון לתוספת חינם"}
            </button>
          )}
        </div>
        {showConfirmationModal && !isClosedModalOpen && (
          <>
            <div className="modal-overlay" onClick={closeModal}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2 style={{ direction: "rtl", textAlign: "right" }}>אישור הזמנה</h2>
                <p style={{ direction: "rtl", textAlign: "right", paddingBottom: "20px" }}>
                  {" "}
                  אנא בחר באפשרות משלוח, איסוף עצמי, או אכילה במקום להשלמת ההזמנה שתישלח לוואטסאפ{" "}
                </p>{" "}
                {isGuest() && (
                  <>
                    <div style={{ marginBottom: "10px" }}>
                      <h4 style={{ direction: "rtl", textAlign: "right", marginBottom: "5px" }}>שם לקוח:</h4>
                      <input
                        type="text"
                        placeholder="הכנס שם"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        required
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "5px",
                          border: "1px solid #ccc",
                        }}
                      />
                    </div>
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
                  </>
                )}
                <div style={{ textAlign: "right", direction: "rtl", margin: "10px 0" }}>
                  <h4>סיכום הזמנה:</h4>
                  <ul style={{ listStyleType: "none", padding: 0 }}>
                    {groupCartItems().map((item, idx) => (
                      <li key={idx}>
                        {item.title} x {item.quantity} - {calculateItemTotal(item, idx)} ILS
                      </li>
                    ))}
                  </ul>
                  <p>סה&quot;כ לתשלום: {calculateFinalTotal()} ILS</p>{" "}
                  <p style={{ fontSize: "14px", color: "#555" }}>מחיר אינו כולל עלות משלוח ומחיר משלוח יכול להשתנות</p>
                </div>
                <div style={{ marginTop: "5px" }}>
                  <h4 style={{ direction: "rtl", textAlign: "right", marginBottom: "10px" }}>בחר אמצעי תשלום:</h4>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      onClick={() => {
                        setPaymentMethod("Cash");
                        setShowCardPayment(false);
                        setPaymentResult(null);
                      }}
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
                      onClick={async () => {
                        if (!deliveryOption) {
                          alert("אנא בחר אפשרות משלוח לפני תשלום בכרטיס");
                          return;
                        }
                        setPaymentMethod("Card");
                        setPaymentResult(null);
                        try {
                          if (!orderId) {
                            await createPrePaymentOrder("Card");
                          }
                          setShowCardPayment(true);
                        } catch (err) {
                          console.error("❌ Failed to create pre-payment order:", err);
                          alert("שגיאה ביצירת ההזמנה");
                        }
                      }}
                      style={{
                        flex: "1",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 20px",
                        backgroundColor: paymentMethod === "Card" ? "#1d4ed8" : "#2563eb",
                        border: paymentMethod === "Card" ? "3px solid black" : "1px solid transparent",

                        color: "#fff",
                        borderRadius: "5px",
                      }}
                    >
                      <img src="/svg/visa.svg" alt="Card Icon" style={{ width: "20px", height: "20px" }} />
                      כרטיס אשראי
                    </button>
                  </div>
                </div>
                {/* ✅ Delivery buttons */}
                <div
                  className="modal-delivery-buttons"
                  style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginTop: "20px" }}
                >
                  <button
                    onClick={() => {
                      setDeliveryOption("Pickup");
                    }}
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
                    onClick={() => {
                      setDeliveryOption("Delivery");
                    }}
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
                    onClick={() => {
                      setDeliveryOption("EatIn");
                    }}
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
                {deliveryOption === "Delivery" && (
                  <p style={{ fontSize: "14px", color: "#555", marginTop: "10px" }}>
                    שימו לב: מחיר אינו כולל עלות משלוח ומחיר משלוח יכול להשתנות
                  </p>
                )}
                {paymentMethod === "Card" && showCardPayment && !paymentResult && orderId && (
                  <TranzilaIframe amount={calculateFinalTotal()} orderId={orderId} />
                )}
                {paymentResult === "success" && (
                  <div style={{ textAlign: "center", marginTop: "20px" }}>
                    <img src="/icons/check-success.svg" alt="Success" style={{ width: "60px", marginBottom: "10px" }} />
                    <h3 style={{ color: "#16a34a" }}>התשלום הצליח!</h3>
                    <p>ניתן כעת להשלים את ההזמנה</p>
                  </div>
                )}
                {paymentResult === "failure" && (
                  <div style={{ textAlign: "center", marginTop: "20px" }}>
                    <img src="/icons/fail-icon.svg" alt="Failure" style={{ width: "60px", marginBottom: "10px" }} />
                    <h3 style={{ color: "#dc2626" }}>התשלום נכשל</h3>
                    <p>אנא נסה שוב או נסה אמצעי תשלום אחר</p>
                    <button
                      onClick={() => {
                        setPaymentResult(null);
                        setShowCardPayment(true);
                      }}
                      style={{
                        marginTop: "15px",
                        padding: "10px 20px",
                        backgroundColor: "#1d4ed8",
                        color: "white",
                        borderRadius: "8px",
                        border: "none",
                      }}
                    >
                      נסה שוב
                    </button>
                  </div>
                )}
                <div style={{ marginTop: "15px", direction: "rtl", textAlign: "right" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input type="checkbox" checked={policyChecked} onChange={(e) => setPolicyChecked(e.target.checked)} />
                    <span>
                      אני מאשר/ת שקראתי את{" "}
                      <span style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => setShowPolicyModal(true)}>
                        התקנון ומדיניות הביטולים
                      </span>
                    </span>
                  </label>
                </div>
                {/* ✅ Send and Cancel buttons */}
                <div className="modal-action-buttons" style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "20px" }}>
                  <button
                    onClick={handleFinalSubmit}
                    disabled={orderSubmitted || !paymentMethod || !deliveryOption || !policyChecked}
                    style={{
                      padding: "12px 24px",
                      backgroundColor: orderSubmitted || !paymentMethod || !deliveryOption || !policyChecked ? "gray" : "green",
                      color: "white",
                      fontSize: "16px",
                      fontWeight: "bold",
                      borderRadius: "8px",
                      cursor: orderSubmitted || !paymentMethod || !deliveryOption || !policyChecked ? "not-allowed" : "pointer",
                      border: "none",
                    }}
                  >
                    שלח הזמנה
                    {orderSubmitted ? "הזמנה נשלחה" : ""}
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
            {showPolicyModal && (
              <div className="modal-overlay" onClick={() => setShowPolicyModal(false)} style={{ zIndex: 3000 }}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h2 style={{ direction: "rtl", textAlign: "right" }}>מדיניות ביטולים והחזרים:</h2>
                  <div style={{ direction: "rtl", textAlign: "right", maxHeight: "70vh", overflowY: "auto" }}>
                    <p>• ניתן לבטל הזמנה תוך 5 דקות ממועד ההזמנה כל עוד לא התחילה ההכנה.</p>
                    <p>• לאחר תחילת ההכנה או יציאת המשלוח – לא ניתן לבטל את ההזמנה.</p>
                    <p>• החזר כספי יתבצע באותו אמצעי תשלום, עד 5% או 100 ₪ דמי ביטול (הנמוך מביניהם) בהתאם לחוק.</p>
                    <p>• במקרה של טעות מצד המסעדה (למשל מנה לא נכונה או לא סופקה) – הלקוח זכאי להחזר מלא או אספקה מחדש.</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`

    @keyframes fadeOut {
  0%, 80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.animate-fadeOut {
  animation: fadeOut 3s forwards;
}
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

        .order-success {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background-color: #4BB543;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          z-index: 1100;
          animation: fadeOut 3s forwards;
        }

        @keyframes fadeOut {
          0%, 80% { opacity: 1; }
          100% { opacity: 0; }
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
