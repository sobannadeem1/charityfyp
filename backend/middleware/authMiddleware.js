import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  const token = req.cookies?.token; // read token from cookie
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    // verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded; // you can rename to req.user if you want
    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    return res.status(401).json({ message: "Token is not valid" });
  }
};

export default authMiddleware;
