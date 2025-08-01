import { useEffect } from "react";

const PaymentSuccess = () => {
  const notifyParent = () => {
    const params = Object.fromEntries(new URLSearchParams(window.location.search));
    if (window.opener) {
      window.opener.postMessage({ type: "tranzila-payment-success", payload: params }, "*");
      window.close();
      window.parent.postMessage({ type: "tranzila-payment-success", payload: params }, "*");
    }
  };

  useEffect(() => {
    notifyParent();
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "40px" }}>
      <h2>Thank you for your order!</h2>
      <p>Your payment was accepted. Press the button below if your order doesn't start automatically.</p>
      <button onClick={notifyParent} style={{ marginTop: "20px" }}>
        Start Preparing Order
      </button>
    </div>
  );
};

export default PaymentSuccess;
