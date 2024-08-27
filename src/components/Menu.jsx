import React from "react";
import DishesCard from "../layouts/DishesCard";

const Menu = () => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center lg:px-32 px-5">
      <h1 className="text-4xl font-semibold text-center pt-24 pb-10">תפריט שלנו</h1>
      <div className="flex flex-wrap gap-8 justify-center">
        <DishesCard id="1" img="/photos/img1.jpeg" title="אונטרייב גבטה" price="₪35" toggleOptions />
        <DishesCard id="2" img="/photos/img2.jpeg" title="צלי כתף בג׳בטה" price="₪35" toggleOptions />
        <DishesCard id="3" img="/photos/HotDog.jpeg" title="חריפות עגל וטלה מעושן בג׳בטה" price="₪35" toggleOptions />
        <DishesCard id="4" img="/photos/img5.webp" title="אסאדו בג׳בטה" price="₪45" toggleOptions />
        <DishesCard id="5" img="/photos/img4.webp" title="צוואר טלה בג׳בטה" price="₪45" toggleOptions />
        <DishesCard id="6" img="/photos/ontrib.jpg" title="אונטרייב, צלי כתף חריפות 18 שקל ל 100 גרם" price="₪18" toggleOptions />
        <DishesCard id="7" img="/photos/asadoBone.webp" title="אסאדו בלי עצם ,צוואר טלה 22 שקל ל 100 גרם" price="₪22" toggleOptions />
        <DishesCard id="8" img="/photos/OsbacsoFull.jpeg" title="אוסובוקו שלם הזמנה לפני יום 120 שקל לקילו" price="₪120" toggleOptions />
        <DishesCard id="9" img="/photos/shoulder.jpeg" title="כתף טלה שלם הזמנה לפני יום 30 שקל ל 100 גרם" price="₪30" toggleOptions />
      </div>
      <br />
      <br />
      <h1 className="text-4xl font-semibold text-center pb-10">תוספות בצד</h1>
      <div className="flex flex-wrap gap-8 justify-center">
        <DishesCard id="10" img="/photos/French_Fries.jpeg" title="צ׳יפס" price="₪10" />
        <DishesCard id="11" img="/photos/WhiteRice.jpg" title="אורז" price="₪10" />
      </div>
      <br />
      <br />
      <h1 className="text-4xl font-semibold text-center pb-10">שתיה</h1>
      <div className="flex flex-wrap gap-8 justify-center">
        <DishesCard id="12" img="/photos/coke.webp" title="קולה" price="₪8" />
        <DishesCard id="13" img="/photos/cokezero.webp" title="קולה זירו" price="₪8" />
        <DishesCard id="14" img="/photos/soda.jpg" title="סודה" price="₪8" />
        <DishesCard id="15" img="/photos/water.webp" title="מים" price="₪6" />
        <DishesCard id="16" img="/photos/xl.webp" title="XL" price="₪8" />
      </div>
    </div>
  );
};

export default Menu;
