import React, { useState } from "react";
import SideMenu from "../layouts/SideMenu";

const CashRegister = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleGoToPOS = () => {
    window.open("https://hungry1.gotpose.com/", "_blank");
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#2a2a2a] text-white relative">
      {/* Desktop Sidebar */}
      <aside className="w-60 bg-[#2c2c2e] hidden md:block">
        <SideMenu />
      </aside>

      {/* Mobile Sidebar */}
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
        <SideMenu />
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col" dir="rtl">
        {/* Top Bar for Mobile */}
        <div className="md:hidden bg-gray-900 text-white p-4 flex justify-between items-center">
          <button onClick={() => setIsSidebarOpen(true)} className="bg-[#2c2c2e] text-white px-4 py-3">
            ☰ תפריט
          </button>
          <span className="text-lg font-bold">קופה</span>
        </div>

        {/* Main Button */}
        <div className="flex-1 flex justify-center items-center p-10">
          <button
            onClick={handleGoToPOS}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-8 rounded shadow text-xl"
          >
            עבור לקופה
          </button>
        </div>
      </div>
    </div>
  );
};

export default CashRegister;
