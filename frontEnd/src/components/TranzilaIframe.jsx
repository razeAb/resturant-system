import React, { useEffect, useRef } from "react";

const TranzilaIframe = ({ amount, orderId, onSuccess, onFailure }) => {
  const formRef = useRef(null);
  const iframeRef = useRef(null);

  const supplier = "0054874";
  const terminal = "hungryvisa";

  const base = window.location.origin;
  const successUrl = `${base}/payment-success.html?orderId=${encodeURIComponent(orderId)}`;
  const failUrl = `${base}/payment-failure.html?orderId=${encodeURIComponent(orderId)}`;

  // Load Apple Pay JS
  useEffect(() => {
    const script = document.createElement("script");
    script.src = `https://direct.tranzila.com/js/tranzilanapple_v3.js?v=${Date.now()}`;
    script.async = true;
    document.body.appendChild(script);
    console.log("✅ Tranzila Apple Pay script loaded");
  }, []);

  // Auto-submit the form
  useEffect(() => {
    if (formRef.current) {
      console.log("📤 Submitting Tranzila payment form...");
      formRef.current.submit();
    } else {
      console.warn("⚠️ formRef is null, cannot submit form");
    }
  }, []);

  // Listen for result from iframe
  useEffect(() => {
    const handleMessage = (e) => {
      console.log("📩 Received postMessage:", e.data);
      if (e.data?.type === "tranzila-payment-success") {
        console.log("✅ Payment successful for Order ID:", e.data.orderId);
        onSuccess?.(e.data.orderId);
      } else if (e.data?.type === "tranzila-payment-failure") {
        console.error("❌ Payment failed for Order ID:", e.data.orderId);
        onFailure?.(e.data.orderId);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSuccess, onFailure]);

  console.log("🔁 TranzilaIframe rendered with:", { amount, orderId, successUrl, failUrl });

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
        <input type="hidden" name="sum" value={amount} />
        <input type="hidden" name="currency" value="1" />
        <input type="hidden" name="terminal" value={terminal} />
        <input type="hidden" name="cred_type" value="1" />
        <input type="hidden" name="apple_pay" value="1" />
        <input type="hidden" name="google_pay" value="1" />
        <input type="hidden" name="tranmode" value="A" />
        <input type="hidden" name="success_url_address" value={successUrl} />
        <input type="hidden" name="fail_url_address" value={failUrl} />
        <input type="hidden" name="lang" value="il" />
        <input type="hidden" name="nologo" value="1" />
        <input type="hidden" name="trBgColor" value="#ffffff" />
        <input type="hidden" name="trButtonColor" value="#1d4ed8" />
        <input type="hidden" name="order_id" value={orderId} />
      </form>

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
          ref={iframeRef}
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
