import Medicine from "../models/Medicine.js";
import Sale from "../models/Sales.js";

// controllers/medicineController.js

export const addMedicine = async (req, res) => {
  try {
    const {
      name,
      category,
      packSize,
      dosageForm,
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
      dosageForm: dosageForm || "",
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

    // Create sale record
    const sale = await Sale.create({
      medicine: medicine._id,
      medicineName: medicine.name,
      quantitySold: unitsSold,
      packagesSold: packagesUsed,
      sellType: sellType,
      unitPrice: unitPrice,
      totalAmount: totalAmount,
      soldBy: "operator",
      packSize: medicine.packSize,
      soldAt: new Date(),
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

export const getAllSales = async (req, res) => {
  try {
    const sales = await Sale.find()
      .sort({ soldAt: -1 })
      .populate("medicine", "name category manufacturer salePrice");

    // 🔧 Normalize data for frontend readability
    const formattedSales = sales.map((s) => ({
      _id: s._id,
      name: s.medicineName || s.medicine?.name || "Unknown",
      category: s.medicine?.category || "-",
      manufacturer: s.medicine?.manufacturer || "-",
      quantitySold: s.quantitySold,
      salePrice: s.unitPrice || s.medicine?.salePrice || 0,
      total: s.totalAmount || s.quantitySold * (s.unitPrice || 0),
      soldAt: s.soldAt,
      soldBy: s.soldBy,
      note: s.note,
    }));

    res.status(200).json({ success: true, data: formattedSales });
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

// ✅ Get all medicines
export const getAllMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: medicines });
  } catch (error) {
    console.error("Error fetching medicines:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching medicines",
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
      "dosageForm",
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

    // ✅ FIX: Track changes with BOTH old and new values
    const changes = {};
    allowedFields.forEach((field) => {
      if (updates[field] !== undefined && updates[field] !== medicine[field]) {
        changes[field] = {
          from: medicine[field], // Old value
          to: updates[field], // New value
        };
        // Update the medicine field
        medicine[field] = updates[field];
      }
    });

    // ✅ Only add to history if there are actual changes
    if (Object.keys(changes).length > 0) {
      medicine.history.push({
        updatedAt: new Date(),
        changes: changes, // Now contains {field: {from: old, to: new}}
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
