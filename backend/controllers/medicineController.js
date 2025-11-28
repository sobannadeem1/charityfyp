import Medicine from "../models/Medicine.js";
import Sale from "../models/Sales.js";

// controllers/medicineController.js

export const addMedicine = async (req, res) => {
  try {
    const {
      name,
      category,
      packSize,
      strength,
      expiry,
      quantity,
      purchasePrice,
      salePrice,
      manufacturer,
      supplier,
      storageCondition,
    } = req.body;

    // Extract units per package
    const unitsPerPackage = extractUnitsFromPackSize(packSize);
    const unitsAvailable = quantity * unitsPerPackage;

    const medicine = await Medicine.create({
      name,
      category,
      packSize: packSize || "",
      strength: strength || "",
      expiry: new Date(expiry),
      quantity: Number(quantity),
      unitsAvailable: unitsAvailable,
      unitsPerPackage: unitsPerPackage,
      purchasePrice: Number(purchasePrice),
      salePrice: Number(salePrice),
      manufacturer: manufacturer || "",
      supplier: supplier || "",
      storageCondition: storageCondition || "Room Temperature",
    });

    res.status(201).json({
      success: true,
      message: "Medicine added successfully ✅",
      data: medicine,
    });
  } catch (error) {
    console.error("Error adding medicine:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding medicine",
      error: error.message,
    });
  }
};
// Helper function to extract units from packSize - ULTRA ROBUST
const extractUnitsFromPackSize = (packSize) => {
  console.log("=== EXTRACT UNITS DEBUG ===");
  console.log("Input packSize:", packSize);

  if (!packSize || packSize === "") {
    console.log("Empty packSize, returning 1");
    return 1;
  }

  const packSizeStr = packSize.toString().trim().toLowerCase();

  // Early return for simple numbers
  if (/^\d+$/.test(packSizeStr)) {
    const units = parseInt(packSizeStr);
    console.log("✅ Simple number format - Units:", units);
    return units;
  }

  // Common medicine unit patterns
  const unitPatterns = [
    { pattern: /(\d+)\s*tablets?/, name: "tablets" },
    { pattern: /(\d+)\s*capsules?/, name: "capsules" },
    { pattern: /(\d+)\s*pills?/, name: "pills" },
    { pattern: /(\d+)\s*strips?/, name: "strips" },
    { pattern: /(\d+)\s*ml/, name: "ml" },
    { pattern: /(\d+)\s*vials?/, name: "vials" },
    { pattern: /(\d+)\s*bottles?/, name: "bottles" },
    { pattern: /(\d+)\s*sachets?/, name: "sachets" },
    { pattern: /(\d+)\s*tubes?/, name: "tubes" },
    { pattern: /(\d+)\s*pieces?/, name: "pieces" },
    { pattern: /(\d+)\s*units?/, name: "units" },
    { pattern: /(\d+)\s*ct/, name: "count" },
    { pattern: /(\d+)\s*count/, name: "count" },
    { pattern: /(\d+)\s*pk/, name: "pack" },
    { pattern: /(\d+)\s*pack/, name: "pack" },
    { pattern: /(\d+)x\d+/, name: "multiplication" },
    { pattern: /(\d+)\s*mg/, name: "mg" },
    { pattern: /(\d+)\s*g/, name: "grams" },
  ];

  for (const unitPattern of unitPatterns) {
    const match = packSizeStr.match(unitPattern.pattern);
    if (match && match[1]) {
      const units = parseInt(match[1]);
      console.log(`✅ ${unitPattern.name} format - Units:`, units);
      return units;
    }
  }

  // Fallback: Extract first number found
  const fallbackMatch = packSizeStr.match(/(\d+)/);
  if (fallbackMatch && fallbackMatch[1]) {
    const units = parseInt(fallbackMatch[1]);
    console.log("✅ Fallback - First number found:", units);
    return units;
  }

  console.log("❌ No numbers found, defaulting to 1");
  return 1;
};
export const sellMedicine = async (req, res) => {
  try {
    const { quantitySold, sellType = "packages" } = req.body;

    if (!quantitySold || quantitySold <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid quantity" });
    }

    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res
        .status(404)
        .json({ success: false, message: "Medicine not found" });
    }

    let unitsSold = quantitySold;
    let unitPrice = medicine.salePrice;
    let totalAmount = 0;
    let packagesUsed = 0;

    console.log("🔍 DEBUG - Sale Calculation:");
    console.log("Units Available:", medicine.unitsAvailable);
    console.log("Units Per Package:", medicine.unitsPerPackage);
    console.log("Requested:", quantitySold, sellType);

    if (sellType === "units") {
      // Sell individual units - SIMPLE & ACCURATE
      if (quantitySold > medicine.unitsAvailable) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock! Only ${medicine.unitsAvailable} units available.`,
        });
      }

      // Calculate unit price and total
      unitPrice = medicine.salePrice / medicine.unitsPerPackage;
      totalAmount = unitPrice * quantitySold;
      unitsSold = quantitySold;

      // Update inventory - DEDUCT ACTUAL UNITS
      medicine.unitsAvailable -= quantitySold;

      // Calculate packages used for reporting
      packagesUsed = Math.ceil(quantitySold / medicine.unitsPerPackage);
    } else {
      // Sell complete packages
      const packagesRequested = quantitySold;
      const unitsRequested = packagesRequested * medicine.unitsPerPackage;

      if (unitsRequested > medicine.unitsAvailable) {
        return res.status(400).json({
          success: false,
          message: `Not enough packages! Only ${Math.floor(
            medicine.unitsAvailable / medicine.unitsPerPackage
          )} available.`,
        });
      }

      unitPrice = medicine.salePrice;
      totalAmount = medicine.salePrice * packagesRequested;
      unitsSold = unitsRequested;
      packagesUsed = packagesRequested;

      // Update inventory
      medicine.unitsAvailable -= unitsRequested;
    }

    // Update physical package count (for display only)
    medicine.quantity = Math.ceil(
      medicine.unitsAvailable / medicine.unitsPerPackage
    );

    console.log("✅ Final Inventory:");
    console.log("Units Available:", medicine.unitsAvailable);
    console.log("Physical Packages:", medicine.quantity);
    console.log("Packages Used:", packagesUsed);

    // Auto mark as expired/inactive if needed
    if (medicine.unitsAvailable <= 0) medicine.isActive = false;
    if (new Date(medicine.expiry) < new Date()) medicine.isExpired = true;

    // Save updated medicine
    await medicine.save();

    const sale = await Sale.create({
      medicine: medicine._id,
      medicineName: medicine.name,
      quantitySold: quantitySold, // ← FIXED: use original input
      packagesSold: packagesUsed,
      sellType: sellType,
      unitPrice: unitPrice,
      totalAmount: totalAmount,
      soldBy: "operator",
      packSize: medicine.packSize,
      soldAt: new Date(),
      originalQuantity: quantitySold,
      originalSellType: sellType,
      unitsPerPackage: medicine.unitsPerPackage,
    });

    res.status(200).json({
      success: true,
      message:
        sellType === "packages"
          ? `${quantitySold} package(s) sold successfully`
          : `${unitsSold} unit(s) sold successfully`,
      data: { medicine, sale },
    });
  } catch (error) {
    console.error("Error selling medicine:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Unified sales controller that handles both normal and search
export const getAllSales = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const searchTerm = req.query.q || req.query.search || ""; // Support both parameter names
    const skip = (page - 1) * limit;

    console.log(
      `📊 Fetching sales - Page: ${page}, Limit: ${limit}, Search: "${searchTerm}"`
    );

    // Build search query - empty if no search term
    let searchQuery = {};
    if (searchTerm && searchTerm.trim() !== "") {
      searchQuery = {
        $or: [
          { medicineName: { $regex: searchTerm, $options: "i" } },
          { "medicine.name": { $regex: searchTerm, $options: "i" } },
          { "medicine.category": { $regex: searchTerm, $options: "i" } },
          { "medicine.manufacturer": { $regex: searchTerm, $options: "i" } },
        ],
      };
    }

    // Get total count for pagination info
    const totalSales = await Sale.countDocuments(searchQuery);

    const sales = await Sale.find(searchQuery)
      .sort({ soldAt: -1 })
      .populate("medicine", "name category manufacturer salePrice packSize")
      .skip(skip)
      .limit(limit)
      .lean();

    // Format sales data
    const formattedSales = sales.map((s) => ({
      _id: s._id,
      name: s.medicineName || s.medicine?.name || "Unknown",
      category: s.medicine?.category || "-",
      manufacturer: s.medicine?.manufacturer || "-",
      quantitySold: s.quantitySold,
      salePrice: s.medicine?.salePrice || 0,
      unitPrice: s.unitPrice || 0,
      total: s.totalAmount || 0,
      soldAt: s.soldAt,
      soldBy: s.soldBy,
      note: s.note,
      packSize: s.packSize || s.medicine?.packSize || "-",
      sellType: s.sellType || s.originalSellType || "packages",
      originalQuantity: s.originalQuantity || s.quantitySold,
      unitsPerPackage: s.unitsPerPackage || 1,
      originalSellType: s.originalSellType || s.sellType || "packages",
    }));

    res.status(200).json({
      success: true,
      data: formattedSales,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalSales / limit),
        totalSales,
        hasNextPage: page < Math.ceil(totalSales / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching sales:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSalesByMedicine = async (req, res) => {
  try {
    const medicineId = req.params.id;
    const sales = await Sale.find({ medicine: medicineId }).sort({
      soldAt: -1,
    });
    res.status(200).json({ success: true, data: sales });
  } catch (error) {
    console.error("Error fetching sales by medicine:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Update getAllMedicines to support pagination and search
export const getAllMedicines = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    console.log(
      `📦 Fetching medicines - Page: ${page}, Limit: ${limit}, Search: "${search}"`
    );

    // Build search query
    let query = {};
    if (search && search.trim() !== "") {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
          { manufacturer: { $regex: search, $options: "i" } },
        ],
      };
    }

    // Get total count for pagination info
    const totalMedicines = await Medicine.countDocuments(query);

    // Get paginated results
    const medicines = await Medicine.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log(
      `✅ Medicines fetched - Found: ${totalMedicines} total, Returning: ${medicines.length} records`
    );

    res.status(200).json({
      success: true,
      data: medicines,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalMedicines / limit),
        totalMedicines,
        hasNextPage: page < Math.ceil(totalMedicines / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching medicines:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching medicines",
      error: error.message,
    });
  }
};

// ✅ Get single medicine
export const getMedicineById = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine)
      return res
        .status(404)
        .json({ success: false, message: "Medicine not found" });

    res.status(200).json({ success: true, data: medicine });
  } catch (error) {
    console.error("Error fetching medicine:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching medicine",
    });
  }
};

// ✅ Update medicine
export const updateMedicine = async (req, res) => {
  try {
    const updates = req.body;
    const allowedFields = [
      "name",
      "category",
      "packSize",
      "strength",
      "expiry",
      "quantity",
      "purchasePrice",
      "salePrice",
      "manufacturer",
      "supplier",
      "storageCondition",
    ];

    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res
        .status(404)
        .json({ success: false, message: "Medicine not found" });
    }

    medicine.history = medicine.history || [];
    const changes = {};

    // Track if quantity or packSize changes (affects unitsAvailable)
    const shouldRecalculateUnits =
      updates.quantity !== undefined || updates.packSize !== undefined;

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined && updates[field] !== medicine[field]) {
        changes[field] = {
          from: medicine[field],
          to: updates[field],
        };
        medicine[field] = updates[field];
      }
    });

    // ✅ CRITICAL FIX: Recalculate unitsAvailable when quantity or packSize changes
    if (shouldRecalculateUnits) {
      const oldUnitsAvailable = medicine.unitsAvailable;

      // Re-extract units per package if packSize changed
      if (updates.packSize !== undefined) {
        medicine.unitsPerPackage = extractUnitsFromPackSize(medicine.packSize);
      }

      // Recalculate total units available
      medicine.unitsAvailable = medicine.quantity * medicine.unitsPerPackage;

      console.log("🔄 UNITS RECALCULATION:", {
        oldQuantity: changes.quantity?.from,
        newQuantity: medicine.quantity,
        oldUnitsAvailable: oldUnitsAvailable,
        newUnitsAvailable: medicine.unitsAvailable,
        unitsPerPackage: medicine.unitsPerPackage,
      });
    }

    // Only add to history if there are actual changes
    if (Object.keys(changes).length > 0) {
      medicine.history.push({
        updatedAt: new Date(),
        changes: changes,
      });
    }

    if (medicine.expiry && new Date(medicine.expiry) < new Date()) {
      medicine.isExpired = true;
    }

    const updatedMedicine = await medicine.save();

    return res.status(200).json({
      success: true,
      message: "Medicine updated successfully ✅",
      data: updatedMedicine,
    });
  } catch (error) {
    console.error("Error updating medicine:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Delete medicine
export const deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);
    if (!medicine)
      return res
        .status(404)
        .json({ success: false, message: "Medicine not found" });

    res.status(200).json({
      success: true,
      message: "Medicine deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting medicine:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting medicine",
    });
  }
};

export const deleteAllSales = async (req, res) => {
  try {
    const allSales = await Sale.find({});
    if (allSales.length === 0) {
      return res.json({ success: true, message: "No sales to delete" });
    }

    await restoreStockForSales(allSales);
    await Sale.deleteMany({});

    res.json({
      success: true,
      message: `All ${allSales.length} sales deleted & stock restored`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
// 2. DELETE MULTIPLE SELECTED GROUPS
export const deleteSelectedSales = async (req, res) => {
  try {
    const { groups } = req.body; // array of { timestamp: "...", soldBy: "..." }

    if (!Array.isArray(groups) || groups.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No groups selected" });
    }

    let allSales = [];
    for (const { timestamp, soldBy } of groups) {
      const sales = await Sale.find({
        soldAt: {
          $gte: new Date(timestamp),
          $lt: new Date(new Date(timestamp).getTime() + 1000),
        },
        soldBy: soldBy || { $exists: true },
      });
      allSales = allSales.concat(sales);
    }

    if (allSales.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No records found" });
    }

    await restoreStockForSales(allSales);
    await Sale.deleteMany({ _id: { $in: allSales.map((s) => s._id) } });

    res.json({
      success: true,
      message: `Deleted ${allSales.length} records & restored stock`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
// 1. DELETE SINGLE SALE GROUP (by timestamp + soldBy)
export const deleteSaleGroup = async (req, res) => {
  try {
    const { timestamp, soldBy = "unknown" } = req.params;

    const sales = await Sale.find({
      soldAt: {
        $gte: new Date(timestamp),
        $lt: new Date(new Date(timestamp).getTime() + 1000),
      },
      soldBy: soldBy === "unknown" ? { $exists: true } : soldBy,
    });

    if (sales.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Sale group not found" });
    }

    await restoreStockForSales(sales);
    await Sale.deleteMany({ _id: { $in: sales.map((s) => s._id) } });

    res.json({
      success: true,
      message: `Deleted ${sales.length} sale record(s) & restored stock`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
