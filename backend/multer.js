// multer.js
const multer = require("multer");

const storage = multer.memoryStorage(); // Use memory storage to handle directly from buffer
const upload = multer({ storage });

module.exports = upload;
