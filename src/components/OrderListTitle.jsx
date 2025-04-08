import React from "react";
import "./OrderListTitle.css";

const OrderListTitle = ({ title = "Order List" }) => {
  return (
    <div className="order-list-title">
      <h1>{title}</h1>
    </div>
  );
};

export default OrderListTitle;
