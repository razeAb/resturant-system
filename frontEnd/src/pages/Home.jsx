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
    <div style={backgroundImageStyle} className="min-h-screen flex flex-col justify-center items-start lg:px-32 px-5 text-left" dir={dir}>
      <div className="w-full lg:w-2/3 space-y-5">
        <h1 className="text-backgroundColor font-semibold text-6xl">{t("home.title", "Hungry smoked meat")}</h1>
        <p className="text-backgroundColor text-lg">{t("home.subtitle")}</p>
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
