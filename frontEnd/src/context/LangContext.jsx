import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const LangContext = createContext();

const translations = {
  he: {
    home: {
      title: "Hungry smoked meat",
      subtitle: "אנחנו מסעדת בשרים מעושנים, יש לנו מבחר בשר גם להזמנות ואירועים בהתאמה אישית מראש (לפני יום לפחות)",
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
      },
      sections: {
        starters: "מנות פתיחה",
        sandwiches: "כריכים",
        meats: "בשרים במשקל",
        sides: "תוספות בצד",
        drinks: "שתיה",
      },
    },
    cartNav: {
      backHome: "חזרה לבית",
      cart: "עגלה",
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
      total: "סה\"כ שעות (לפי סינון):",
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
      },
      sections: {
        starters: "Starters",
        sandwiches: "Sandwiches",
        meats: "Meats by weight",
        sides: "Side dishes",
        drinks: "Drinks",
      },
    },
    cartNav: {
      backHome: "Back home",
      cart: "Cart",
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

const getFromPath = (obj, path) => path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "he");

  useEffect(() => {
    localStorage.setItem("lang", lang);
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
    }
  }, [lang]);

  const value = useMemo(() => {
    const translate = (key, fallback) => getFromPath(translations[lang] || {}, key) || fallback || key;
    return {
      lang,
      dir: lang === "he" ? "rtl" : "ltr",
      t: translate,
      setLang,
      toggleLang: () => setLang((prev) => (prev === "he" ? "en" : "he")),
    };
  }, [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
