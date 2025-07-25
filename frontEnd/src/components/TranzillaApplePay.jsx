import React, { useRef, useEffect } from "react";
import React, { useEffect, useState } from "react";
import axios from "axios";
const TERMINAL_NAME = import.meta.env.VITE_TRANZILA_TERMINAL;

const TranzilaApplePay = ({ amount, onChargeSuccess }) => {
  const [thtk, setThtk] = useState(null);
  const [showButton, setShowButton] = useState(false);
  useEffect(() => {
    const fetchHandshake = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/payments/apple-pay-handshake`);
        if (data && data.thtk) {
          setThtk(data.thtk);
          if (window.ApplePaySession) {
            setShowButton(true);
          }
        }
      } catch (err) {
        console.error("Failed to get Apple Pay handshake", err);
      }
    };
    fetchHandshake();
  }, []);

  const handleApplePay = () => {
    if (!window.hfChargeApple || !thtk) return;

    window.hfChargeApple(
      {
        terminal_name: TERMINAL_NAME,
        currency_code: "ILS",
        amount,
        tran_mode: "A",
        thtk,
        labelApple: "Order Payment",
      },
      (err, response) => {
        if (err) {
          console.error("Apple Pay error", err);
          return;
        }
        onChargeSuccess && onChargeSuccess(response);
      }
    );
  };

  if (!showButton) return null;

  return (
    <button id="payApple" className="pay_button" onClick={handleApplePay} style={{ display: "block" }}>
      Pay with <img src="./assets/images/applepay_logo.png" alt="Apple Pay" />
    </button>
  );
};

export default TranzilaApplePay;
