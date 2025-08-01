import { useEffect } from "react";

const PaymentFailure = () => {
  useEffect(() => {
    const params = Object.fromEntries(new URLSearchParams(window.location.search));
    if (window.opener) {
      window.opener.postMessage({ type: "tranzila-payment-failure", payload: params }, "*");
      window.close(); // ✅ Close failure tab too if needed
    } else if (window.parent) {
      window.parent.postMessage({ type: "tranzila-payment-failure", payload: params }, "*");
    }
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "40px" }}>
      <h2>התשלום נכשל</h2>
      <p>אנא נסה שוב או פנה לתמיכה.</p>
    </div>
  );
};

export default PaymentFailure;
