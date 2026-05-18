const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ msg: "No token" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // USER ATTACH
    req.user = {
      id: decoded.id,
      role: decoded.role
    };

    // SOCKET ROOM JOIN SUPPORT (IMPORTANT FOR REAL-TIME)
    const io = req.app.get("io");

    if (io) {
      req.socketJoin = () => {
        // user-specific room
        io.sockets.sockets.forEach((socket) => {
          if (socket.userId === decoded.id) {
            socket.join(decoded.id);
          }
        });
      };
    }

    next();

  } catch (err) {
    res.status(401).json({ msg: "Invalid token" });
  }
};