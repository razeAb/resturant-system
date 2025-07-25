import React, { useEffect, useRef, useState } from "react";

const TranzilaPayment = ({ onChargeSuccess, amount, userPhone }) => {
  const initialized = useRef(false);
  const [cardHolderId, setCardHolderId] = useState("");
  const [formLoaded, setFormLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initFields = () => {
      if (!window.TzlaHostedFields || initialized.current) return;

      const ccEl = document.getElementById("credit_card_number");
      const cvvEl = document.getElementById("cvv");
      const expiryEl = document.getElementById("expiry");

      if (!ccEl || !cvvEl || !expiryEl) {
        console.warn("❌ Hosted field containers not found yet. Retrying...");
        return;
      }

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
        onLoad: () => {
          console.log("✅ Tranzila fields loaded.");
          setFormLoaded(true);
        },
      });
    };

    const interval = setInterval(() => {
      if (window.TzlaHostedFields) {
        initFields();
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!window.fields) {
      setErrorMsg("שגיאה בטעינת טופס תשלום.");
      return;
    }

    if (cardHolderId.trim().length < 5) {
      setErrorMsg("הכנס תעודת זהות תקינה (לפחות 5 ספרות).");
      return;
    }

    setLoading(true);

    window.fields.charge(
      {
        terminal_name: "hungryvisa",
        amount,
        contact: userPhone || "",
        card_holder_id_number: cardHolderId,
      },
      (err, response) => {
        setLoading(false);

        if (err) {
          console.error("❌ Tranzila error:", err);
          setErrorMsg("שגיאה בתשלום. נסה שוב.");
          return;
        }

        console.log("✅ Tranzila success:", response);
        onChargeSuccess(response);
      }
    );
  };

  if (!formLoaded) {
    return (
      <div style={{ textAlign: "center", padding: "10px" }}>
        <p>📦 טוען טופס תשלום...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ direction: "rtl" }}>
      {/* 🆔 Input for Teudat Zehut */}
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

      {/* ❌ Error message */}
      {errorMsg && <p style={{ color: "red", marginTop: "10px", textAlign: "center" }}>{errorMsg}</p>}

      {/* ✅ Submit Button */}
      <button
        type="submit"
        disabled={loading}
        style={{
          marginTop: "20px",
          backgroundColor: loading ? "#6c757d" : "#007bff",
          color: "#fff",
          padding: "10px 20px",
          fontSize: "16px",
          border: "none",
          borderRadius: "8px",
          cursor: loading ? "not-allowed" : "pointer",
          width: "100%",
        }}
      >
        {loading ? "מבצע תשלום..." : "שלם עם כרטיס אשראי"}
      </button>
    </form>
  );
};

export default TranzilaPayment;
