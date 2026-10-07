const cloudinary = require('../config/cloudinary');

/**
 * Single file buffer ko Cloudinary par upload karne ka helper
 * @param {Buffer} fileBuffer - Multer file buffer (`req.file.buffer` ya `file.buffer`)
 * @param {String} folderName - Cloudinary target folder (e.g., 'products', 'vendors', 'categories')
 * @returns {Promise<String>} Cloudinary secure URL
 */
const uploadSingleToCloudinary = (fileBuffer, folderName = "general") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: folderName },
      (error, result) => {
        if (result) resolve(result.secure_url);
        else reject(error);
      }
    );
    stream.end(fileBuffer);
  });
};

/**
 * Express Request Object (req) se Multiple/Single Files ya Body URLs ko parse karke Cloudinary par upload karne ka universal helper
 * @param {Object} req - Express Request Object
 * @param {String} fieldName - Form-data file key name (e.g., 'images', 'logo', 'coverImage')
 * @param {String} folderName - Cloudinary folder name
 * @returns {Promise<Array<String>>} Array of uploaded Cloudinary image URLs
 */
const handleImageUploads = async (req, fieldName = "images", folderName = "general") => {
  let uploadedUrls = [];

  // 1. Array of files via Multer (upload.array or upload.fields)
  if (req.files) {
    let filesToProcess = [];

    if (Array.isArray(req.files) && req.files.length > 0) {
      filesToProcess = req.files;
    } else if (typeof req.files === "object" && req.files[fieldName]) {
      // Handles req.files['logo'] when using upload.fields()
      filesToProcess = req.files[fieldName];
    }

    if (filesToProcess.length > 0) {
      const uploadPromises = filesToProcess.map((file) =>
        uploadSingleToCloudinary(file.buffer, folderName)
      );
      uploadedUrls = await Promise.all(uploadPromises);
      return uploadedUrls;
    }
  }

  // 2. Single file via Multer (upload.single)
  if (req.file) {
    const url = await uploadSingleToCloudinary(req.file.buffer, folderName);
    return [url];
  }

  // 3. Direct JSON Array or String URL passed in body
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