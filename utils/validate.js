// const { AppError } = require("./AppError"); // Agar AppError use kar rahi hain toh uncomment kar dein

/**
 * Helper to throw formatted validation errors
 */
const throwValidationError = (message) => {
  const err = new Error(message);
  err.statusCode = 400;
  err.code = "VALIDATION";
  throw err;
};

/**
 * Parse and validate Latitude (-90 to 90)
 */
exports.parseLat = (val, fieldName = "lat") => {
  if (val === undefined || val === null || val === "") {
    throwValidationError(`${fieldName} required hai`);
  }
  const num = Number(val);
  if (!Number.isFinite(num) || num < -90 || num > 90) {
    throwValidationError(`Invalid ${fieldName}: latitude -90 aur 90 ke darmiyan honi chahiye`);
  }
  return num;
};

/**
 * Parse and validate Longitude (-180 to 180)
 */
exports.parseLon = (val, fieldName = "lon") => {
  if (val === undefined || val === null || val === "") {
    throwValidationError(`${fieldName} required hai`);
  }
  const num = Number(val);
  if (!Number.isFinite(num) || num < -180 || num > 180) {
    throwValidationError(`Invalid ${fieldName}: longitude -180 aur 180 ke darmiyan honi chahiye`);
  }
  return num;
};

/**
 * Ensure coordinates fall roughly within Pakistan's geographical bounding box.
 * Pakistan Approx Bounds:
 * Latitude: ~23.6 to ~37.1
 * Longitude: ~60.8 to ~77.8
 */
exports.assertInPakistan = (lat, lon) => {
  const minLat = 23.5;
  const maxLat = 37.2;
  const minLon = 60.5;
  const maxLon = 78.0;

  if (lat < minLat || lat > maxLat || lon < minLon || lon > maxLon) {
    const err = new Error("Service sirf Pakistan ke andar available hai");
    err.statusCode = 400;
    err.code = "OUT_OF_BOUNDS";
    throw err;
  }
  return true;
};