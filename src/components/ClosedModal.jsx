import React from "react";
import "./AlertModal.css"; // Import styling from your previous modal CSS

const ClosedModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="alert-modal-overlay">
      <div className="alert-modal" style={{ direction: "rtl", textAlign: "right" }}>
        <h2>המסעדה סגורה היום</h2>
        <p>המסעדה סגורה ביום רביעי. נא לנסות מחר או ביום אחר להזמנה.</p>
        <button className="close-button" onClick={onClose}>
          סגור
        </button>
      </div>
    </div>
  );
};

export default ClosedModal;
