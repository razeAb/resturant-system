import React, { useEffect, useState } from "react";

const PreparingOrderWidget = ({ estimatedTime = 30 }) => {
  const [timeLeft, setTimeLeft] = useState(estimatedTime * 60); // in seconds

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        backgroundColor: "#facc15", // Tailwind yellow-400
        padding: "12px 16px",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <img src="/svg/food-preparing.gif" alt="Preparing" style={{ width: "40px", height: "40px", marginBottom: "4px" }} />
      <span style={{ fontSize: "14px", fontWeight: "bold" }}>
        ההזמנה מוכנה תוך {minutes}:{seconds.toString().padStart(2, "0")}
      </span>
    </div>
  );
};

export default PreparingOrderWidget;
