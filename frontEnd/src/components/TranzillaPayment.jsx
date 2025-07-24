import React, { useEffect, useRef, useState } from "react";

const TranzilaPayment = ({ onChargeSuccess, amount, userPhone }) => {
  const initialized = useRef(false);
  const [cardHolderId, setCardHolderId] = useState("");

  useEffect(() => {
    if (!window.TzlaHostedFields || initialized.current) return;

    initialized.current = true;

    window.fields = window.TzlaHostedFields.create({
      sandbox: false,
      fields: {
        credit_card_number: {
          selector: "#credit_card_number",
          placeholder: "4580 4580 4580 4580",
          tabindex: 1,
        },
        cvv: {
          selector: "#cvv",
          placeholder: "123",
          tabindex: 2,
        },
        expiry: {
          selector: "#expiry",
          placeholder: "MM/YY",
          tabindex: 3,
        },
      },
      styles: {
        input: {
          fontSize: "14px",
          padding: "6px",
          border: "1px solid #ccc",
          borderRadius: "6px",
          width: "100%",
          boxSizing: "border-box",
        },
      },
    });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!window.fields) return;

    window.fields.charge(
      {
        terminal_name: "hungryvisa",
        amount: amount,
        contact: userPhone || "",
        card_holder_id_number: cardHolderId || "", // ✅ from input field
      },
      (err, response) => {
        if (err) {
          console.error("Tranzila error:", err);
          alert("שגיאה בתשלום. נסה שוב.");
          return;
        }

        console.log("Tranzila success:", response);
        onChargeSuccess(response);
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} style={{ direction: "rtl" }}>
      {/* 🆔 Input field for Teudat Zehut */}
      <div style={{ marginBottom: "15px" }}>
        <label>תעודת זהות של בעל הכרטיס:</label>
        <input
          type="text"
          value={cardHolderId}
          onChange={(e) => setCardHolderId(e.target.value)}
          placeholder="הכנס ת.ז"
          required
          style={{
            width: "100%",
            padding: "10px",
            fontSize: "14px",
            border: "1px solid #ccc",
            borderRadius: "6px",
          }}
        />
      </div>

      {/* 💳 Tranzila Hosted Fields */}
      <div style={{ marginBottom: "15px" }}>
        <label htmlFor="credit_card_number">מספר כרטיס:</label>
        <div id="credit_card_number" style={{ height: "45px", borderRadius: "6px", overflow: "hidden" }} />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label htmlFor="cvv">CVV:</label>
        <div id="cvv" style={{ height: "45px", borderRadius: "6px", overflow: "hidden" }} />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label htmlFor="expiry">תוקף:</label>
        <div id="expiry" style={{ height: "45px", borderRadius: "6px", overflow: "hidden" }} />
      </div>

      {/* ✅ Submit Button */}
      <button
        type="submit"
        style={{
          marginTop: "20px",
          backgroundColor: "#007bff",
          color: "#fff",
          padding: "10px 20px",
          fontSize: "16px",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          width: "100%",
        }}
      >
        שלם עם כרטיס אשראי
      </button>
    </form>
  );
};

export default TranzilaPayment;
