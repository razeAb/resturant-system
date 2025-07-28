import React, { useState } from "react";
import SideMenu from "../layouts/SideMenu";

const CashRegister = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#2a2a2a] text-white relative">
      {" "}
      {/* Desktop Sidebar */}
      <aside className="w-60 bg-[#2c2c2e] hidden md:block">
        <SideMenu />
      </aside>
      {/* Mobile Sidebar (from the left) */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-[#2c2c2e] z-50 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:hidden`}
      >
        <div className="flex justify-end p-4">
          <button onClick={() => setIsSidebarOpen(false)} className="text-white text-lg">
            ❌
          </button>
        </div>
        <SideMenu />{" "}
      </div>
      {/* Overlay when sidebar open */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      {/* Main Content */}
      <div className="flex-1 flex flex-col" dir="rtl">
        {/* Mobile top bar */}
        <div className="md:hidden bg-gray-900 text-white p-4 flex justify-between items-center">
          <button onClick={() => setIsSidebarOpen(true)} className="bg-[#2c2c2e] text-white px-4 py-3">
            ☰ תפריט
          </button>
          <span className="text-lg font-bold">קופה</span>
        </div>

        {/* ⚠️ Demo Login Info (remove in production) */}
        <div className="bg-gray-800 text-white text-center p-2 text-sm">
          <strong>⚠️ Demo Login:</strong> Username: <code>Gameronerz@gmail.com</code> | Password: <code>Hungry123</code>
        </div>

        {/* POS iframe */}
        <iframe src="https://hungry1.gotpose.com/" title="Cash Register" className="flex-1 w-full border-none" />
      </div>
    </div>
  );
};

export default CashRegister;
