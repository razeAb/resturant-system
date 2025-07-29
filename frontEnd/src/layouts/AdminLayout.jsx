import React, { useState } from "react";
import SideMenu from "./SideMenu";

const AdminLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#2a2a2a] text-white relative overflow-x-hidden">
      {/* Mobile Toggle Button */}
      <button onClick={() => setIsSidebarOpen(true)} className="md:hidden bg-[#2c2c2e] text-white px-4 py-3 self-start">
        ☰ תפריט
      </button>

      {/* Sidebar - Desktop */}
      <aside className="w-60 bg-[#2c2c2e] hidden md:block">
        <SideMenu />
      </aside>

      {/* Sidebar - Mobile Drawer */}
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

      {/* Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <div className="flex-1 p-5 overflow-x-auto" dir="rtl">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;
