import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./SideMenu.css"; // <-- new CSS file

const SideMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen((prev) => !prev);

  return (
    <>
      {/* Toggle Button */}
      <button onClick={toggleMenu} className="side-toggle">
        {isOpen ? "✖" : "☰"}
      </button>

      {/* Sidebar */}
      {isOpen && (
        <aside className="custom-sidebar">
          <div className="menu-items">
            <br></br>
            <br></br>
            <Link to="/admin/dashboard" className="menu-link">
              Dashboard
            </Link>
            <Link to="/admin/products" className="menu-link">
              Products
            </Link>
            <Link to="/admin/activeOrders" className="menu-link">
              Active Orders
            </Link>
            <Link to="/admin/oldorders" className="menu-link">
              Order History
            </Link>
            <Link to="/" className="menu-link">
              Go Back Home
            </Link>
          </div>
        </aside>
      )}
    </>
  );
};

export default SideMenu;
