// controllers/reportsController.js

import Medicine from "../models/Medicine.js";
import Report from "../models/Report.js";

// Helper function to calculate medicine status
const getMedicineStatus = (medicine) => {
  if (medicine.unitsAvailable === 0) return "Out of Stock";
  if (medicine.unitsAvailable < 50) return "Low Stock";

  const expiryDate = new Date(medicine.expiry);
  const today = new Date();
  const nearExpiryThreshold = new Date(today);
  nearExpiryThreshold.setDate(today.getDate() + 90); // 90 days warning

  if (expiryDate < today) return "Expired";
  if (expiryDate <= nearExpiryThreshold) return "Near Expiry";

  return "Good";
};

// ────────────────────────────────────────────────
// 1. All Medicines Stock Report (with Date Range)
// GET /api/reports/stock
export const getAllStockReport = async (req, res) => {
  try {
    const { 
      search, 
      category, 
      status, 
      fromDate, 
      toDate,
      page = 1, 
      limit = 50 
    } = req.query;

    let query = {};

    // Search by name
    if (search) {
      query.name = { $regex: search.trim(), $options: "i" };
    }

    // Category filter
    if (category && category !== "All") {
      query.category = category;
    }

  if (fromDate || toDate) {
  query.createdAt = {};

  if (fromDate) {
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    query.createdAt.$gte = start;
  }

  if (toDate) {
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    query.createdAt.$lte = end;
  }
}
    const medicines = await Medicine.find(query)
      .select("name category packSize strength expiry unitsAvailable unitsPerPackage purchasePrice salePrice")
      .sort({ name: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    // Enrich data
    let enrichedMedicines = medicines.map((med) => ({
      ...med,
      status: getMedicineStatus(med),
      totalValue: med.unitsAvailable * med.salePrice,
      expiryFormatted: med.expiry ? new Date(med.expiry).toLocaleDateString() : "-",
    }));
   if (status && status !== "") {
  enrichedMedicines = enrichedMedicines.filter(
    (m) => m.status === status
  );
}


   const summary = {
  totalMedicines: enrichedMedicines.length,
  totalStockValue: enrichedMedicines.reduce((sum, m) => sum + m.totalValue, 0),
  lowStockCount: enrichedMedicines.filter(m => m.status === "Low Stock").length,
  nearExpiryCount: enrichedMedicines.filter(m => m.status === "Near Expiry").length,
  expiredCount: enrichedMedicines.filter(m => m.status === "Expired").length,
};

    // Save report
    const savedReport = await new Report({
      title: `All Medicines Stock Report ${new Date().toLocaleDateString()}`,
      type: "all_medicines",
      filters: { search, category, page, limit },
      summary,
      generatedBy: req.admin._id,
    }).save();

    return res.status(200).json({
      success: true,
      reportId: savedReport._id,
      summary,
      medicines: enrichedMedicines,
      pagination: {
        page: Number(page),
        limit: Number(limit),
      total: enrichedMedicines.length
      },
    });
  } catch (error) {
    console.error("All Stock Report Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating stock report",
      error: error.message,
    });
  }
};

// ────────────────────────────────────────────────
// 2. Specific Medicine Detailed Report
// GET /api/reports/medicine/:id
export const getSpecificMedicineReport = async (req, res) => {
  try {
    const { id } = req.params;

    const medicine = await Medicine.findOne({
  name: { $regex: id, $options: "i" }
});

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    const status = getMedicineStatus(medicine);
    const totalValue = medicine.unitsAvailable * medicine.salePrice;

    // Save report
    const savedReport = await new Report({
      title: `Detailed Report - ${medicine.name}`,
      type: "specific_medicine",
      filters: { medicineId: id },
      summary: {
        name: medicine.name,
        status,
        totalValue,
        unitsAvailable: medicine.unitsAvailable,
        expiry: medicine.expiry,
      },
      generatedBy: req.admin._id,
    }).save();

    return res.status(200).json({
      success: true,
      reportId: savedReport._id,
      medicine: {
        ...medicine.toObject(),
        status,
        totalValue,
        expiryFormatted: new Date(medicine.expiry).toLocaleDateString(),
      },
      history: medicine.history || [],
    });
  } catch (error) {
    console.error("Specific Medicine Report Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating medicine report",
      error: error.message,
    });
  }
};

