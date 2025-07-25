import React, { useEffect, useState } from "react";
import axios from "axios";
import SideMenu from "../layouts/SideMenu";
import { ORDER_STATUS } from "../../constants/orderStatus";

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split("T")[0];
  });
  const [dailyRevenue, setDailyRevenue] = useState(0);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/admin/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = response.data;
        setDashboardData(data);

        const total = data.orders
          .filter((order) => order.status === ORDER_STATUS.DONE && order.createdAt.startsWith(selectedDate))
          .reduce((sum, order) => sum + order.totalPrice, 0);

        setDailyRevenue(total);
      } catch (err) {
        console.error("Error fetching admin data:", err);
        setError("שגיאה בטעינת לוח הבקרה");
      }
    };
    fetchDashboard();
  }, [selectedDate]);

  if (error) return <div className="text-red-400 text-center py-10 font-medium">{error}</div>;
  if (!dashboardData) return <div className="text-slate-400 text-center py-10">טוען נתונים...</div>;

  const { topCustomers, hotProducts, coldProducts, products } = dashboardData;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#2a2a2a] text-white relative overflow-x-hidden">
      {/* Mobile Toggle Button */}
      <button onClick={() => setIsSidebarOpen(true)} className="md:hidden bg-[#2c2c2e] text-white px-4 py-3 self-start">
        ☰ תפריט
      </button>

      {/* Sidebar - Desktop (Always left) */}
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

      {/* Overlay when sidebar open */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* Main Content - Only here RTL */}
      <main className="flex-1 p-5 space-y-8 text-right" dir="rtl">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-slate-100 mb-1">📊 לוח בקרה</h1>
          <p className="text-slate-400 text-base font-light">ניהול מוצרים, לקוחות ודוחות</p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-3">
            <label className="text-white text-sm flex items-center">
              בחר תאריך:
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mr-2 px-3 py-1 bg-[#1f1f1f] border border-white/20 rounded text-white"
              />
            </label>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label={`💰 הכנסה ל-${selectedDate}`} value={`₪${dailyRevenue}`} />
          <StatCard label="📦 מוצרים" value={products.length} />
        </div>

        <section>
          <h2 className="text-2xl font-extrabold text-slate-100 border-b-2 border-slate-600 pb-3 mb-4">🏆 לקוחות מובילים</h2>
          <ul className="bg-slate-800 rounded-xl p-4 divide-y divide-slate-700">
            {topCustomers.map((user) => (
              <li key={user._id} className="flex justify-between py-2 text-slate-200">
                <span>{user.name}</span>
                <span>{user.orderCount} הזמנות</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section>
            <h2 className="text-2xl font-extrabold text-slate-100 border-b-2 border-slate-600 pb-3 mb-4">🔥 מוצרים חמים</h2>
            <ul className="bg-slate-800 rounded-xl p-4 divide-y divide-slate-700">
              {hotProducts.map((p, i) => (
                <li key={i} className="flex justify-between py-2">
                  <span className="text-red-400 font-medium">{p.name}</span>
                  <span>{p.orders} הזמנות</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold text-slate-100 border-b-2 border-slate-600 pb-3 mb-4">❄️ מוצרים קרים</h2>
            <ul className="bg-slate-800 rounded-xl p-4 divide-y divide-slate-700">
              {coldProducts.map((p, i) => (
                <li key={i} className="flex justify-between py-2">
                  <span className="text-blue-400 font-medium">{p.name}</span>
                  <span>{p.orders} הזמנות</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ label, value }) => (
  <div className="bg-gray-800 rounded-xl p-6 shadow-md text-right">
    <div className="text-sm text-slate-400">{label}</div>
    <div className="text-2xl font-bold text-white mt-2">{value}</div>
  </div>
);

export default AdminDashboard;
