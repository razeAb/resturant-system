import { useEffect } from "react";

const PaymentSuccess = () => {
  useEffect(() => {
    const params = Object.fromEntries(new URLSearchParams(window.location.search));
    if (window.opener) {
      window.opener.postMessage({ type: "tranzila-payment-success", payload: params }, "*");
      window.close(); // ✅ Auto-close the tab if opened in a new window
    } else if (window.parent) {
      window.parent.postMessage({ type: "tranzila-payment-success", payload: params }, "*");
    }
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "40px" }}>
      <h2>התשלום הצליח</h2>
      <p>ניתן לסגור חלון זה.</p>
    </div>
  );
};

export default PaymentSuccess;
