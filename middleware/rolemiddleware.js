module.exports = (...roles) => {
  return (req, res, next) => {
    try {
      // safety check
      if (!req.user || !req.user.role) {
        return res.status(401).json({ msg: "Unauthorized" });
      }

      // role check
      if (!roles.includes(req.user.role)) {

        //  OPTIONAL SOCKET EVENT (useful for admin panels / logs)
        const io = req.app.get("io");

        if (io) {
          io.to(req.user.id).emit("access_denied", {
            msg: "You tried to access restricted resource",
            role: req.user.role,
            required: roles
          });
        }

        return res.status(403).json({ msg: "Access Denied" });
      }

      next();

    } catch (err) {
      return res.status(500).json({ msg: "Role middleware error" });
    }
  };
};