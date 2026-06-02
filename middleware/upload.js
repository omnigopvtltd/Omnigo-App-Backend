const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("DESTINATION HIT");
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    console.log("FILE RECEIVED:", file);

    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  console.log("FILTER FILE:", file);

  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files allowed"), false);
  }
};

module.exports = multer({
  storage,
  fileFilter,
});