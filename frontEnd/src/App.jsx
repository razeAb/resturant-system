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
import AdminCategories from "./admin/AdminCategories";
import ActiveOrders from "./admin/ActiveOrders";
import OrderHistory from "./admin/OrderHistory";
import ResetPassword from "./pages/resetPassword";
import OrderStatus from "./pages/OrderStatus";
import PaymentSuccess from "./pages/PaymentSuccess";
import CollectionsReport from "./admin/CollectionsReport";
import { AuthProvider } from "./context/AuthContext"; // ✅
import KitchenOrders from "./admin/kitchen/kitchenOrders";

const App = () => {
  return (
    <AuthProvider>
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
              <Route path="/admin/categories" element={<AdminCategories />} />
              <Route path="/admin/activeOrders" element={<ActiveOrders />} />
              <Route path="/admin/orderHistory" element={<OrderHistory />} />
              <Route path="/admin/collections" element={<CollectionsReport />} />
              <Route path="/kitchen" element={<KitchenOrders />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
            </Routes>

            {/* CartIcon should be placed here to appear on all pages */}
            <CartIcon />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
