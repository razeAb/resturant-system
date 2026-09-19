import React, { useEffect, useRef } from "react";

const TranzilaIframe = ({ amount, orderId }) => {
  const formRef = useRef(null);
  const iframeRef = useRef(null);

  const terminal = "hungryvisatok";

  useEffect(() => {
    if (orderId && formRef.current) {
      console.log("📤 Submitting Tranzila payment form...");
      formRef.current.submit();
    } else if (!orderId) {
      console.warn("⚠️ Missing orderId, delaying form submission");
    } else {
      console.warn("⚠️ formRef is null, cannot submit form");
    }
  }, [orderId]);

  console.log("🔁 TranzilaIframe rendered with:", { amount, orderId });

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

        {/* Order tracking - ud1/order_id let the webhook identify which order this is for.
            No notify_url here on purpose: passing one overrides the notify URL configured on
            the Tranzila terminal itself, which already carries the shared secret token our
            webhook requires - a URL built here could never include that token, so every
            charge would get silently 403'd by the webhook instead of confirming the order. */}
        <input type="hidden" name="order_id" value={orderId} />
        <input type="hidden" name="ud1" value={orderId} />
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
