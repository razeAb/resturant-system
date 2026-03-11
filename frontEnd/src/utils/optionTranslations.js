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
  "איולי סומק": { en: "Sumac aioli", he: "איולי סומק" },
  "איולי חריף": { en: "Spicy aioli", he: "איולי חריף" },
  "ברביקיו": { en: "BBQ", he: "ברביקיו" },
  "חלפיניו": { en: "Jalapeno", he: "חלפיניו" },
  "קונפי שום": { en: "Garlic confit", he: "קונפי שום" },
  "דבש": { en: "Honey", he: "דבש" },
  "2 שקיות קטשוב": { en: "2 ketchup packets", he: "2 שקיות קטשוב" },
  "2 שקיות מיונז": { en: "2 mayo packets", he: "2 שקיות מיונז" },
  "2 שקיית אליפאים": { en: "2 Thousand Island packets", he: "2 שקיית אליפאים" },
  "חרדל דיגון": { en: "Dijon mustard", he: "חרדל דיגון" },
};

export const translateOptionLabel = (label, lang) => {
  if (!label) return label;
  const entry = OPTION_TRANSLATIONS[label];
  return entry ? entry[lang] || label : label;
};
