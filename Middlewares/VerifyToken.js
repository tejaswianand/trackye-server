const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res
      .status(400)
      .json({ status: false, message: "Unauthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(400).json({
      status: false,
      message: "Unauthorized Access - No Token",
    });
  }
  jwt.verify(token, process.env.JWT_KEY, (err, decoded) => {
    if (err) {
      return res.status(500).json({ status: false, message: "Invalid Token" });
    }
    req.userId = decoded.userId;
    next();
  });
};

module.exports = verifyToken;
