import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCartShopping, faMoneyBillWave, faTruck, faCreditCard } from "@fortawesome/free-solid-svg-icons";
import { useLang } from "../../context/LangContext";
import "./CheckoutStepper.css";

const CheckoutStepper = ({ currentStep = 1 }) => {
  const { t, dir } = useLang();
  const steps = [
    { label: t("checkoutSteps.cart", "Cart"), icon: faCartShopping },
    { label: t("checkoutSteps.billing", "Billing"), icon: faMoneyBillWave },
    { label: t("checkoutSteps.shipping", "Shipping"), icon: faTruck },
    { label: t("checkoutSteps.payment", "Payment"), icon: faCreditCard },
  ];

  return (
    <div className={`checkout-steps ${dir === "rtl" ? "rtl" : ""}`} aria-label={t("checkoutSteps.label", "Checkout steps")}>
      <div className="checkout-steps-track">
        {steps.map((step, index) => {
          const number = index + 1;
          const isActive = number === currentStep;
          const isDone = number < currentStep;
          return (
            <div key={`${step.label}-${number}`} className={`checkout-step ${isActive ? "active" : ""} ${isDone ? "done" : ""}`} aria-current={isActive ? "step" : undefined}>
              <div className="checkout-step-number">{number}</div>
              <div className="checkout-step-circle" aria-hidden="true">
                <FontAwesomeIcon icon={step.icon} />
              </div>
              <div className="checkout-step-label">{step.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CheckoutStepper;
