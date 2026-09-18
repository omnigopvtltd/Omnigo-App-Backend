const Tesseract = require("tesseract.js");

exports.extractTextFromImage = async (imageBuffer, mimeType = "image/png") => {
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    console.log("⚠️ Invalid buffer passed to OCR.");
    return "";
  }

  try {
    console.log("📸 Starting Tesseract OCR extraction...");
    const base64Data = imageBuffer.toString("base64");
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    const { data } = await Tesseract.recognize(dataUri, "eng", {
      logger: () => {}, // Suppress worker logs for clean console
    });

    const extractedText = data && data.text ? data.text.trim() : "";
    console.log("✅ OCR Extraction completed. Extracted length:", extractedText.length);
    return extractedText;
  } catch (err) {
    console.error("❌ OCR Error gracefully handled:", err.message || err);
    return "";
  }
};