import React, { useEffect, useRef } from "react";

const TranzilaIframe = ({ amount, onSuccess, onFailure }) => {
  const formRef = useRef(null);

  const successUrl = `${window.location.origin}/payment-success`;
  const failUrl = `${window.location.origin}/payment-failure`;
  const terminal = import.meta.env.VITE_TRANZILA_TERMINAL || "hungry";

  // ✅ Auto-submit on mount
  useEffect(() => {
    if (formRef.current) {
      formRef.current.submit();
    }
  }, []);

  // ✅ Listen for success/failure
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === "tranzila-payment-success") {
        onSuccess?.();
      } else if (e.data?.type === "tranzila-payment-failure") {
        onFailure?.();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onSuccess, onFailure]);

  return (
    <div style={{ marginTop: "20px" }}>
      <form
        ref={formRef}
        action={`https://direct.tranzila.com/${terminal}/iframenew.php`}
        method="POST"
        target="tranzila-frame"
        noValidate
        autoComplete="off"
        style={{ textAlign: "center" }}
      >
        {/* Payment core settings */}
        <input type="hidden" name="sum" value={amount} />
        <input type="hidden" name="currency" value="1" />
        <input type="hidden" name="success_url_address" value={successUrl} />
        <input type="hidden" name="fail_url_address" value={failUrl} />

        {/* Language and branding */}
        <input type="hidden" name="lang" value="il" />
        <input type="hidden" name="nologo" value="1" />
        <input type="hidden" name="trBgColor" value="#ffffff" />
        <input type="hidden" name="trButtonColor" value="#1d4ed8" />

        {/* Modern payment methods */}
        <input type="hidden" name="bit_pay" value="1" />
        <input type="hidden" name="google_pay" value="1" />
      </form>

      {/* Iframe container - adjusted to remove gap */}
      <div
        style={{
          width: "100%",
          height: "565px", // tweak as needed
          margin: 0,
          padding: 0,
          overflow: "hidden",
          border: "none",
        }}
      >
        <iframe
          name="tranzila-frame"
          allow="payment"
          allowpaymentrequest="true"
          scrolling="no"
          frameBorder="0"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
            transform: "scale(0.965)",
            transformOrigin: "top",
          }}
        />
      </div>
    </div>
  );
};

export default TranzilaIframe;
