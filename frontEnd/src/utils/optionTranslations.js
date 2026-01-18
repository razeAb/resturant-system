const OPTION_TRANSLATIONS = {
  "🥬 חסה": { en: "🥬 Lettuce", he: "🥬 חסה" },
  "🥒 מלפפון חמוץ": { en: "🥒 Pickle", he: "🥒 מלפפון חמוץ" },
  "🍅 עגבניה": { en: "🍅 Tomato", he: "🍅 עגבניה" },
  "🧅 בצל": { en: "🧅 Onion", he: "🧅 בצל" },
  "🥗 סלט קרוב": { en: "🥗 Coleslaw", he: "🥗 סלט קרוב" },
  "🌿 צימצורי": { en: "🌿 Chimichurri", he: "🌿 צימצורי" },
  "🥩 צלי כתף": { en: "🥩 Chuck roast", he: "🥩 צלי כתף" },
  "🥩 אונטרייב": { en: "🥩 Entrecote", he: "🥩 אונטרייב" },
  "🥩 אסאדו": { en: "🥩 Asado", he: "🥩 אסאדו" },
  "🥩 צוואר טלה": { en: "🥩 Lamb neck", he: "🥩 צוואר טלה" },
  "🥩 בריסקת": { en: "🥩 Brisket", he: "🥩 בריסקת" },
  "🥓 ביקון טלה": { en: "🥓 Lamb bacon", he: "🥓 ביקון טלה" },
  "🧀 רוטב גבינה": { en: "🧀 Cheese sauce", he: "🧀 רוטב גבינה" },
  "🍄 פטריות": { en: "🍄 Mushrooms", he: "🍄 פטריות" },
  "🥖 ג׳בטה": { en: "🥖 Ciabatta", he: "🥖 ג׳בטה" },
};

export const translateOptionLabel = (label, lang) => {
  if (!label) return label;
  const entry = OPTION_TRANSLATIONS[label];
  return entry ? entry[lang] || label : label;
};
