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
          fontSize: "14px",
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "8px",
          height: "40px",
          boxSizing: "border-box",
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
        terminal_name: "0054874", // Replace with your terminal name (store in .env later!)
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

  const fieldBoxStyle = {
    minHeight: "40px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "0 10px",
    marginBottom: "15px",
    display: "flex",
    alignItems: "center",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold",
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="credit_card_number" style={labelStyle}>
          מספר כרטיס:
        </label>
        <div style={fieldBoxStyle}>
          <div id="credit_card_number" className="tranzila-field" style={{ width: "100%" }} />
        </div>
      </div>

      <div>
        <label htmlFor="cvv" style={labelStyle}>
          CVV:
        </label>
        <div style={fieldBoxStyle}>
          <div id="cvv" className="tranzila-field" style={{ width: "100%" }} />
        </div>
      </div>

      <div>
        <label htmlFor="expiry" style={labelStyle}>
          תוקף:
        </label>
        <div style={fieldBoxStyle}>
          <div id="expiry" className="tranzila-field" style={{ width: "100%" }} />
        </div>
      </div>

      <button
        type="submit"
        style={{
          backgroundColor: "#007bff",
          color: "#fff",
          border: "none",
          padding: "10px 20px",
          borderRadius: "8px",
          fontSize: "16px",
          width: "100%",
          marginTop: "15px",
          cursor: "pointer",
        }}
      >
        שלם עם כרטיס אשראי
      </button>
    </form>
  );
};

export default TranzilaPayment;
