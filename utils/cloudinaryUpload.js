const fs = require("fs");
const cloudinary = require("../config/cloudinary");

/**
 * File Buffer ya Disk Path ko Cloudinary par upload karne ka helper
 */
const uploadSingleToCloudinary = async (file, folderName = "general") => {
  // Scenario A: DiskStorage Se File Route Hui Ho (file.path available)
  if (file.path) {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: folderName,
    });
    // Upload hone ke baad local file delete kar dein
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    return result.secure_url;
  }

  // Scenario B: MemoryStorage Se Buffer Aaya Ho (file.buffer available)
  if (file.buffer) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: folderName },
        (error, result) => {
          if (result) resolve(result.secure_url);
          else reject(error);
        }
      );
      stream.end(file.buffer);
    });
  }

  throw new Error("Invalid file object passed to Cloudinary uploader");
};

/**
 * Universal Handler
 */
const handleImageUploads = async (req, fieldName = "images", folderName = "general") => {
  let uploadedUrls = [];

  // 1. Array of files via Multer
  if (req.files) {
    let filesToProcess = [];

    if (Array.isArray(req.files) && req.files.length > 0) {
      filesToProcess = req.files;
    } else if (typeof req.files === "object" && req.files[fieldName]) {
      filesToProcess = req.files[fieldName];
    }

    if (filesToProcess.length > 0) {
      const uploadPromises = filesToProcess.map((file) =>
        uploadSingleToCloudinary(file, folderName)
      );
      uploadedUrls = await Promise.all(uploadPromises);
      return uploadedUrls;
    }
  }

  // 2. Single file via Multer
  if (req.file) {
    const url = await uploadSingleToCloudinary(req.file, folderName);
    return [url];
  }

  // 3. Direct String / Array URL passed in body
  const bodyImages = req.body[fieldName];
  if (bodyImages) {
    if (typeof bodyImages === "string") {
      try {
        uploadedUrls = JSON.parse(bodyImages);
      } catch {
        uploadedUrls = [bodyImages];
      }
    } else if (Array.isArray(bodyImages)) {
      uploadedUrls = bodyImages;
    }
  }

  return uploadedUrls;
};

module.exports = {
  uploadSingleToCloudinary,
  handleImageUploads,
};