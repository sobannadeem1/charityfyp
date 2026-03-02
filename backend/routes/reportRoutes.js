import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getAllStockReport, getExpiryReport, getLowStockReport, getSavedReport, getSpecificMedicineReport } from "../controllers/reportController.js";

const router = express.Router();

router.get('/stock', authMiddleware, getAllStockReport);
router.get('/medicine/:id', authMiddleware, getSpecificMedicineReport);
router.get('/expiry', authMiddleware, getExpiryReport);
router.get('/low-stock', authMiddleware, getLowStockReport);
router.get('/:id', authMiddleware, getSavedReport);

export default router;