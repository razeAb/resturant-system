import React, { useEffect, useRef, useState } from "react";

const TranzilaGooglePay = ({ amount, userPhone, userId, onChargeSuccess }) => {
  const initialized = useRef(false);
  const [isGoogleEnabled, setIsGoogleEnabled] = useState(false);

  useEffect(() => {
    if (!window.TzlaHostedFields || initialized.current) return;

    initialized.current = true;

    // Initialize fields just to enable Google Pay detection
    window.fields = window.TzlaHostedFields.create({
      sandbox: false,
      fields: {
        credit_card_number: {
          selector: "#credit_card_number",
          placeholder: "0000 0000 0000 0000",
        },
        cvv: {
          selector: "#cvv",
          placeholder: "123",
        },
        expiry: {
          selector: "#expiry",
          placeholder: "MM/YY",
        },
      },
    });

    // Show Google Pay button when available
    window.fields.onEvent("googleIsEnable", () => {
      console.log("✅ Google Pay is available");
      setIsGoogleEnabled(true);
    });
  }, []);

  const handleGooglePay = () => {
    if (!window.fields) return;

    console.log("🔄 Charging via Google Pay...");
    window.fields.chargeGpay(
      {
        // REQUIRED
        terminal_name: import.meta.env.VITE_TRANZILA_TERMINAL,
        response_language: "english",
        currency_code: "1", // 1 = NIS
        amount: amount,
        tran_mode: "A",

        // OPTIONAL
        contact: userPhone || "",
        card_holder_id_number: userId || "",
        json_purchase_data: encodeURIComponent(
          JSON.stringify([
            {
              product_name: "Product Example",
              product_quantity: 1,
              product_price: amount,
            },
          ])
        ),
      },
      (err, response) => {
        if (err) {
          console.error("❌ Google Pay Error:", err);
          alert("שגיאה בתשלום עם Google Pay");
          return;
        }

        console.log("✅ Google Pay Success:", response);
        onChargeSuccess(response);
      }
    );
  };

  return (
    <>
      {/* Hidden containers required for Tranzila Hosted Fields */}
      <div id="credit_card_number" style={{ display: "none" }} />
      <div id="cvv" style={{ display: "none" }} />
      <div id="expiry" style={{ display: "none" }} />
      {isGoogleEnabled && (
        <button
          onClick={handleGooglePay}
          style={{
            marginTop: "20px",
            backgroundColor: "#000",
            color: "#fff",
            padding: "12px",
            fontSize: "16px",
            borderRadius: "8px",
            border: "none",
            width: "100%",
            cursor: "pointer",
          }}
        >
          שלם עם Google Pay
        </button>
      )}
    </>
  );
};

export default TranzilaGooglePay;
