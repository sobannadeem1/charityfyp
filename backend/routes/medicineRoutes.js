import express from "express";
import {
  addMedicine,
  getAllMedicines,
  getMedicineById,
  updateMedicine,
  deleteMedicine,
  sellMedicine,
} from "../controllers/medicineController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const medicineRouter = express.Router();

// ✅ All routes below require authentication
medicineRouter.use(authMiddleware);

// ✅ Add medicine (no image upload)
medicineRouter.post("/", addMedicine);

// ✅ Get all medicines
medicineRouter.get("/", getAllMedicines);

// ✅ Get single medicine by ID
medicineRouter.get("/:id", getMedicineById);

// ✅ Sell medicine (reduce quantity)
medicineRouter.patch("/:id/sell", sellMedicine);

// ✅ Update medicine details
medicineRouter.put("/:id", updateMedicine);

// ✅ Delete medicine
medicineRouter.delete("/:id", deleteMedicine);

export default medicineRouter;
