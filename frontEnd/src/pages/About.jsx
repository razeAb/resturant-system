import React from "react";
import Navbar from "../layouts/Navbar.jsx"; // Import the Navbar component
import CartNavbar from "../components/cart/CartNavbar.jsx"; // Import the CartNavbar component
import { useLang } from "../context/LangContext.jsx";

const About = () => {
  const { t, dir } = useLang();

  return (
    <>
      {/* Include CartNavbar */}
      <CartNavbar />

      {/* About section */}
      <div className="min-h-screen flex flex-col lg:flex-row justify-center items-center lg:px-32 px-5 pt-20" dir={dir}>
        <img src="/photos/AboutImg.jpeg" alt="img" className="lg:w-1/2 w-full" />
        <div className="space-y-4 lg:pt-14 p-5 lg:w-1/2 w-full text-left">
          <h1 className="font-semibold text-4xl text-right">{t("about.heading", "Why eat with us?")}</h1>
          <p>{t("about.body")}</p>
          <div className="flex justify-start"></div>
        </div>
      </div>
    </>
  );
};

export default About;
