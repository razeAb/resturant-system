import React, { useRef, useEffect } from "react";

const TERMINAL_NAME = "hungryvisa"; // replace with your Tranzila terminal name

const TranzilaGooglePay = ({ amount, onSuccess }) => {
  const formRef = useRef(null);
  const iframeRef = useRef(null);
  useEffect(() => {
    if (formRef.current) {
      formRef.current.submit();
    }
  }, [amount]);

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data && e.data.type === "tranzila-payment-success") {
        onSuccess && onSuccess();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSuccess]);

  const successUrl = `${window.location.origin}/payment-success`;

  return (
    <div style={{ width: "100%", height: "600px" }}>
      <form ref={formRef} action={`https://direct.tranzila.com/${TERMINAL_NAME}/iframenew.php`} method="POST" target="tranzila_google">
        <input type="hidden" name="sum" value={amount} />
        <input type="hidden" name="google_pay" value="1" />
        <input type="hidden" name="currency" value="1" />
        <input type="hidden" name="success_url_address" value={successUrl} />
        <input type="hidden" name="fail_url_address" value="https://example.com/failure" />
      </form>
      <iframe
        ref={iframeRef}
        title="Google Pay"
        name="tranzila_google"
        allow="payment"
        style={{ width: "100%", height: "100%", border: "none" }}
      />
    </div>
  );
};

export default TranzilaGooglePay;
