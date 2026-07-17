import React from "react";
import Button from "../components/common/Button.jsx";
import { useLang } from "../context/LangContext";

const Home = () => {
  const { t, dir } = useLang();
  const backgroundImageStyle = {
    backgroundImage: "url('/photos/backgroundImage.jpeg')",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    minHeight: "100vh",
  };

  return (
    <div
      style={backgroundImageStyle}
      className={`min-h-screen flex flex-col justify-center ${dir === "rtl" ? "items-start text-left" : "items-end text-right"} lg:px-32 px-5`}
      dir={dir}
    >
      <div className={`w-full lg:w-2/3 space-y-5 ${dir === "rtl" ? "mr-auto" : "ml-auto"}`}>
        <h1
          className="text-backgroundColor font-semibold text-6xl"
          style={{ textShadow: "0 2px 6px rgba(0,0,0,0.6), 0 0 2px rgba(0,0,0,0.8)" }}
        >
          {t("home.title", "Hungry smoked meat")}
        </h1>
        <p className="text-backgroundColor text-lg" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.6)" }}>
          {t("home.subtitle")}
        </p>
        <div className="mt-5">
          <br />
          <div className="inline-flex">
            <Button title={t("home.cta", "Menu / Pickup")} href="#menu" />
          </div>{" "}
        </div>
      </div>
    </div>
  );
};

export default Home;
