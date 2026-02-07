import React, { useContext, useState, useEffect } from "react";
import CartContext from "../../context/CartContext";
import CartNavbar from "./CartNavbar";
import ClosedModal from "../modals/ClosedModal";
import api from "../../api";
import { AuthContext } from "../../context/AuthContext"; // ✅ Also make sure you import AuthContext
import { useLang } from "../../context/LangContext";
import { ORDER_STATUS } from "../../../constants/orderStatus";
import checkGif from "../../assets/check.gif";
import TranzilaIframe from "../TranzilaIframe";
import { QuantitySelector } from "../QuantitySelector";

const isValidPhoneNumber = (phone) => {
  return /^05\d{8}$/.test(phone); // starts with 05 and has exactly 10 digits
};

const CartPage = ({ variant = "page", isOpen = true, onClose = () => {} }) => {
  const { cartItems, removeFromCart, updateItemQuantity, clearCart } = useContext(CartContext);
  const isDrawer = variant === "drawer";
  const [isClosedModalOpen, setIsClosedModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [drawerStep, setDrawerStep] = useState("items");

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [isCouponChecking, setIsCouponChecking] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const [eligibleReward, setEligibleReward] = useState(null); // 'drink' or 'side'
  const [deliveryOption, setDeliveryOption] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [guestName, setGuestName] = useState("");
  const [storeComment, setStoreComment] = useState("");
  const [showCardPayment, setShowCardPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null); // 'success' | 'failure' | null
  const [orderId, setOrderId] = useState(null);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
  const [policyChecked, setPolicyChecked] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const { lang, t } = useLang();
  const resolveItemName = (item) =>
    lang === "en" ? item.name_en ?? item.name ?? item.title : item.name_he ?? item.name ?? item.title;

  useEffect(() => {
    if (isDrawer && isOpen) {
      setDrawerStep("items");
    }
  }, [isDrawer, isOpen]);

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

  //vegetables Order
  const VEGETABLES_ORDER = ["חסה", "מלפפון חמוץ", "עגבניה", "בצל", "סלט כרוב", "צימצורי"];

  //isguest component
  const isGuest = () => !user;

  useEffect(() => {
    if (user) {
      clearCart();
      localStorage.removeItem("cartItems");
    }
    setPaymentMethod(null);
    setDeliveryOption(null);
    setShowCardPayment(false);
    setPhoneNumber("");
    setGuestName("");
    setStoreComment("");
    setCouponCode("");
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponError("");
    setCouponApplied(false);
    setEligibleReward(null);
    setIsClosedModalOpen(false);
    setIsOrderReady(false);
    setOrderSubmitted(false);
    setPolicyChecked(false);
    setShowPolicyModal(false);
  }, [user, clearCart]);
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
      alert(t("cartPage.missingPaymentDelivery", "אנא בחר אמצעי תשלום ואפשרות משלוח לפני השלמת ההזמנה"));
      return;
    }

    if (isGuest()) {
      if (!guestName.trim()) {
        alert(t("cartPage.guestNameAlert", "אנא הזן שם לפני השלמת ההזמנה"));
        return;
      }

      if (deliveryOption !== "EatIn" && !isValidPhoneNumber(phoneNumber)) {
        alert(t("cartPage.phoneAlert", "אנא הזן מספר טלפון תקין שמתחיל ב-05 וכולל 10 ספרות"));
        return;
      }
    }

    if (paymentMethod === "Card") {
      if (!orderId) {
        alert(t("cartPage.cardNotComplete", "התשלום בכרטיס לא הושלם"));
        return;
      }
      setOrderSubmitted(true);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      clearCart();
      setGuestName("");
      setStoreComment("");
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
        title: resolveItemName(item),
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

    const totalPrice = parseFloat(calculateFinalTotal());

    return {
      ...(loggedInUserId && { user: loggedInUserId }),
      ...(phoneNumber && !loggedInUserId && { phone: phoneNumber }),
      ...(guestName && !loggedInUserId && { customerName: guestName }),
      ...(storeComment.trim() && { comment: storeComment.trim() }),
      items: itemsForBackend,
      totalPrice,
      deliveryOption,
      paymentDetails: { method: paymentMethod },
      status: ORDER_STATUS.PENDING,
      createdAt: new Date(),
      ...(appliedCoupon && { couponCode: appliedCoupon, couponDiscount }),
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

      setGuestName("");
      setStoreComment("");
      setPolicyChecked(false);
      setShowPolicyModal(false);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("userId");
        alert(t("cartPage.sessionExpired", "החיבור שלך פג תוקף. אנא התחבר מחדש"));
        window.location.reload();
      } else {
        console.error("❌ Failed to submit order:", error.response?.data || error.message);
        alert(t("cartPage.submitError", "שגיאה בשליחת ההזמנה"));
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

  useEffect(() => {
    if (!appliedCoupon) {
      setCouponDiscount(0);
      return;
    }
    const subtotal = parseFloat(calculateCartTotal());
    setIsCouponChecking(true);
    api
      .post("/api/coupons/validate", { code: appliedCoupon, subtotal })
      .then((res) => {
        const discount = Number(res.data?.discount) || 0;
        setCouponDiscount(parseFloat(discount.toFixed(2)));
        setCouponError("");
      })
      .catch((err) => {
        setCouponDiscount(0);
        setCouponError(err?.response?.data?.message || t("cartPage.couponInvalid", "קופון לא תקין"));
      })
      .finally(() => setIsCouponChecking(false));
  }, [appliedCoupon, cartItems, couponApplied, eligibleReward]);

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponError(t("cartPage.couponEmpty", "אנא הזן קוד קופון"));
      return;
    }
    const subtotal = parseFloat(calculateCartTotal());
    setIsCouponChecking(true);
    api
      .post("/api/coupons/validate", { code, subtotal })
      .then((res) => {
        const discount = Number(res.data?.discount) || 0;
        setAppliedCoupon(res.data?.code || code);
        setCouponDiscount(parseFloat(discount.toFixed(2)));
        setCouponError("");
      })
      .catch((err) => {
        setCouponError(err?.response?.data?.message || t("cartPage.couponInvalidCode", "קוד קופון לא תקין"));
        setAppliedCoupon(null);
        setCouponDiscount(0);
      })
      .finally(() => setIsCouponChecking(false));
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponError("");
  };

  // calculate final total including delivery fee if selected
  const calculateFinalTotal = () => {
    const base = parseFloat(calculateCartTotal());
    const finalTotal = Math.max(base - couponDiscount, 0);
    return finalTotal.toFixed(2); // Removed + deliveryFee
  };

  const _sendWhatsAppOrder = (deliveryOption) => {
    const currentDay = new Date().getDay(); // Get the current day of the week (0 = Sunday, 1 = Monday, ..., 3 = Wednesday)

    // If it's Wednesday (day 3), show the modal instead of sending the message
    if (currentDay === 3) {
      setIsClosedModalOpen(true); // Open the modal that says the restaurant is closed
      return; // Stop execution here to prevent sending the WhatsApp message
    }

    const deliveryOptionLabel =
      deliveryOption === "Pickup"
        ? t("cartPage.pickup", "איסוף עצמי")
        : deliveryOption === "Delivery"
        ? t("cartPage.delivery", "משלוח")
        : t("cartPage.eatIn", "אכילה במסעדה");

    const orderDetails = groupCartItems()
      .map((item) => {
        const itemTotalPrice = calculateItemTotal(item);
        const vegetables =
          item.id >= 10 && item.id <= 17 ? "" : item.selectedOptions?.vegetables?.join(", ") || t("cartPage.allVegetables", "כל הירקות");
        const additions =
          item.id >= 10 && item.id <= 16
            ? ""
            : item.selectedOptions?.additions?.map((add) => `${add.addition} (${add.price} ILS)`).join(", ") || t("cartPage.noAdditions", "אין");

        const comment = item.comment
          ? `${t("cartPage.commentLabel", "הערות")}: ${item.comment}`
          : `${t("cartPage.commentLabel", "הערות")}: ${t("cartPage.noComment", "אין")}`;

        if (item.id >= 10 && item.id <= 17) {
          return `
            ${t("cartPage.productLabel", "מוצר")}: ${resolveItemName(item)}
            ${t("cartPage.quantityLabel", "כמות")}: ${item.isWeighted ? `${item.quantity} ${t("modal.grams", "גרם")}` : item.quantity}

            ${t("cartPage.unitPriceLabel", "מחיר ליחידה")}: ${item.price} ILS
                        ${comment}
            ${t("cartPage.finalPriceLabel", "מחיר סופי")}: ${itemTotalPrice} ILS
          `.trim();
        }

        return `
          ${t("cartPage.productLabel", "מוצר")}: ${resolveItemName(item)}
          ${t("cartPage.quantityLabel", "כמות")}: ${item.isWeighted ? `${item.quantity} ${t("modal.grams", "גרם")}` : item.quantity}

          ${t("cartPage.vegetablesLabel", "ירקות")}: ${vegetables}
          ${t("cartPage.additionsLabel", "תוספות")}: ${additions}
          ${t("cartPage.unitPriceLabel", "מחיר ליחידה")}: ${item.price} ILS
                    ${comment}
          ${t("cartPage.finalPriceLabel", "מחיר סופי")}: ${itemTotalPrice} ILS
        `.trim();
      })
      .join("\n\n");

    const totalPrice = groupCartItems().reduce((total, item) => total + parseFloat(calculateItemTotal(item)), 0);

    const message = `${t("cartPage.whatsappOrderDetails", "פרטי הזמנה")}:\n\n${orderDetails}\n\n${t(
      "cartPage.deliveryOptionLabel",
      "אפשרות משלוח"
    )}: ${deliveryOptionLabel}\n\n${t("cartPage.whatsappTotalLabel", "סה\"כ")}: ${totalPrice} ILS`;
    const whatsappUrl = `https://wa.me/+972507203099?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const renderCheckoutContent = (inline = false) => (
    <div className={inline ? "checkout-panel" : "modal-content"} onClick={(e) => e.stopPropagation()}>
      <h2 style={{ direction: "rtl", textAlign: "right" }}>{t("cartPage.confirmTitle", "אישור הזמנה")}</h2>
      <p style={{ direction: "rtl", textAlign: "right", paddingBottom: "20px" }}>
        {t("cartPage.confirmSubtitle", "אנא בחר באפשרות משלוח, איסוף עצמי, או אכילה במקום להשלמת ההזמנה שתישלח לוואטסאפ")}
      </p>
      {isGuest() && (
        <>
          <div style={{ marginBottom: "10px" }}>
            <h4 style={{ direction: "rtl", textAlign: "right", marginBottom: "5px" }}>{t("cartPage.customerName", "שם לקוח")}:</h4>
            <input
              type="text"
              placeholder={t("cartPage.customerNamePlaceholder", "הכנס שם")}
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
            <h4 style={{ direction: "rtl", textAlign: "right", marginBottom: "5px" }}>
              {t("cartPage.phoneForStatus", "מספר טלפון לסטטוס הזמנה")}:
            </h4>
            <input
              type="tel"
              placeholder={t("cartPage.phonePlaceholder", "הכנס מספר טלפון")}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              pattern="^05\\d{8}$"
              title={t("cartPage.phoneTitle", "יש להזין מספר טלפון תקין שמתחיל ב-05 וכולל 10 ספרות")}
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
        <h4>{t("cartPage.orderSummary", "סיכום הזמנה")}:</h4>
        <ul style={{ listStyleType: "none", padding: 0 }}>
          {groupCartItems().map((item, idx) => (
            <li key={idx}>
              {resolveItemName(item)} x {item.quantity} - {calculateItemTotal(item, idx)} ILS
            </li>
          ))}
        </ul>
        {couponDiscount > 0 && (
          <p>
            {t("cartPage.couponDiscount", "הנחת קופון")}: -{couponDiscount.toFixed(2)} ILS
          </p>
        )}
        <p>
          {t("cartPage.total", "סה\"כ לתשלום")}: {calculateFinalTotal()} ILS
        </p>
        <p style={{ fontSize: "14px", color: "#555" }}>
          {t("cartPage.deliveryNote", "מחיר אינו כולל עלות משלוח ומחיר משלוח יכול להשתנות")}
        </p>
      </div>
      <div style={{ marginTop: "5px" }}>
        <h4 style={{ direction: "rtl", textAlign: "right", marginBottom: "10px" }}>
          {t("cartPage.choosePayment", "בחר אמצעי תשלום")}:
        </h4>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="payment-button"
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
              backgroundColor: paymentMethod === "Cash" ? "#16a34a" : "#22c55e",
              border: paymentMethod === "Cash" ? "3px solid black" : "1px solid transparent",
              color: "#fff",
              borderRadius: "5px",
            }}
          >
            <img src="/svg/coins.png" alt="Cash Icon" style={{ width: "20px", height: "20px" }} />
            {t("cartPage.payCash", "מזומן")}
          </button>
          <button
            className="payment-button"
            onClick={async () => {
              if (!deliveryOption) {
                alert(t("cartPage.chooseDeliveryAlert", "אנא בחר אפשרות משלוח לפני תשלום בכרטיס"));
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
                          alert(t("cartPage.createOrderError", "שגיאה ביצירת ההזמנה"));
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
            {t("cartPage.payCard", "כרטיס אשראי")}
          </button>
        </div>
      </div>
      <div
        className="modal-delivery-buttons"
        style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginTop: "20px" }}
      >
        <button
          className="delivery-button"
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
          {t("cartPage.pickup", "איסוף עצמי")}
        </button>

        <button
          className="delivery-button"
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
          {t("cartPage.delivery", "משלוח")}
        </button>

        <button
          className="delivery-button"
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
          {t("cartPage.eatIn", "אכילה במסעדה")}
        </button>
      </div>
      {deliveryOption === "Delivery" && (
        <p style={{ fontSize: "14px", color: "#555", marginTop: "10px" }}>
          {t("cartPage.deliveryNote", "מחיר אינו כולל עלות משלוח ומחיר משלוח יכול להשתנות")}
        </p>
      )}
      {paymentMethod === "Card" && showCardPayment && !paymentResult && orderId && <TranzilaIframe amount={calculateFinalTotal()} orderId={orderId} />}
      {paymentResult === "success" && (
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <img src="/icons/check-success.svg" alt="Success" style={{ width: "60px", marginBottom: "10px" }} />
          <h3 style={{ color: "#16a34a" }}>{t("cartPage.paymentSuccessTitle", "התשלום הצליח!")}</h3>
          <p>{t("cartPage.paymentSuccessBody", "ניתן כעת להשלים את ההזמנה")}</p>
        </div>
      )}
      {paymentResult === "failure" && (
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <img src="/icons/fail-icon.svg" alt="Failure" style={{ width: "60px", marginBottom: "10px" }} />
          <h3 style={{ color: "#dc2626" }}>{t("cartPage.paymentFailureTitle", "התשלום נכשל")}</h3>
          <p>{t("cartPage.paymentFailureBody", "אנא נסה שוב או נסה אמצעי תשלום אחר")}</p>
          <button
            className="payment-retry-button"
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
            {t("cartPage.tryAgain", "נסה שוב")}
          </button>
        </div>
      )}
      <div style={{ marginTop: "15px", direction: "rtl", textAlign: "right" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input type="checkbox" checked={policyChecked} onChange={(e) => setPolicyChecked(e.target.checked)} />
          <span>
            {t("cartPage.policyLabel", "אני מאשר/ת שקראתי את")}{" "}
            <span style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => setShowPolicyModal(true)}>
              {t("cartPage.policyLink", "התקנון ומדיניות הביטולים")}
            </span>
          </span>
        </label>
      </div>
      <div className="modal-action-buttons" style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "20px" }}>
        <button
          className="submit-order-button"
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
          {t("cartPage.sendOrder", "שלח הזמנה")}
          {orderSubmitted ? t("cartPage.orderSubmitted", "הזמנה נשלחה") : ""}
        </button>
      </div>
    </div>
  );

  const renderItemsSection = () => (
    <div className="cart-main">
      <div className="cart-header">
        <h2>{t("cartPage.title", "העגלה שלך")}</h2>
        <p className="cart-subtitle">
          {t("cartPage.itemsCount", "יש לך")} {groupCartItems().length} {t("cartPage.itemsSuffix", "פריטים בעגלה")}
        </p>
      </div>
      <div className="cart-items-list">
        {groupCartItems().map((item, index) => {
          const itemTotalPrice = calculateItemTotal(item, index);
          const hasVegetables = Array.isArray(item.selectedOptions?.vegetables) && item.selectedOptions.vegetables.length > 0;
          const hasAdditions = Array.isArray(item.selectedOptions?.additions) && item.selectedOptions.additions.length > 0;
          const vegetables = hasVegetables ? VEGETABLES_ORDER.filter((v) => item.selectedOptions.vegetables.includes(v)).join(", ") : "";
          const additions = hasAdditions ? item.selectedOptions.additions.map((add) => add.addition).join(", ") : "";

          return (
            <div className="cart-item-card" key={index}>
              <img className="cart-item-image" src={item.img} alt={resolveItemName(item)} />
              <div className="cart-item-details">
                <div className="cart-item-top">
                  <div>
                    <h3 className="cart-item-title">{resolveItemName(item)}</h3>
                    <div className="cart-item-sub">
                      {item.isWeighted ? <span>{`${item.quantity} ${t("modal.grams", "גרם")}`}</span> : null}
                    </div>
                  </div>
                  <div className="cart-item-prices">
                    {item.quantity > 1 && <span className="cart-item-unit">₪{item.price}</span>}
                    <span className="cart-item-total">₪{itemTotalPrice}</span>
                  </div>
                </div>
                <div className="cart-item-meta">
                  {hasVegetables && (
                    <span>
                      {t("cartPage.vegetablesLabel", "ירקות")}: {vegetables}
                    </span>
                  )}
                  {hasAdditions && (
                    <span>
                      {t("cartPage.additionsLabel", "תוספות")}: {additions}
                    </span>
                  )}
                  {item.comment && (
                    <span>
                      {t("cartPage.commentLabel", "הערות")}: {item.comment}
                    </span>
                  )}
                </div>
                <div className="cart-item-bottom">
                  {!item.isWeighted && (
                    <QuantitySelector
                      quantity={item.quantity}
                      initialQuantity={item.quantity}
                      minQuantity={1}
                      maxQuantity={99}
                      size="sm"
                      variant="cart"
                      label={t("cartPage.quantityLabel", "כמות")}
                      onChange={(nextQuantity) => updateItemQuantity(item.id, nextQuantity)}
                    />
                  )}
                  <button
                    className="cart-remove"
                    onClick={() => removeFromCart(item.id)}
                    aria-label={t("cartPage.remove", "הסר")}
                  >
                    <img className="cart-remove-icon" src="/recycle-bin.png" alt="" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="cart-coupon">
        <h4>{t("cartPage.couponTitle", "קוד קופון")}</h4>
        <div className="cart-coupon-row">
          <input
            type="text"
            placeholder={t("cartPage.couponPlaceholder", "הכנס קוד")}
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
          />
          {!appliedCoupon ? (
            <button onClick={handleApplyCoupon}>{t("cartPage.couponApply", "החל")}</button>
          ) : (
            <button className="danger" onClick={handleRemoveCoupon}>
              {t("cartPage.couponRemove", "הסר")}
            </button>
          )}
        </div>
        {appliedCoupon && (
          <div className="cart-coupon-success">
            {t("cartPage.couponApplied", "הקופון הופעל")}: {appliedCoupon}
          </div>
        )}
        {isCouponChecking && <div className="cart-coupon-muted">{t("cartPage.couponChecking", "בודק קופון...")}</div>}
        {couponError && <div className="cart-coupon-error">{couponError}</div>}
        {!appliedCoupon && <div className="cart-coupon-muted">{t("cartPage.couponHint", "הזן קוד קופון תקף")}</div>}
      </div>
      <div className="cart-store-comment" style={{ marginTop: "16px" }}>
        <h4 style={{ direction: "rtl", textAlign: "right", marginBottom: "5px" }}>
          {t("cartPage.storeCommentLabel", "הערה למסעדה")}:
        </h4>
        <textarea
          placeholder={t("cartPage.storeCommentPlaceholder", "הכנס הערה כללית למסעדה (לא חובה)")}
          value={storeComment}
          onChange={(e) => setStoreComment(e.target.value)}
          rows={3}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            resize: "vertical",
          }}
        />
      </div>
      <div className="cart-actions">
        {console.log("🎯 eligibleReward:", eligibleReward, "couponApplied:", couponApplied)}
        {eligibleReward && !couponApplied && (
          <button
            className="cart-reward-button"
            onClick={() => setCouponApplied(true)}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#059669")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#10b981")}
          >
            🎉 {eligibleReward === "drink" ? t("cartPage.rewardDrink", "קופון לשתייה חינם") : t("cartPage.rewardSide", "קופון לתוספת חינם")}
          </button>
        )}
      </div>
    </div>
  );

  if (user === undefined) {
    return null; // Wait for AuthContext to resolve
  }
  if (isDrawer && !isOpen) {
    return null;
  }

  const isEmptyCart = cartItems.length === 0;

  return (
    <>
      {!isDrawer && <CartNavbar />}
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
          <p style={{ fontSize: "18px", fontWeight: "bold", color: "#16a34a" }}>
            {t("cartPage.orderSuccessToast", "ההזמנה נשלחה בהצלחה!")}
          </p>
        </div>
      )}

      {isDrawer ? (
        <div className="cart-drawer-overlay" onClick={onClose}>
          <div className="cart-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cart-drawer-header">
              <button className="cart-drawer-close" type="button" onClick={onClose} aria-label="Close cart">
                ×
              </button>
              <div className="cart-drawer-title">
                <h2>{t("cartPage.title", "העגלה שלך")}</h2>
                <span className="cart-drawer-subtitle">
                  {t("cartPage.itemsCount", "יש לך")} {groupCartItems().length} {t("cartPage.itemsSuffix", "פריטים בעגלה")}
                </span>
              </div>
              <div className="cart-drawer-steps" aria-hidden="true">
                <span className={`cart-drawer-step-icon ${drawerStep === "items" ? "active" : ""}`}>
                  <img src="/shopping-bag.png" alt="" />
                </span>
                <span className={`cart-drawer-step-icon ${drawerStep === "checkout" ? "active" : ""}`}>
                  <img src="/payment.png" alt="" />
                </span>
              </div>
            </div>
            <div className="cart-drawer-body">
              {isEmptyCart ? (
                <div className="cart-drawer-empty">
                  <h2>{t("cartPage.empty", "העגלה שלך ריקה")}</h2>
                </div>
              ) : drawerStep === "items" ? (
                renderItemsSection()
              ) : (
                <div className="cart-checkout" id="checkout-panel">
                  {renderCheckoutContent(true)}
                </div>
              )}
            </div>
            {!isEmptyCart && (
              <div className="cart-drawer-footer">
                {drawerStep === "items" ? (
                  <>
                    <div className="cart-drawer-total">
                      {t("cartPage.total", "סה\"כ לתשלום")}: {calculateFinalTotal()} ILS
                    </div>
                    <button className="cart-drawer-primary" type="button" onClick={() => setDrawerStep("checkout")}>
                      {t("cartPage.toCheckout", "להמשך לתשלום")}
                    </button>
                  </>
                ) : (
                  <button className="cart-drawer-secondary" type="button" onClick={() => setDrawerStep("items")}>
                    {t("cartPage.backToCart", "חזרה לעגלה")}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : isEmptyCart ? (
        <div style={{ padding: "20px" }}>
          <h2>{t("cartPage.empty", "העגלה שלך ריקה")}</h2>
        </div>
      ) : (
        <div className="cart-layout">
          {renderItemsSection()}
          <aside className="cart-checkout" id="checkout-panel">
            {renderCheckoutContent(true)}
          </aside>
        </div>
      )}

      {showPolicyModal && (
        <div className="modal-overlay" onClick={() => setShowPolicyModal(false)} style={{ zIndex: 3000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ direction: "rtl", textAlign: "right" }}>{t("cartPage.policyTitle", "מדיניות ביטולים והחזרים")}:</h2>
            <div style={{ direction: "rtl", textAlign: "right", maxHeight: "70vh", overflowY: "auto" }}>
              <p>• {t("cartPage.policyLine1", "ניתן לבטל הזמנה תוך 5 דקות ממועד ההזמנה כל עוד לא התחילה ההכנה.")}</p>
              <p>• {t("cartPage.policyLine2", "לאחר תחילת ההכנה או יציאת המשלוח – לא ניתן לבטל את ההזמנה.")}</p>
              <p>
                • {t("cartPage.policyLine3", "החזר כספי יתבצע באותו אמצעי תשלום, עד 5% או 100 ₪ דמי ביטול (הנמוך מביניהם) בהתאם לחוק.")}
              </p>
              <p>• {t("cartPage.policyLine4", "במקרה של טעות מצד המסעדה (למשל מנה לא נכונה או לא סופקה) – הלקוח זכאי להחזר מלא או אספקה מחדש.")}</p>
            </div>
          </div>
        </div>
      )}

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
        .cart-layout {
          display: flex;
          padding: 100px 20px 20px;
          gap: 24px;
          align-items: flex-start;
        }

        .cart-main {
          flex: 1;
          min-width: 0;
        }

        .cart-header h2 {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 6px 0;
        }

        .cart-subtitle {
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 16px;
        }

        .cart-items-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .cart-item-card {
          display: flex;
          gap: 16px;
          background: #ffffff;
          border-radius: 16px;
          padding: 14px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
        }

        .cart-item-image {
          width: 92px;
          height: 92px;
          border-radius: 12px;
          object-fit: cover;
        }

        .cart-item-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .cart-item-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .cart-item-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
        }

        .cart-item-sub {
          margin: 4px 0 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .cart-item-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 13px;
          color: #475569;
        }

        .cart-item-prices {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .cart-item-bottom {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 30px;
          font-weight: 600;
        }

        .cart-item-unit {
          color: #0f172a;
          font-size: 14px;
        }

        .cart-item-total {
          color: #111827;
          font-size: 16px;
        }

        .cart-remove {
          background: #ef4444;
          border: none;
          padding: 6px 10px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .cart-remove-icon {
          width: 14px;
          height: 14px;
          display: block;
          filter: brightness(0) invert(1);
        }

        .cart-summary {
          margin-top: 18px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 12px 16px;
          font-weight: 600;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .cart-coupon {
          margin-top: 16px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 12px 16px;
          max-width: 420px;
          direction: rtl;
          text-align: right;
          font-size: 13px;
        }

        .cart-coupon h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
        }

        .cart-coupon-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .cart-coupon-row input {
          flex: 1 1 160px;
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid #cbd5f5;
          font-size: 12px;
          box-sizing: border-box;
        }

        .cart-coupon-row button {
          background: #2563eb;
          color: #fff;
          padding: 6px 10px;
          border-radius: 6px;
          border: none;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
        }

        .cart-coupon-row button.danger {
          background: #ef4444;
        }

        .cart-coupon-success {
          margin-top: 6px;
          color: #16a34a;
        }

        .cart-coupon-muted {
          margin-top: 6px;
          color: #6b7280;
          font-size: 11px;
        }

        .cart-coupon-error {
          margin-top: 6px;
          color: #dc2626;
        }

        .cart-actions {
          margin-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .cart-reward-button {
          background: #10b981;
          color: #fff;
          padding: 12px 20px;
          border-radius: 999px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s ease;
        }

        .cart-checkout {
          width: 380px;
          position: sticky;
          top: 20px;
          align-self: flex-start;
        }

        .checkout-panel {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 20px;
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.15);
        }

        .cart-drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          display: flex;
          justify-content: center;
          align-items: flex-end;
          z-index: 1200;
        }

        .cart-drawer-panel {
          width: min(920px, 100%);
          max-height: 92vh;
          background: #f8fafc;
          border-radius: 24px 24px 0 0;
          box-shadow: 0 -10px 30px rgba(15, 23, 42, 0.25);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: slideUp 0.25s ease-out;
        }

        .cart-drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 22px;
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          gap: 16px;
        }

        .cart-drawer-title h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
        }

        .cart-drawer-subtitle {
          display: block;
          font-size: 12px;
          color: #64748b;
          margin-top: 4px;
        }

        .cart-drawer-steps {
          display: flex;
          gap: 8px;
        }

        .cart-drawer-step-icon {
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #e2e8f0;
          font-size: 14px;
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .cart-drawer-step-icon img {
          width: 16px;
          height: 16px;
          object-fit: contain;
        }

        .cart-drawer-step-icon.active {
          background: #F4511F;
          transform: scale(1.05);
        }

        .cart-drawer-close {
          border: 1px solid #000000 !important;
          background: #000000 !important;
          color: #ffffff !important;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: none;
          outline: none;
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
        }

        .cart-drawer-close:hover {
          transform: translateY(-1px);
          box-shadow: none;
          border-color: #000000;
        }

        .cart-drawer-body {
          padding: 18px 22px 10px;
          overflow-y: auto;
          flex: 1;
        }

        .cart-drawer-body .cart-checkout {
          width: 100%;
          position: static;
        }

        .cart-drawer-empty {
          padding: 40px 10px;
          text-align: center;
        }

        .cart-drawer-footer {
          padding: 16px 22px 24px;
          background: #ffffff;
          border-top: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .cart-drawer-total {
          font-weight: 700;
          color: #0f172a;
          font-size: 16px;
        }

        .cart-drawer-primary {
          background: #16a34a;
          color: #ffffff;
          border: none;
          padding: 12px 22px;
          border-radius: 999px;
          font-weight: 700;
          cursor: pointer;
        }

        .cart-drawer-secondary {
          background: #e2e8f0;
          color: #0f172a;
          border: none;
          padding: 10px 18px;
          border-radius: 999px;
          font-weight: 600;
          cursor: pointer;
        }

        .cart-drawer-panel button:not(.cart-remove):not(.cart-drawer-close):not(.payment-button):not(.delivery-button):not(.submit-order-button):not(.payment-retry-button) {
          background-color: #0f172a !important;
          border-color: #0f172a !important;
          color: #ffffff !important;
        }

        .cart-drawer-panel button:disabled {
          background-color: #6b7280 !important;
          border-color: #6b7280 !important;
          cursor: not-allowed !important;
        }

        .cart-drawer-panel .cart-remove {
          background-color: #ef4444 !important;
          border-color: #ef4444 !important;
          color: #ffffff !important;
        }

        @keyframes slideUp {
          from {
            transform: translateY(30%);
          }
          to {
            transform: translateY(0);
          }
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

        .cart-layout button:not(.quantity-selector-btn),
        .cart-drawer-panel button:not(.quantity-selector-btn) {
          padding: 10px 20px;
          background-color: #007bff;
          color: #fff;
          border-radius: 5px;
          font-size: 16px;
          cursor: pointer;
        }
        @media (max-width: 1024px) {
          .cart-layout {
            flex-direction: column;
          }

          .cart-checkout {
            width: 100%;
            position: static;
            top: auto;
          }
        }

        @media (max-width: 768px) {
          .cart-layout {
            padding: 88px 14px 20px;
            gap: 18px;
          }

          .cart-item-card {
            flex-direction: column;
            align-items: flex-start;
          }

          .cart-item-image {
            width: 100%;
            height: 180px;
          }

          .cart-item-top {
            flex-direction: column;
            align-items: flex-start;
          }

          .cart-item-prices {
            align-items: flex-start;
          }

          .cart-remove {
            align-self: flex-start;
          }

          .cart-item-bottom {
            width: 100%;
            justify-content: space-between;
            align-items: flex-end;
            gap: 8px;
          }

          .cart-item-bottom .quantity-selector {
            margin-left: auto;
            max-width: 170px;
            justify-content: space-between;
            transform: scale(0.8);
            transform-origin: right bottom;
          }

          .cart-item-bottom .cart-remove {
            margin-right: auto;
            align-self: flex-end;
          }

          .cart-summary,
          .cart-coupon,
          .checkout-panel {
            width: 100%;
          }

          .cart-coupon-row {
            flex-direction: column;
          }

          .cart-coupon-row button {
            width: 100%;
          }

          .cart-drawer-panel .cart-coupon-row input {
            height: 22px !important;
            max-height: 22px !important;
            padding: 3px 6px !important;
            font-size: 11px !important;
            line-height: 1 !important;
          }

          .modal-delivery-buttons {
            flex-direction: column;
            align-items: stretch;
          }

          .modal-delivery-buttons button {
            width: 100%;
          }

          .cart-drawer-header {
            flex-wrap: wrap;
            align-items: flex-start;
          }

          .cart-drawer-title h2 {
            font-size: 18px;
          }

          .cart-drawer-subtitle {
            font-size: 11px;
          }

          .cart-drawer-footer {
            flex-direction: column;
            align-items: stretch;
          }

          .cart-drawer-primary,
          .cart-drawer-secondary {
            width: 100%;
            text-align: center;
          }
        }

        @media (max-width: 600px) {
          .cart-drawer-panel .cart-header {
            display: none;
          }

          .cart-drawer-panel .cart-items-list {
            gap: 10px;
          }

          .cart-drawer-panel .cart-item-card {
            flex-direction: row;
            align-items: flex-start;
            padding: 10px;
            gap: 12px;
          }

          .cart-drawer-panel .cart-item-image {
            width: 64px;
            height: 64px;
            border-radius: 8px;
          }

          .cart-drawer-panel .cart-item-details {
            flex-direction: column;
            align-items: stretch;
            gap: 6px;
            width: 100%;
          }

          .cart-drawer-panel .cart-item-details {
            position: relative;
            padding-bottom: 26px;
          }

          .cart-drawer-panel .cart-item-top {
            flex: 1;
            align-items: flex-start;
            justify-content: flex-start;
            gap: 8px;
          }

          .cart-drawer-panel .cart-item-title {
            font-size: 15px;
          }

          .cart-drawer-panel .cart-item-sub {
            font-size: 12px;
          }

          .cart-drawer-panel .cart-item-meta {
            display: grid;
            gap: 2px;
            font-size: 11px;
          }

          .cart-drawer-panel .cart-item-bottom {
            align-self: flex-start;
            text-align: left;
            min-width: 0;
          }

          .cart-drawer-panel .cart-item-prices .cart-item-unit {
            display: none;
          }

          .cart-drawer-panel .cart-item-unit,
          .cart-drawer-panel .cart-item-total {
            font-size: 13px;
          }

          .cart-drawer-panel .cart-remove {
            order: -1;
            padding: 6px 10px;
            font-size: 12px;
            align-self: flex-start;
            position: absolute;
            left: 0;
            bottom: 0;
          }
        }

        @media (max-width: 480px) {
          .cart-layout {
            padding-top: 80px;
          }

          .cart-item-image {
            height: 130px;
          }

          .cart-item-title {
            font-size: 15px;
          }

          .cart-item-total {
            font-size: 14px;
          }

          .cart-item-card {
            padding: 10px;
            gap: 12px;
          }

          .cart-item-details {
            gap: 8px;
          }

          .cart-item-meta {
            font-size: 12px;
          }

          .cart-coupon {
            padding: 10px 12px;
            font-size: 12px;
          }

          .cart-coupon h4 {
            font-size: 13px;
          }

          .cart-coupon-row input {
            padding: 6px 8px;
            font-size: 12px;
            height: 34px;
          }

          .cart-drawer-panel .cart-coupon-row input {
            padding: 2px 6px !important;
            font-size: 10px !important;
            height: 20px !important;
            min-height: 0 !important;
            line-height: 1 !important;
          }

          .cart-coupon-row button {
            padding: 6px 10px;
            font-size: 12px;
          }

          .modal-content {
            padding: 20px;
            width: 95%;
          }

          .modal-buttons {
            flex-direction: column;
            gap: 10px;
          }

          .modal-buttons button {
            width: 100%;
          }
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

        
      `}</style>

      <ClosedModal isOpen={isClosedModalOpen} onClose={handleCloseModal} />
    </>
  );
};

export default CartPage;
