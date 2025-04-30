import React from "react";
import "./AlertModal.css"; // Import the CSS for styling

const AlertModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="alert-modal-overlay">
      <div className="alert-modal" style={{ direction: "rtl", textAlign: "right" }}>
        <h2>הזמנה יום מראש</h2>
        <p>
          מוצר זה מצריך הזמנה יום מראש. אנא התקשר ל-
          <a href="tel:+972507203099" style={{ color: "#007bff", textDecoration: "none", direction: "rtl" }}>
            +972507203099
          </a>
          <span> </span>
          להזמנה.
        </p>
        <button className="close-button" onClick={onClose}>
          סגור
        </button>
      </div>
    </div>
  );
};

export default AlertModal;
