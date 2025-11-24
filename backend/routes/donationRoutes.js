import express from "express";
import {
  createDonation,
  getAllDonations,
  getDonationById,
  updateDonationStatus,
  deleteDonation,
} from "../controllers/donationController.js";
import authMiddleware from "../middleware/authMiddleware.js";
const router = express.Router();

router.post("/", authMiddleware, createDonation);

router.get("/", getAllDonations);

router.get("/:id", authMiddleware, getDonationById);

router.put("/:id/status", authMiddleware, updateDonationStatus);

router.delete("/:id", authMiddleware, deleteDonation);

export default router;
