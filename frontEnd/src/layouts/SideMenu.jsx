import React from "react";
import { Link } from "react-router-dom";
import "./SideMenu.css";

const SideMenu = ({ onClose }) => {
  return (
    <aside className="custom-sidebar always-open">
      {/* Optional Close Button (Mobile Only) */}
      {onClose && (
        <div className="flex justify-end p-2 md:hidden">
          <button onClick={onClose} className="text-white text-xl">
            ❌
          </button>
        </div>
      )}

      <div className="menu-items">
        <Link to="/admin/dashboard" className="menu-link">
          לוח בקרה
        </Link>
        <Link to="/admin/products" className="menu-link">
          מוצרים
        </Link>
        <Link to="/admin/activeOrders" className="menu-link">
          הזמנות פעילות
        </Link>
        <Link to="/kitchen" className="menu-link">
          מסך מטבח
        </Link>
        <Link to="/admin/orderHistory" className="menu-link">
          היסטוריית הזמנות
        </Link>
        <Link to="/admin/collections" className="menu-link">
          collections
        </Link>
        <a href="https://hungry1.gotpose.com/" target="_blank" rel="noopener noreferrer" className="menu-link">
          קופה
        </a>
        <Link to="/" className="menu-link">
          חזרה לדף הבית
        </Link>
      </div>
    </aside>
  );
};

export default SideMenu;
