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
import upload from "../middleware/upload.js"; // ✅ Import upload middleware

const medicineRouter = express.Router();

medicineRouter.use(authMiddleware); // ✅ All routes below need authentication

// ✅ Add medicine with image upload
medicineRouter.post("/", upload.single("image"), addMedicine);

// ✅ Get all medicines
medicineRouter.get("/", getAllMedicines);

// ✅ Get single medicine by ID
medicineRouter.get("/:id", getMedicineById);
medicineRouter.patch("/:id/sell", sellMedicine);

// ✅ Update medicine with new image upload option
medicineRouter.put("/:id", upload.single("image"), updateMedicine);

// ✅ Delete medicine
medicineRouter.delete("/:id", deleteMedicine);

export default medicineRouter;
