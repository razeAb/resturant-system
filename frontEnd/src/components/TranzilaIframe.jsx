import React, { useEffect, useRef } from "react";

const TranzilaIframe = ({ amount, onSuccess, onFailure }) => {
  const formRef = useRef(null);

  const basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const successUrl = `${window.location.origin}${basePath}/payment-success/index.html`;
  const failUrl = `${window.location.origin}${basePath}/payment-failure/index.html`;
  const terminal = "hungryvisa";

  // ✅ Load Apple Pay SDK
  useEffect(() => {
    const script = document.createElement("script");
    script.src = `https://direct.tranzila.com/js/tranzilanapple_v3.js?v=${Date.now()}`;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // ✅ Listen for success/failure messages from iframe
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
        <input type="hidden" name="tranmode" value="A" />
        <input type="hidden" name="success_url_address" value={successUrl} />
        <input type="hidden" name="fail_url_address" value={failUrl} />

        {/* Payment methods */}
        <input type="hidden" name="google_pay" value="1" />
        <input type="hidden" name="apple_pay" value="1" />
        <input type="hidden" name="bit_pay" value="1" />

        {/* Optional styling and language */}
        <input type="hidden" name="lang" value="il" />
        <input type="hidden" name="nologo" value="1" />
        <input type="hidden" name="trBgColor" value="#ffffff" />
        <input type="hidden" name="trButtonColor" value="#1d4ed8" />

        {/* ✅ Hidden submit to let Apple/Google/Bit handle payment */}
        <button type="submit" style={{ display: "none" }}>
          Submit
        </button>
      </form>

      {/* Iframe container */}
      <div
        style={{
          width: "100%",
          height: "565px",
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
