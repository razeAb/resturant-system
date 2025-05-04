import React from "react";
import { Link } from "react-router-dom";
import "./SideMenu.css";

const SideMenu = () => {
  return (
    <aside className="custom-sidebar always-open">
      <div className="menu-items rtl text-right">
        <Link to="/admin/dashboard" className="menu-link">
          לוח בקרה
        </Link>
        <Link to="/admin/products" className="menu-link">
          מוצרים
        </Link>
        <Link to="/admin/activeOrders" className="menu-link">
          הזמנות פעילות
        </Link>
        <Link to="/admin/orderHistory" className="menu-link">
          היסטוריית הזמנות
        </Link>
        <Link to="/" className="menu-link">
          חזרה לדף הראשי
        </Link>
      </div>
    </aside>
  );
};

export default SideMenu;
