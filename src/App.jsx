import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar"; // For main pages with scroll
import Home from "./components/Home";
import Menu from "./components/Menu";
import About from "./components/About";
import Footer from "./components/Footer";
import CartPage from "./components/CartPage";
import { CartProvider } from "./context/CartContext"; // Cart context

const App = () => {
  return (
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
                  <div id="about">
                    <About />
                  </div>
                  <Footer />
                </>
              }
            />
            {/* Cart page with regular CartNavbar */}
            <Route path="/cart" element={<CartPage />} />
          </Routes>
        </div>
      </Router>
    </CartProvider>
  );
};

export default App;
