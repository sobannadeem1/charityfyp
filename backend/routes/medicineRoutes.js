import express from "express";
import {
  addMedicine,
  getAllMedicines,
  getMedicineById,
  updateMedicine,
  deleteMedicine,
} from "../controllers/medicineController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const medicineRouter = express.Router();

medicineRouter.use(authMiddleware); // ✅ All routes below need authentication

medicineRouter.post("/", addMedicine);
medicineRouter.get("/", getAllMedicines);
medicineRouter.get("/:id", getMedicineById);
medicineRouter.put("/:id", updateMedicine);
medicineRouter.delete("/:id", deleteMedicine);

export default medicineRouter;
