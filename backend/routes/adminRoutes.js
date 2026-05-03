import express from "express";
import {
  registerAdmin,
  loginAdmin,
  logoutAdmin,
} from "../controllers/adminController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);

router.post("/logout", authMiddleware, logoutAdmin);
router.get("/me", authMiddleware, (req, res) => {
  res.json({
    message: "Authenticated successfully",
    admin: req.admin,
  });
});

export default router;
