import React from "react";
import { Link } from "react-router-dom";
import "./SideMenu.css";

const SideMenu = () => {
  return (
    <aside className="custom-sidebar always-open">
      <div className="menu-items">
        <Link to="/admin/dashboard" className="menu-link">
          Dashboard
        </Link>
        <Link to="/admin/products" className="menu-link">
          Products
        </Link>
        <Link to="/admin/activeOrders" className="menu-link">
          Active Orders
        </Link>
        <Link to="/admin/orderHistory" className="menu-link">
          Order History
        </Link>
        <Link to="/" className="menu-link">
          Go Back Home
        </Link>
      </div>
    </aside>
  );
};

export default SideMenu;
