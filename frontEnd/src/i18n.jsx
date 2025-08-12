import React, { createContext, useContext } from "react";

const translations = {
  en: {
    menu: {
      title: "Our Menu",
      categories: {
        all: "All",
        starters: "Starters",
        sandwiches: "Sandwiches",
        meats: "Meats by Weight",
        sides: "Side Dishes",
        drinks: "Drinks",
      },
    },
    admin: {
      dashboardTitle: "Dashboard",
      welcome: "Welcome to the admin panel",
      errorLoadingDashboard: "Error loading dashboard",
    },
  },
  he: {
    menu: {
      title: "התפריט שלנו",
      categories: {
        all: "הכל",
        starters: "מנות פתיחה",
        sandwiches: "כריכים",
        meats: "בשרים במשקל",
        sides: "תוספות בצד",
        drinks: "שתיה",
      },
    },
    admin: {
      dashboardTitle: "לוח בקרה",
      welcome: "ברוך/ה הבא/ה למערכת הניהול",
      errorLoadingDashboard: "שגיאה בטעינת לוח הבקרה",
    },
  },
};

const LanguageContext = createContext("he");

export const LanguageProvider = ({ children, lang = "he" }) => (
  <LanguageContext.Provider value={lang}>{children}</LanguageContext.Provider>
);

export const useTranslation = () => {
  const lang = useContext(LanguageContext);

  const t = (path) => {
    return path.split(".").reduce((obj, key) => (obj && obj[key] ? obj[key] : path), translations[lang]);
  };

  return { t, lang };
};

export default translations;
