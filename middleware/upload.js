// // const multer = require("multer");
// // const path = require("path");

// // const storage = multer.diskStorage({
// //   destination: (req, file, cb) => {
// //     console.log("DESTINATION HIT");
// //     cb(null, "uploads/");
// //   },

// //   filename: (req, file, cb) => {
// //     console.log("FILE RECEIVED:", file);

// //     const uniqueName =
// //       Date.now() + "-" + Math.round(Math.random() * 1e9);

// //     cb(null, uniqueName + path.extname(file.originalname));
// //   },
// // });

// // const fileFilter = (req, file, cb) => {
// //   console.log("FILTER FILE:", file);

// //   if (file.mimetype.startsWith("image/")) {
// //     cb(null, true);
// //   } else {
// //     cb(new Error("Only image files allowed"), false);
// //   }
// // };

// // module.exports = multer({
// //   storage,
// //   fileFilter,
// // });

// const multer = require("multer");
// const path = require("path");
// const fs = require("fs");

// const uploadDir = path.join(__dirname, "..", "uploads");
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, uploadDir),
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname);
//     const base = path
//       .basename(file.originalname, ext)
//       .replace(/[^a-z0-9]/gi, "-")
//       .toLowerCase();
//     cb(null, `${base}-${Date.now()}${ext}`);
//   },
// });

// function fileFilter(req, file, cb) {
//   const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
//   if (allowed.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error("Only JPG, PNG, and WEBP images are allowed"));
//   }
// }

// module.exports = multer({
//   storage,
//   fileFilter,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
// });

/////////////////////////////
// const multer = require("multer");

// // Disk storage ki jagah Memory Storage use karein
// const storage = multer.memoryStorage();

// function fileFilter(req, file, cb) {
//   const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/pdf"];
//   if (allowed.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error("Only JPG, PNG, WEBP, GIF, and PDF files are allowed"));
//   }
// }

// module.exports = multer({
//   storage,
//   fileFilter,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
// });

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// File Filter (Common for both)
function fileFilter(req, file, cb) {
  const allowed = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, WEBP, GIF, and PDF files are allowed"));
  }
}

// -------------------------------------------------------------
// 1. DISK STORAGE (Local Server Uploads - e.g., /uploads folder)
// -------------------------------------------------------------
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const sanitizedOriginalName = file.originalname.replace(/\s+/g, "-");
    // const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(sanitizedOriginalName);
    const baseName = path.basename(sanitizedOriginalName, ext);
    cb(null, `${baseName}${ext}`);
  },
});

const diskUpload = multer({
  storage: diskStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// -------------------------------------------------------------
// 2. MEMORY STORAGE (Cloudinary Direct Uploads - RAM Buffer)
// -------------------------------------------------------------
const memoryStorage = multer.memoryStorage();

const memoryUpload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Export both instances
module.exports = {
  diskUpload,
  memoryUpload,
};