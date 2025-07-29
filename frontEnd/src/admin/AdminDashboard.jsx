import React, { useEffect, useState } from "react";
import api from "../api";
import SideMenu from "../layouts/SideMenu";
import { ORDER_STATUS } from "../../constants/orderStatus";
import Button from "../components/common/Button";

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [restaurantOpen, setRestaurantOpen] = useState(true);

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
        const response = await api.get("/api/admin/dashboard", { headers: { Authorization: `Bearer ${token}` } });

        const data = response.data;
        setDashboardData(data);
        setRestaurantOpen(data.products.every((p) => p.isActive));

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

  const handleToggleRestaurant = async (open) => {
    try {
      const token = localStorage.getItem("token");
      const endpoint = open ? "/api/products/activate-all" : "/api/products/deactivate-all";
      await api.patch(endpoint, {}, { headers: { Authorization: `Bearer ${token}` } });
      setDashboardData((prev) => ({ ...prev, products: prev.products.map((p) => ({ ...p, isActive: open })) }));
      setRestaurantOpen(open);
    } catch (error) {
      console.error("שגיאה בעדכון סטטוס מסעדה:", error);
    }
  };

  if (error) return <div className="text-red-400 text-center py-10 font-medium">{error}</div>;
  if (!dashboardData) return <div className="text-slate-400 text-center py-10">טוען נתונים...</div>;

  const { topCustomers, hotProducts, coldProducts, products } = dashboardData;

  return (
    <div className="min-h-screen flex font-[Inter] text-white bg-[#0f1015]" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col items-center w-[260px] bg-[#0c0d12] py-6">
        <img src="/logo.png" alt="Logo" className="w-32 mb-6" />
        <SideMenu />
      </aside>

      {/* Sidebar - Mobile Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-[#0c0d12] z-50 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        } md:hidden`}
      >
        <div className="flex justify-end p-4">
          <button onClick={() => setIsSidebarOpen(false)} className="text-white text-lg">
            ❌
          </button>
        </div>
        <img src="/logo.png" alt="Logo" className="w-32 mx-auto mb-4" />
        <SideMenu />
      </div>

      {/* Overlay when sidebar open */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
<main className="flex-1 p-6 md:mr-[260px] space-y-8">
        {/* Mobile Toggle */}
        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden bg-[#2c2c2e] text-white px-4 py-3">
          ☰ תפריט
        </button>

        {/* Top Bar */}
        <div className="flex justify-between items-center mb-6">
          <input type="text" placeholder="חפש כאן" className="bg-[#1a1c24] placeholder-[#7d808a] text-white px-4 py-2 rounded w-[300px]" />
          <div className="flex items-center gap-4">
            <div className="flex gap-3 text-lg text-[#7d808a]">
              <i className="fas fa-comment" />
              <i className="fas fa-bell" />
              <i className="fas fa-shopping-cart" />
              <i className="fas fa-cog" />
            </div>
            <div className="text-sm">
              שלום, <span className="font-semibold text-white">אדמין</span>
            </div>
            <img src="https://placehold.co/40x40" alt="Admin" className="rounded-full" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <label className="text-sm flex items-center">
            בחר תאריך:
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="mr-2 px-3 py-1 bg-[#1f1f1f] border border-white/20 rounded text-white"
            />
          </label>
          <Button title={restaurantOpen ? "סגור את המסעדה" : "פתח את המסעדה"} onClick={() => handleToggleRestaurant(!restaurantOpen)} />
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="סך הזמנות" value={dashboardData.orders.length} icon="fas fa-clipboard" />
          <MetricCard
            title="הזמנות שהושלמו"
            value={dashboardData.orders.filter((o) => o.status === ORDER_STATUS.DONE).length}
            icon="fas fa-truck"
          />
          <MetricCard title="מוצרים" value={products.length} icon="fas fa-hamburger" />
          <MetricCard title="סך ההכנסות" value={`₪${dashboardData.totalRevenue}`} icon="fas fa-dollar-sign" />
        </div>

        <section>
          <h2 className="text-lg font-semibold mb-2">לקוחות מובילים</h2>
          <ul className="bg-[#1a1c24] rounded-xl p-4 divide-y divide-[#0f1015]">
            {topCustomers.map((user) => (
              <li key={user._id} className="flex justify-between py-2">
                <span>{user.name}</span>
                <span>{user.orderCount} הזמנות</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section>
            <h2 className="text-lg font-semibold mb-2">מוצרים חמים</h2>
            <ul className="bg-[#1a1c24] rounded-xl p-4 divide-y divide-[#0f1015]">
              {hotProducts.map((p, i) => (
                <li key={i} className="flex justify-between py-2">
                  <span className="text-red-400 font-medium">{p.name}</span>
                  <span>{p.orders} הזמנות</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">מוצרים קרים</h2>
            <ul className="bg-[#1a1c24] rounded-xl p-4 divide-y divide-[#0f1015]">
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

const MetricCard = ({ title, value, icon }) => (
  <div className="bg-[#1a1c24] p-4 rounded-xl">
    <div className="flex justify-between items-center mb-2">
      <span className="text-sm">{title}</span>
      {icon && <i className={`${icon} text-[#40f99b]`} />}
    </div>
    <h2 className="text-2xl font-semibold">{value}</h2>
  </div>
);

export default AdminDashboard;
