import React, { useEffect } from "react";

const TranzilaIframe = ({ amount, onSuccess, onFailure }) => {
  const successUrl = `${window.location.origin}/payment-success`;
  const failUrl = `${window.location.origin}/payment-failure`;

  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === "tranzila-payment-success") {
        onSuccess && onSuccess();
      } else if (e.data?.type === "tranzila-payment-failure") {
        onFailure && onFailure();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onSuccess, onFailure]);

  return (
    <div style={{ marginTop: "20px" }}>
      <form
        action={`https://direct.tranzila.com/${terminal}/iframenew.php`}
        method="POST"
        target="tranzila-frame"
        noValidate
        autoComplete="off"
        style={{ textAlign: "center" }}
      >
        <input type="hidden" name="sum" value={amount} />
        <input type="hidden" name="currency" value="1" />
        <input type="hidden" name="buttonLabel" value="Pay" />
        <input type="hidden" name="success_url_address" value={successUrl} />
        <input type="hidden" name="fail_url_address" value={failUrl} />
        <button
          type="submit"
          style={{
            padding: "10px 20px",
            backgroundColor: "#1d4ed8",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          תשלום בכרטיס
        </button>
      </form>
      <div style={{ width: "100%", height: "600px", marginTop: "10px" }}>
        <iframe name="tranzila-frame" allow="payment" style={{ width: "100%", height: "100%", border: "none" }}></iframe>
      </div>
    </div>
  );
};

export default TranzilaIframe;
