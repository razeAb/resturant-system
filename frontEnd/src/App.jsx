import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./layouts/Navbar"; // For main pages with scroll
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import About from "./pages/About";
import Footer from "./layouts/Footer";
import CartPage from "./components/cart/CartPage";
import { CartProvider } from "./context/CartContext"; // Cart context
import CartIcon from "./components/cart/CartIcon"; // Import CartIcon
import AdminDashboard from "./admin/AdminDashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminProducts from "./admin/AdminProducts";
import ActiveOrders from "./admin/ActiveOrders";
import OrderHistory from "./admin/OrderHistory";
import ResetPassword from "./pages/resetPassword";
import OrderStatus from "./pages/OrderStatus";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailure from "./pages/PaymentFailure";
import CollectionsReport from "./admin/CollectionsReport";
import { AuthProvider } from "./context/AuthContext"; // ✅
import { MenuOptionsProvider } from "./context/MenuOptionsContext";
import MenuOptionsAdmin from "./admin/MenuOptions";
import KitchenOrders from "./admin/kitchen/kitchenOrders";
import CashRegister from "./admin/CashRegister";
import RevenuePage from "./admin/RevenuePage";
import WorkerDashboard from "./pages/WorkerDashboard";
import ManageShifts from "./admin/ManageShifts";
import ManageWorkers from "./admin/ManageWorkers";
import WorkerLogin from "./pages/WorkerLogin";
import FloorLayout from "./admin/FloorLayout";
import FloorOrders from "./admin/FloorOrders";
import Coupons from "./admin/Coupons";
import WaiterTables from "./pages/WaiterTables";
import { LangProvider, useLang } from "./context/LangContext";
import LanguageToggle from "./components/common/LanguageToggle";
import api from "./api";

const AppContent = () => {
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const { t } = useLang();
  const location = useLocation();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await api.get("/api/products");
        const products = response.data?.products || [];
        const allInactive = products.length > 0 && products.every((p) => p.isActive === false);
        setIsClosed(allInactive);
      } catch (error) {
        console.error("Failed to load restaurant status", error);
      }
    };

    fetchStatus();
  }, []);

  const isAdminRoute =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/worker") ||
    location.pathname.startsWith("/kitchen");
  const isLoginRoute = location.pathname === "/login";

  return (
    <div>
      {isClosed && !isLoginRoute && !isAdminRoute && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 text-center ${
            isAdminRoute ? "pointer-events-none" : ""
          }`}
        >
          <div className="max-w-xl rounded-2xl border border-white/15 bg-black/60 p-6 backdrop-blur-sm">
            <h2 className="text-3xl font-semibold text-white">{t("home.closedTitle", "We’re sorry, we are closed today.")}</h2>
            <p className="mt-3 text-base text-white/80">
              {t("home.closedSubtitle", "Our closing days are Sundays and Wednesdays.")}
            </p>
          </div>
        </div>
      )}

      {/* Main pages with Scroll Navbar */}
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Navbar />
              <div id="home">
                <Home />
              </div>
              <div id="menu">
                <Menu />
              </div>
              <Footer />
            </>
          }
        />
        {/* Cart page with regular CartNavbar */}
        <Route path="/cart" element={<CartPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/resetPassword" element={<ResetPassword />} />
        <Route path="/order-status" element={<OrderStatus />} />

        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/activeOrders" element={<ActiveOrders />} />
        <Route path="/admin/orderHistory" element={<OrderHistory />} />
        <Route path="/admin/collections" element={<CollectionsReport />} />
        <Route path="/admin/revenue" element={<RevenuePage />} />
        <Route path="/admin/cash-register" element={<CashRegister />} />
        <Route path="/admin/menu-options" element={<MenuOptionsAdmin />} />
        <Route path="/admin/floor" element={<FloorLayout />} />
        <Route path="/admin/floor-orders" element={<FloorOrders />} />
        <Route path="/admin/coupons" element={<Coupons />} />
        <Route path="/kitchen" element={<KitchenOrders />} />
        <Route path="/worker/dashboard" element={<WorkerDashboard />} />
        <Route path="/worker/tables" element={<WaiterTables />} />
        <Route path="/worker/floor-orders" element={<FloorOrders variant="worker" />} />
        <Route path="/admin/manage-shifts" element={<ManageShifts />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failure" element={<PaymentFailure />} />
        <Route path="/admin/workers" element={<ManageWorkers />} />
        <Route path="/worker/login" element={<WorkerLogin />} />
      </Routes>

      {/* CartIcon should be placed here to appear on all pages */}
      <CartIcon onOpen={() => setIsCartDrawerOpen(true)} />
      <CartPage variant="drawer" isOpen={isCartDrawerOpen} onClose={() => setIsCartDrawerOpen(false)} />
      <LanguageToggle />
    </div>
  );
};

const App = () => (
  <LangProvider>
    <AuthProvider>
      <MenuOptionsProvider>
        <CartProvider>
          <Router>
            <AppContent />
          </Router>
        </CartProvider>
      </MenuOptionsProvider>
    </AuthProvider>
  </LangProvider>
);

export default App;
