import { useEffect } from "react";

const PaymentSuccess = () => {
  const notifyParent = (params) => {
    if (window.opener) {
      window.opener.postMessage({ type: "tranzila-payment-success", payload: params }, "*");
      window.close();
      window.parent.postMessage({ type: "tranzila-payment-success", payload: params }, "*");
    }
  };

  const notifyBackend = async (params) => {
    try {
      const res = await fetch("https://resturant-system-3f33.onrender.com/api/order/success", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      console.log("✅ ההזמנה נשלחה לשרת:", data);
    } catch (error) {
      console.error("❌ שגיאה בשליחת ההזמנה לשרת:", error);
    }
  };

  useEffect(() => {
    const params = Object.fromEntries(new URLSearchParams(window.location.search));

    // שליחת ההזמנה לשרת
    notifyBackend(params);

    // שליחת הודעה חזרה לדף המקורי
    notifyParent(params);
  }, []);

  const handleManualNotify = () => {
    const params = Object.fromEntries(new URLSearchParams(window.location.search));
    notifyParent(params);
  };

  return (
    <div style={{ textAlign: "center", padding: "40px", direction: "rtl" }}>
      <h2>תודה על ההזמנה!</h2>
      <p>התשלום התקבל בהצלחה. אם ההזמנה לא התחילה אוטומטית, לחץ על הכפתור למטה.</p>
      <button onClick={handleManualNotify} style={{ marginTop: "20px" }}>
        התחל את ההזמנה
      </button>
    </div>
  );
};

export default PaymentSuccess;
