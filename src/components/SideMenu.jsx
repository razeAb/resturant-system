import React, { useState } from "react";
import { Link } from "react-router-dom";

const SideMenu = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={toggleMenu}
        className="fixed top-4 left-4 z-50 bg-gray-900 text-white p-2 rounded-md focus:outline-none hover:bg-gray-700"
      >
        {isOpen ? "✖" : "☰"}
      </button>

      {/* Sidebar */}
      {isOpen && (
        <aside className="w-64 h-screen bg-gray-900 text-white p-6 fixed top-0 left-0 z-40">
          <ul className="space-y-4">
            <br></br>
            <li>
              <Link to="/admin/dashboard" className="hover:text-yellow-400">
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/admin/products" className="hover:text-yellow-400">
                Products
              </Link>
            </li>
            <li>
              <Link to="/admin/orders" className="hover:text-yellow-400">
                Active orders
              </Link>
            </li>
            <li>
              <Link to="/admin/oldorders" className="hover:text-yellow-400">
                order history
              </Link>
            </li>
            <li>
              <Link to="/" className="hover:text-yellow-400">
                Go Back Home
              </Link>
            </li>
          </ul>
        </aside>
      )}

      {/* Page Content */}
      <div className={`transition-all duration-300 ${isOpen ? "ml-64" : "ml-0"} p-8 bg-gray-100 `}>
        {/* Render child content if needed */}
        {children}
      </div>
    </>
  );
};

export default SideMenu;
