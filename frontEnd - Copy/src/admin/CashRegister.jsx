import React, { useState } from "react";
import SideMenu from "../layouts/SideMenu";

const CashRegister = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleGoToPOS = () => {
    window.open("https://hungry1.gotpose.com/", "_blank");
  };

  return (
    <div className="min-h-screen bg-[#2a2a2a] text-white flex" dir="rtl">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <SideMenu />
      </div>

      {/* Mobile Sidebar */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      {isSidebarOpen && (
        <div className="md:hidden">
          <SideMenu onClose={() => setIsSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
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
