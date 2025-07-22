import React, { useEffect, useRef } from "react";

const TranzilaPayment = ({ onChargeSuccess, amount, userPhone }) => {
  const initialized = useRef(false);

  useEffect(() => {
    if (!window.TzlaHostedFields || initialized.current) return;

    initialized.current = true;

    window.fields = window.TzlaHostedFields.create({
      sandbox: false, // set true for testing
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
        terminal_name: "hungryvisa", // replace with your terminal
        amount: amount,
        contact: userPhone || "",
      },
      (err, response) => {
        if (err) {
          console.error("Tranzila error:", err);
          alert("בעיה בתשלום. נסה שוב");
          return;
        }
        console.log("Tranzila success:", response);
        onChargeSuccess(response);
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} style={{ direction: "rtl" }}>
      <div style={{ marginBottom: "15px" }}>
        <label htmlFor="credit_card_number">מספר כרטיס:</label>
        <div
          id="credit_card_number"
          style={{
            height: "45px",
            borderRadius: "6px",
            overflow: "hidden",
          }}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label htmlFor="cvv">CVV:</label>
        <div
          id="cvv"
          style={{
            height: "45px",
            borderRadius: "6px",
            overflow: "hidden",
          }}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label htmlFor="expiry">תוקף:</label>
        <div
          id="expiry"
          style={{
            height: "45px",
            borderRadius: "6px",
            overflow: "hidden",
          }}
        />
      </div>

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
