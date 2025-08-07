import React, { useEffect, useRef } from "react";

const TranzilaIframe = ({ amount, orderId, orderData }) => {
  const formRef = useRef(null);
  const iframeRef = useRef(null);

  const terminal = "hungryvisa";

  useEffect(() => {
    const script = document.createElement("script");
    script.src = `https://direct.tranzila.com/js/tranzilanapple_v3.js?v=${Date.now()}`;
    script.async = true;
    document.body.appendChild(script);
    console.log("✅ Tranzila Apple Pay script loaded");
  }, []);

  useEffect(() => {
    if (formRef.current) {
      console.log("📤 Submitting Tranzila payment form...");
      formRef.current.submit(); 
    } else {
      console.warn("⚠️ formRef is null, cannot submit form");
    }
  }, []);

  console.log("🔁 TranzilaIframe rendered with:", { amount, orderId, orderData });

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
        {/* Amount & currency */}
        <input type="hidden" name="sum" value={amount} />
        <input type="hidden" name="currency" value="1" />

        {/* Terminal & options */}
        <input type="hidden" name="terminal" value={terminal} />
        <input type="hidden" name="cred_type" value="1" />
        <input type="hidden" name="apple_pay" value="1" />
        <input type="hidden" name="google_pay" value="1" />
        <input type="hidden" name="tranmode" value="A" />

        {/* Appearance */}
        <input type="hidden" name="lang" value="il" />
        <input type="hidden" name="nologo" value="1" />
        <input type="hidden" name="trBgColor" value="#ffffff" />
        <input type="hidden" name="trButtonColor" value="#1d4ed8" />

        {/* Order tracking */}
        <input type="hidden" name="order_id" value={orderId} />
        <input type="hidden" name="notify_url" value="https://resturant-system-3f33.onrender.com/api/tranzila-webhook" />

        {/* ✅ Send orderData to backend via webhook */}
        <input type="hidden" name="order" value={JSON.stringify(orderData)} />
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
