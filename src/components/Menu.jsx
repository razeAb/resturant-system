import React from "react";
import DishesCard from "../layouts/DishesCard"; // For dishes that use the modal
import CountableDishesCard from "../layouts/CountableDishesCard"; // For countable dishes

const Menu = () => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center lg:px-32 px-5">
      <h1 className="text-4xl font-semibold text-center pt-24 pb-10">תפריט שלנו</h1>
      <div className="flex flex-wrap gap-8 justify-center">
        <DishesCard id="1" img="/photos/img1.jpeg" title="אונטרייב גבטה" price="35" toggleOptions />
        <DishesCard id="2" img="/photos/img2.jpeg" title="צלי כתף בג׳בטה" price="35" toggleOptions />
        <DishesCard id="3" img="/photos/HotDog.jpeg" title="חריפות עגל וטלה מעושן בג׳בטה" price="35" toggleOptions />
        <DishesCard id="4" img="/photos/img5.webp" title="אסאדו בג׳בטה" price="45" toggleOptions />
        <DishesCard id="5" img="/photos/img4.webp" title="צוואר טלה בג׳בטה" price="45" toggleOptions />
        <DishesCard id="6" img="/photos/ontrib.jpg" title="אונטרייב  22 שקל ל 100 גרם" price="22" toggleOptions modalType="weighted" />
        <DishesCard id="7" img="/photos/shoulder1.jpeg" title=" צלי כתף  22 שקל ל 100 גרם" price="22" toggleOptions modalType="weighted" />
        <DishesCard
          id="8"
          img="/photos/asadoBone.webp"
          title="אסאדו בלי עצם ,צוואר טלה 26 שקל ל 100 גרם"
          price="26"
          toggleOptions
          modalType="weighted"
        />
        <DishesCard
          id="9"
          img="/photos/OsbacsoFull.jpeg"
          title="אוסובוקו שלם הזמנה לפני יום 120 שקל לקילו"
          price="120"
          toggleOptions
          modalType="weighted"
        />
        <DishesCard
          id="10"
          img="/photos/shoulder.jpeg"
          title="כתף טלה שלם הזמנה לפני יום 300 שקל ל 1 לקילו"
          price="30"
          toggleOptions
          modalType="weighted"
        />
      </div>

      <br />
      <br />

      <h1 className="text-4xl font-semibold text-center pb-10">תוספות בצד</h1>
      <div className="flex flex-wrap gap-8 justify-center">
        <CountableDishesCard id="100" img="/photos/French_Fries.jpeg" title="צ׳יפס" price="10" />
        <CountableDishesCard id="101" img="/photos/WhiteRice.jpg" title="אורז" price="10" />
        <CountableDishesCard id="102" img="/photos/purree.jpg" title="כדורי פירה" price="10" />
        <CountableDishesCard id="103" img="/photos/onionRing.jpg" title="טבעות בצל" price="10" />
      </div>

      <br />
      <br />

      <h1 className="text-4xl font-semibold text-center pb-10">שתיה</h1>
      <div className="flex flex-wrap gap-8 justify-center">
        <CountableDishesCard id="13" img="/photos/coke.webp" title="קולה" price="8" />
        <CountableDishesCard id="14" img="/photos/cokezero.webp" title="קולה זירו" price="8" />
        <CountableDishesCard id="15" img="/photos/soda.jpg" title="סודה" price="8" />
        <CountableDishesCard id="16" img="/photos/water.webp" title="מים" price="6" />
        <CountableDishesCard id="17" img="/photos/xl.webp" title="XL" price="8" />
      </div>
    </div>
  );
};

export default Menu;
