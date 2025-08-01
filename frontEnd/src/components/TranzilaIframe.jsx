import React, { useEffect, useRef } from "react";

const TranzilaIframe = ({ amount = 50, onSuccess, onFailure }) => {
  const formRef = useRef(null);

  const supplier = "0054874"; // Your terminal's supplier ID
  const terminal = "hungryvisa"; // Your terminal name

  const basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const successUrl = `${window.location.origin}${basePath}/payment-success/index.html`;
  const failUrl = `${window.location.origin}${basePath}/payment-failure/index.html`;

  // Load Apple Pay JS if needed
  useEffect(() => {
    const script = document.createElement("script");
    script.src = `https://direct.tranzila.com/js/tranzilanapple_v3.js?v=${Date.now()}`;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Submit form automatically on mount
  useEffect(() => {
    if (formRef.current) {
      formRef.current.submit();
    }
  }, []);

  // Listen for iframe messages (success/failure)
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === "tranzila-payment-success") {
        onSuccess?.(e.data.payload);
      } else if (e.data?.type === "tranzila-payment-failure") {
        onFailure?.(e.data.payload);
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
      >
        {/* Required Fields */}
        <input type="hidden" name="supplier" value={supplier} />
        <input type="hidden" name="sum" value={amount} />
        <input type="hidden" name="currency" value="1" /> {/* ILS */}
        <input type="hidden" name="tranmode" value="V" />
        <input type="hidden" name="success_url_address" value={successUrl} />
        <input type="hidden" name="fail_url_address" value={failUrl} />
        <input type="hidden" name="debug" value="1" />

        {/* Optional Appearance */}
        <input type="hidden" name="lang" value="il" />
        <input type="hidden" name="nologo" value="1" />
        <input type="hidden" name="trBgColor" value="#ffffff" />
        <input type="hidden" name="trButtonColor" value="#1d4ed8" />

        {/* Optional Payment Methods */}
        <input type="hidden" name="apple_pay" value="1" />
        <input type="hidden" name="google_pay" value="1" />
      </form>

      <div
        style={{
          width: "100%",
          height: "565px",
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
