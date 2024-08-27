import React from "react";
import Navbar from "./components/Navbar.jsx";
import Home from "./components/Home.jsx";
import Menu from "./components/Menu.jsx";
import About from "./components/About.jsx";
import Footer from "./components/Footer.jsx";
const App = () => {
  return (
    <div>
      <Navbar />
      <main>
        <div id="home">
          <Home />
        </div>
        <div id="menu">
          <Menu />
        </div>
        <div id="about">
          <About />
        </div>
        <div id="footer">
          <Footer />
        </div>
      </main>
    </div>
  );
};

export default App;