// ────────────────────────────────────────────────
// 3. Expiry Report (Near Expiry + Expired)
// GET /api/reports/expiry
export const getExpiryReport = async (req, res) => {
  try {
    const { days = 90 } = req.query; // Near expiry threshold in days

    const today = new Date();
    const nearExpiryDate = new Date(today);
    nearExpiryDate.setDate(today.getDate() + Number(days));

    const nearExpiry = await Medicine.find({
      expiry: { $lte: nearExpiryDate, $gte: today },
      unitsAvailable: { $gt: 0 },
    })
      .select("name expiry unitsAvailable purchasePrice salePrice")
      .sort({ expiry: 1 })
      .lean();

    const expired = await Medicine.find({
      expiry: { $lt: today },
      unitsAvailable: { $gt: 0 },
    })
      .select("name expiry unitsAvailable purchasePrice salePrice")
      .sort({ expiry: 1 })
      .lean();

    const enrichedNear = nearExpiry.map((m) => ({
      ...m,
      potentialLoss: m.unitsAvailable * m.purchasePrice,
      daysLeft: Math.ceil((new Date(m.expiry) - today) / (1000 * 60 * 60 * 24)),
    }));

    const enrichedExpired = expired.map((m) => ({
      ...m,
      loss: m.unitsAvailable * m.purchasePrice,
    }));

    const summary = {
      nearExpiryCount: nearExpiry.length,
      expiredCount: expired.length,
      nearExpiryPotentialLoss: enrichedNear.reduce((sum, m) => sum + m.potentialLoss, 0),
      expiredLoss: enrichedExpired.reduce((sum, m) => sum + m.loss, 0),
    };

    // Save report
    const savedReport = await new Report({
      title: `Expiry Report (${days} days threshold)`,
      type: "expiry",
      filters: { days },
      summary,
      generatedBy: req.admin._id,
    }).save();

    return res.status(200).json({
      success: true,
      reportId: savedReport._id,
      summary,
      nearExpiry: enrichedNear,
      expired: enrichedExpired,
    });
  } catch (error) {
    console.error("Expiry Report Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating expiry report",
      error: error.message,
    });
  }
};

// ────────────────────────────────────────────────
// 4. Low Stock Report
// GET /api/reports/low-stock
export const getLowStockReport = async (req, res) => {
  try {
    const { threshold = 50 } = req.query;

    const lowStock = await Medicine.find({
      unitsAvailable: { $gt: 0, $lte: Number(threshold) },
    })
      .select("name category unitsAvailable purchasePrice salePrice")
      .sort({ unitsAvailable: 1 })
      .lean();

    const enriched = lowStock.map((m) => ({
      ...m,
      totalValue: m.unitsAvailable * m.salePrice,
      reorderSuggestion: Math.max(0, 100 - m.unitsAvailable), // example logic
    }));

    const summary = {
      lowStockCount: enriched.length,
      totalLowStockValue: enriched.reduce((sum, m) => sum + m.totalValue, 0),
    };

    const savedReport = await new Report({
      title: `Low Stock Report (threshold: ${threshold})`,
      type: "low_stock",
      filters: { threshold },
      summary,
      generatedBy: req.admin._id,
    }).save();

    return res.status(200).json({
      success: true,
      reportId: savedReport._id,
      summary,
      lowStockItems: enriched,
    });
  } catch (error) {
    console.error("Low Stock Report Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating low stock report",
      error: error.message,
    });
  }
};

// Bonus: Get saved report by ID (for frontend to view old reports)
// GET /api/reports/:id
export const getSavedReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate("generatedBy", "name email");

    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    return res.status(200).json({ success: true, report });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching saved report",
      error: error.message,
    });
  }
};

export default {
  getAllStockReport,
  getSpecificMedicineReport,
  getExpiryReport,
  getLowStockReport,
  getSavedReport,
};