const jwt = require("jsonwebtoken");
const { generateToken } = require("../controllers/authController");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    // 🔥 Smart Auto-Refresh Logic:
    // Agar token ki expiry ko 2 din se kam waqt reh gaya hai, toh naya token bana do
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = decoded.exp - now;
    const TWO_DAYS_IN_SECONDS = 2 * 24 * 60 * 60;

    if (expiresIn < TWO_DAYS_IN_SECONDS) {
      const newToken = generateToken({ _id: decoded.id, role: decoded.role });
      console.log(newToken, expiresIn);
      // Response header mein naya token bhej dein
      res.setHeader("x-new-token", newToken);
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
