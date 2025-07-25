const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true }, // שם מוצר
  price: { type: Number, required: true }, // מחיר - יכול להיות מחיר ליחידה או ל-100 גרם
  stock: { type: Number, required: true }, // כמות במלאי
  description: { type: String }, // תיאור
  image: { type: String }, // URL לתמונה
  category: { type: String, required: true }, // קטגוריה (למשל: בשרים, שתייה)
  isActive: { type: Boolean, default: true }, // האם המוצר פעיל
  isWeighted: { type: Boolean, default: false }, // ✅ האם המחיר לפי גרם (true = בשרים למשל)
  vegetables: [String], // ✅ ירקות לבחירה ללקוח (למשל חסה, עגבנייה)
  additions: {
    fixed: [
      // ✅ תוספות עם מחיר קבוע (רוטב גבינה, ג'בטה וכו')

      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
      },
    ],
    grams: [
      {
        name: { type: String, required: true },
        prices: {
          50: { type: Number, default: 0 },
          100: { type: Number, default: 0 },
        },
      },
    ],
  },

  createdAt: { type: Date, default: Date.now }, // תאריך יצירה
});

module.exports = mongoose.model("Product", productSchema);
