import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
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
const App = () => {
  return (
    <AuthProvider>
      <MenuOptionsProvider>
        <CartProvider>
          <Router>
            <div>
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
                <Route path="/kitchen" element={<KitchenOrders />} />
                <Route path="/worker/dashboard" element={<WorkerDashboard />} />
                <Route path="/admin/manage-shifts" element={<ManageShifts />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/payment-failure" element={<PaymentFailure />} />
                <Route path="/admin/workers" element={<ManageWorkers />} />
                <Route path="/worker/login" element={<WorkerLogin />} />
              </Routes>

              {/* CartIcon should be placed here to appear on all pages */}
              <CartIcon />
            </div>
          </Router>
        </CartProvider>
      </MenuOptionsProvider>
    </AuthProvider>
  );
};

export default App;
