const express = require("express");
const router = express.Router();

const menu = {
  categories: ["starters", "mains", "desserts", "drinks"],
  products: [
    { id: "soup", name: "Soup", price: 5, category: "starters" },
    { id: "steak", name: "Steak", price: 20, category: "mains" },
    { id: "cake", name: "Cake", price: 6, category: "desserts" },
    { id: "cola", name: "Cola", price: 3, category: "drinks" },
  ],
};

router.get("/", (req, res) => {
  res.json(menu);
});

module.exports = router;
