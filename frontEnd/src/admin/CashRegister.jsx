import React, { useState } from "react";
import SideMenu from "../layouts/SideMenu";

const CashRegister = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar */}
      <aside className="w-60 bg-[#2c2c2e] hidden md:block">
        <SideMenu />
      </aside>

      {/* Mobile Sidebar (from the left) */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-[#2c2c2e] z-50 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-64"
        } md:hidden`}
      >
        <SideMenu onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile top bar */}
        <div className="md:hidden bg-gray-900 text-white p-4 flex justify-between items-center">
          <button onClick={() => setIsSidebarOpen(true)} className="text-white text-2xl">
            ☰
          </button>
          <span className="text-lg font-bold">קופה</span>
        </div>

        {/* ⚠️ Demo Login Info (remove in production) */}
        <div className="bg-gray-800 text-white text-center p-2 text-sm">
          <strong>⚠️ Demo Login:</strong> Username: <code>Gameronerz@gmail.com</code> | Password: <code>Hungry123</code>
        </div>

        {/* POS iframe */}
        <iframe src="https://hungry1.gotpose.com/login" title="Cash Register" className="flex-1 w-full border-none" />
      </div>
    </div>
  );
};

export default CashRegister;
