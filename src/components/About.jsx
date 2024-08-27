import React from "react";
import Button from "../layouts/Button.jsx";

const About = () => {
  const ltrStyle = {
    direction: "ltr",
    textAlign: "left",
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row justify-center items-center lg:px-32 px-5">
      <img src="/photos/AboutImg.jpeg" alt="img" className="lg:w-1/2 w-full" />
      <div className="space-y-4 lg:pt-14 p-5 lg:w-1/2 w-full" style={ltrStyle}>
        <h1 className="font-semibold text-4xl text-left">?למה לאכול אצלנו</h1>
        <p>
          המשאית שלנו מציעה חוויית אוכל רחוב ייחודית עם מגוון רחב של מנות בשר מעושן בטעמים עשירים ובלתי נשכחים. התפריט כולל בשרים כמו
          אונטרייב, צלי קתף, אסאדו וצוואר טלה, כולם מוכנים בעישון איטי על עץ טבעי, המעניק לבשר את הטעם המיוחד והעמוק שלו. אנו שמים דגש על
          שימוש בחומרי גלם טריים ואיכותיים ומציעים גם תוספות ורטבים מקוריים המשלימים את חוויית האוכל. המשאית נמצאת במיקום נוח ומזמין, ומציעה
          שירות מהיר ואדיב לכל הלקוחות. בואו לטעום ולהתענג על מנות בשר מעושן כמו שלא הכרתם!
        </p>
        <div className="flex justify-start">
        </div>
      </div>
    </div>
  );
};

export default About;
