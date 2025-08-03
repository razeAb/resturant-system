import { useEffect } from "react";

const PaymentSuccess = () => {
  const notifyParent = (params) => {
    const message = { type: "tranzila-payment-success", payload: params };

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(message, "*");
        window.close();
      } else if (window.parent !== window) {
        window.parent.postMessage(message, "*");
      }
    } catch (err) {
      console.warn("⚠️ Failed to notify parent or opener:", err);
    }
  };

  const notifyBackend = async (params) => {
    try {
      const res = await fetch("https://resturant-system-3f33.onrender.com/api/orders/success", {
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

    // ✅ Send order to backend
    notifyBackend(params);

    // ✅ Try to notify parent
    notifyParent(params);

    // ⏳ Optional: fallback redirect after 5 seconds (if nothing happens)
    const timeout = setTimeout(() => {
      console.log("⏳ Redirecting manually after timeout...");
      window.location.href = "/";
    }, 8000);

    return () => clearTimeout(timeout);
  }, []);

  const handleManualNotify = () => {
    const params = Object.fromEntries(new URLSearchParams(window.location.search));
    notifyParent(params);
  };

  return (
    <div style={{ textAlign: "center", padding: "40px", direction: "rtl" }}>
      <h2>תודה על ההזמנה!</h2>
      <p>התשלום התקבל בהצלחה. אם ההזמנה לא התחילה אוטומטית, לחץ על הכפתור למטה.</p>
      <button
        onClick={handleManualNotify}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          backgroundColor: "#10b981",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        התחל את ההזמנה
      </button>
    </div>
  );
};

export default PaymentSuccess;
