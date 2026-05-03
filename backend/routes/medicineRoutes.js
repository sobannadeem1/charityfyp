import express from "express";
import {
  addMedicine,
  getAllMedicines,
  getMedicineById,
  updateMedicine,
  deleteMedicine,
  sellMedicine,
  getAllSales,
  getSalesByMedicine,
  bulkSellMedicines,
} from "../controllers/medicineController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const medicineRouter = express.Router();

medicineRouter.get("/", getAllMedicines);
medicineRouter.get("/:id", getMedicineById);
medicineRouter.get("/sold/records", getAllSales);
medicineRouter.get("/sales/:id", getSalesByMedicine);
medicineRouter.post("/sales/bulk", bulkSellMedicines);

medicineRouter.post("/", authMiddleware, addMedicine);
medicineRouter.put("/:id", authMiddleware, updateMedicine);
medicineRouter.patch("/:id/sell", authMiddleware, sellMedicine);
medicineRouter.delete("/:id", authMiddleware, deleteMedicine);

export default medicineRouter;
