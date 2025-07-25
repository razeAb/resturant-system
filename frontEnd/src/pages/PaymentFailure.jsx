import { useEffect } from "react";

const PaymentFailure = () => {
  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage({ type: "tranzila-payment-failure" }, "*");
    } else if (window.parent) {
      window.parent.postMessage({ type: "tranzila-payment-failure" }, "*");
    }
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "40px" }}>
      <h2>התשלום נכשל</h2>
      <p>אנא נסו שוב או פנו לתמיכה.</p>
    </div>
  );
};

export default PaymentFailure;
