import React from "react";
import Button from "../layouts/Button.jsx";

const Home = () => {
  const backgroundImageStyle = {
    backgroundImage: "url('/photos/backgroundImage.jpeg')",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    minHeight: "100vh",
  };

  return (
    <div style={backgroundImageStyle} className="min-h-screen flex flex-col justify-center items-start lg:px-32 px-5 text-left">
      <div className="w-full lg:w-2/3 space-y-5">
        <h1 className="text-backgroundColor font-semibold text-6xl">hungry smoked meat</h1>
        <p className="text-backgroundColor text-lg">
          אנחנו מסעדת בשרים מעושנים, יש לנו מבחר בשר גם להזמנות ואירועים בהתאמה אישית מראש (לפני יום לפחות)
        </p>
        <div className="mt-5">
          <br />
          <Button title="תפריט / איסוף עצמי" href="#menu" />
        </div>
      </div>
    </div>
  );
};

export default Home;
