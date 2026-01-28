import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";

const LangContext = createContext();

const translations = {
  he: {
    home: {
      title: "Hungry smoked meat",
      subtitle:
        "אנחנו מסעדת בשרים מעושנים, יש לנו מבחר בשר גם להזמנות ואירועים בהתאמה אישית מראש (לפני יום לפחות)",
      cta: "תפריט / איסוף עצמי",
    },
    about: {
      heading: "למה לאכול אצלנו?",
      body:
        "המשאית שלנו מציעה חוויית אוכל רחוב ייחודית עם מגוון רחב של מנות בשר מעושן בטעמים עשירים ובלתי נשכחים. התפריט כולל בשרים כמו אונטרייב, צלי כתף, אסאדו וצוואר טלה, כולם מוכנים בעישון איטי על עץ טבעי, המעניק לבשר את הטעם המיוחד והעמוק שלו. אנו שמים דגש על שימוש בחומרי גלם טריים ואיכותיים ומציעים גם תוספות ורטבים מקוריים המשלימים את חוויית האוכל. המשאית נמצאת במיקום נוח ומזמין, ומציעה שירות מהיר ואדיב לכל הלקוחות. בואו לטעום ולהתענג על מנות בשר מעושן כמו שלא הכרתם!",
    },
    menu: {
      heading: "התפריט שלנו",
      categories: {
        all: "הכל",
        starters: "מנות פתיחה",
        sandwiches: "כריכים",
        meats: "בשרים במשקל",
        sides: "תוספות בצד",
        drinks: "שתיה",
        bar: "דלפק",
        booth: "תא",
        desserts: "קינוחים",
        specials: "מנות מיוחדות",
      },
      sections: {
        starters: "מנות פתיחה",
        sandwiches: "כריכים",
        meats: "בשרים במשקל",
        sides: "תוספות בצד",
        drinks: "שתיה",
      },
      promo: {
        title: "הצטרף וקבל הנחות",
        subtitle: "פתח חשבון וקבל מבצעים וקופונים בלעדיים להזמנות הבאות",
        cta: "הרשמה",
        secondary: "יש לי כבר חשבון",
      },
    },
    modal: {
      vegetablesOnDish: ":ירקות על המנה",
      vegetablesSide: ":ירקות בצד למנה",
      additionsRegular: ":תוספת למנה רגילה",
      sandwichSize: "גודל סנדוויץ'",
      halfSandwich: "חצי סנדוויץ'",
      halfSandwichPrice: "מחיר חצי",
      fullSandwich: "סנדוויץ' מלא",
      fullSandwichTotal: "סה\"כ",
      addComment: ":הוסף הערה",
      commentPlaceholder: "הוסף הערה (לא חובה)",
      addToCart: "הוספה לעגלה",
      chooseSauce: ":בחר רוטב",
      sauceSweet: "מתוק",
      sauceHot: "חריף",
      sauceMix: "מיקס מתוק/חריף",
      grams: "גרם",
    },
    cartNav: {
      backHome: "חזרה לבית",
      cart: "עגלה",
    },
    sideMenu: {
      dashboard: "לוח בקרה",
      products: "מוצרים",
      activeOrders: "הזמנות פעילות",
      kitchen: "מסך מטבח",
      orderHistory: "היסטוריית הזמנות",
      menuOptions: "תוספות וסלטים",
      coupons: "קופונים",
      floor: "מפת שולחנות",
      floorOrders: "הזמנה משולחן",
      collections: "גבייה",
      revenue: "הכנסות",
      workers: "עובדים",
      cashRegister: "קופה",
      backHome: "חזרה לדף הבית",
    },
    nav: {
      home: "בית",
      about: "עלינו",
      menu: "תפריט",
      cart: "עגלה",
      orderStatus: "בדיקת הזמנה",
      admin: "לוח מנהל",
      login: "התחברות",
      logout: "התנתק",
    },
    login: {
      title: "התחברות",
      email: "אימייל",
      password: "סיסמה",
      submit: "התחבר",
      processing: "מתחבר...",
      createAccount: "יצירת חשבון",
      forgotPassword: "שכחתי סיסמה?",
      workerLogin: "כניסת עובד",
      or: "או",
      signInWithGoogle: "התחברות עם גוגל",
    },
    manageShifts: {
      title: "ניהול משמרות",
      filterTitle: "סינון לפי תאריך",
      from: "מ-",
      to: "עד",
      apply: "החל סינון",
      clear: "איפוס",
      total: 'סה"כ שעות (לפי סינון):',
      adjust: "עדכון שעות",
      userFallback: "משתמש",
      noDate: "ללא תאריך",
      hoursLabel: "שעות",
    },
  },
  en: {
    home: {
      title: "Hungry smoked meat",
      subtitle: "We serve smoked meats with a selection available for pre-ordered events (at least one day in advance).",
      cta: "Menu / Pickup",
    },
    about: {
      heading: "Why eat with us?",
      body:
        "Our food truck brings a unique street-food experience with a wide range of slow-smoked meats and unforgettable flavors. The menu features cuts like entrecôte, chuck roast, asado, and lamb neck, all smoked low and slow over natural wood for deep, rich taste. We focus on fresh, quality ingredients and original sides and sauces that complete the experience. Located conveniently, we offer fast, friendly service—come taste smoked meat like you’ve never had before!",
    },
    menu: {
      heading: "Our Menu",
      categories: {
        all: "All",
        starters: "Starters",
        sandwiches: "Sandwiches",
        meats: "Meats by weight",
        sides: "Side dishes",
        drinks: "Drinks",
        bar: "Bar",
        booth: "Booth",
        desserts: "Desserts",
        specials: "Specials",
      },
      sections: {
        starters: "Starters",
        sandwiches: "Sandwiches",
        meats: "Meats by weight",
        sides: "Side dishes",
        drinks: "Drinks",
      },
      promo: {
        title: "Join and get discounts",
        subtitle: "Create an account and unlock exclusive deals and coupons for future orders",
        cta: "Sign up",
        secondary: "I already have an account",
      },
    },
    modal: {
      vegetablesOnDish: "Vegetables on the dish",
      vegetablesSide: "Side vegetables",
      additionsRegular: "Add-ons",
      sandwichSize: "Sandwich size",
      halfSandwich: "Half sandwich",
      halfSandwichPrice: "Half price",
      fullSandwich: "Full sandwich",
      fullSandwichTotal: "Total",
      addComment: "Add a note",
      commentPlaceholder: "Add a note (optional)",
      addToCart: "Add to cart",
      chooseSauce: "Choose a sauce",
      sauceSweet: "Sweet",
      sauceHot: "Hot",
      sauceMix: "Sweet/Hot mix",
      grams: "g",
    },
    cartNav: {
      backHome: "Back home",
      cart: "Cart",
    },
    sideMenu: {
      dashboard: "Dashboard",
      products: "Products",
      activeOrders: "Active orders",
      kitchen: "Kitchen screen",
      orderHistory: "Order history",
      menuOptions: "Add-ons & salads",
      coupons: "Coupons",
      floor: "Floor layout",
      floorOrders: "Table orders",
      collections: "Collections",
      revenue: "Revenue",
      workers: "Workers",
      cashRegister: "Cash register",
      backHome: "Back to home",
    },
    nav: {
      home: "Home",
      about: "About",
      menu: "Menu",
      cart: "Cart",
      orderStatus: "Order status",
      admin: "Admin dashboard",
      login: "Login",
      logout: "Logout",
    },
    login: {
      title: "Login",
      email: "Email",
      password: "Password",
      submit: "Login",
      processing: "Processing...",
      createAccount: "Create an account",
      forgotPassword: "Forgot password?",
      workerLogin: "Worker login",
      or: "or",
      signInWithGoogle: "Sign in with Google",
    },
    manageShifts: {
      title: "Manage Shifts",
      filterTitle: "Filter by date",
      from: "From",
      to: "To",
      apply: "Apply filter",
      clear: "Clear",
      total: "Total hours (current filter):",
      adjust: "Adjust hours",
      userFallback: "User",
      noDate: "No date",
      hoursLabel: "hrs",
    },
  },
};

const getNested = (obj, path) => {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
};

export const LangProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "he");

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === "he" ? "en" : "he"));
  }, []);

  const dir = lang === "he" ? "rtl" : "ltr";

  const t = useCallback(
    (key, fallback) => {
      const value = getNested(translations[lang], key);
      if (value === undefined || value === null || value === "") return fallback;
      return value;
    },
    [lang]
  );

  const value = useMemo(
    () => ({
      lang,
      dir,
      t,
      toggleLang,
      setLang,
    }),
    [lang, dir, t, toggleLang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
};

export const useLang = () => useContext(LangContext);
