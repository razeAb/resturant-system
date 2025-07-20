import React, { useEffect, useRef } from "react";

const TranzilaPayment = ({ onChargeSuccess, amount, userPhone }) => {
  const initialized = useRef(false);

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
          version: "1",
        },
      },
      styles: {
        input: {
          fontSize: "16px",
          width: "100%",
        },
      },
    });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!window.fields) return;

    window.fields.charge(
      {
        terminal_name: "0054874", // Replace with your terminal name
        amount: amount,
        contact: userPhone || "",
        requested_by_user: "your_api_user", // Optional
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
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="credit_card_number">מספר כרטיס:</label>
        <div id="credit_card_number" className="tranzila-field" />
        <div id="errors_for_number" className="error_message"></div>
      </div>

      <div>
        <label htmlFor="cvv">CVV:</label>
        <div id="cvv" className="tranzila-field" />
        <div id="errors_for_cvv" className="error_message"></div>
      </div>

      <div>
        <label htmlFor="expiry">תוקף:</label>
        <div id="expiry" className="tranzila-field" />
        <div id="errors_for_expiry" className="error_message"></div>
      </div>

      <button type="submit" style={{ marginTop: "15px" }}>
        שלם עם כרטיס אשראי
      </button>
    </form>
  );
};

export default TranzilaPayment;
