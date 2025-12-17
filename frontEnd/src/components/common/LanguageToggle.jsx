import React from "react";
import { useLang } from "../../context/LangContext";
import { Languages } from "lucide-react";

export default function LanguageToggle() {
  const { lang, toggleLang } = useLang();
  const isHebrew = lang === "he";

  return (
    <button
      onClick={toggleLang}
      className="fixed bottom-4 right-4 z-[60] inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/90 border border-gray-200 shadow hover:shadow-md hover:bg-white transition"
      title={isHebrew ? "Switch to English" : "עברית"}
    >
      <Languages size={16} />
      <span className="text-sm font-medium">{isHebrew ? "עברית" : "EN"}</span>
    </button>
  );
}
