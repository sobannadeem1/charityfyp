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

    // ✅ Required fields check
    if (
      !name ||
      !category ||
      !expiry ||
      !quantity ||
      !purchasePrice ||
      !salePrice
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please fill all required fields (name, category, expiry, quantity, prices)",
      });
    }

    // ✅ Convert expiry string to Date
    const expiryDate = new Date(expiry);
    if (isNaN(expiryDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expiry date format",
      });
    }

    // ✅ Create new medicine entry
    const medicine = await Medicine.create({
      name,
      category,
      packSize: packSize || "",
      dosageForm: dosageForm || "",
      strength: strength || "",
      expiry: expiryDate,
      quantity: Number(quantity),
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

// ✅ Sell medicine (reduce stock) - UPDATED VERSION
// ✅ Sell medicine (reduce stock) - FIXED VERSION
export const sellMedicine = async (req, res) => {
  try {
    const { quantitySold, sellType = "packages" } = req.body;

    if (!quantitySold || quantitySold <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid quantity" });
    }

    const medicine = await Medicine.findById(req.params.id);
    if (!medicine)
      return res
        .status(404)
        .json({ success: false, message: "Medicine not found" });

    // Helper function to extract units from packSize
    const extractUnitsFromPackSize = (packSize) => {
      if (!packSize) return 1;
      const match = packSize.match(
        /(\d+)\s*(tablets?|capsules?|ml|vials?|bottles?|sachets?|tubes?|pieces?|units?)/i
      );
      return match ? parseInt(match[1]) : 1;
    };

    let packagesToReduce;
    let unitsSold = quantitySold;
    let unitPrice = medicine.salePrice;
    let totalAmount = 0;

    if (sellType === "units") {
      const unitsPerPackage = extractUnitsFromPackSize(medicine.packSize);

      if (unitsPerPackage <= 0) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid pack size format. Please use format like '10 tablets'",
        });
      }

      // Calculate complete packages needed
      packagesToReduce = Math.ceil(quantitySold / unitsPerPackage);

      // Check stock availability
      if (packagesToReduce > medicine.quantity) {
        const availableUnits = medicine.quantity * unitsPerPackage;
        return res.status(400).json({
          success: false,
          message: `Not enough stock! Only ${availableUnits} units available.`,
        });
      }

      // Calculate actual units that will be sold (may be more than requested due to package constraint)
      const actualUnitsSold = Math.min(
        quantitySold,
        packagesToReduce * unitsPerPackage
      );

      // Calculate price per unit and total
      unitPrice = medicine.salePrice / unitsPerPackage;
      unitsSold = actualUnitsSold;
      totalAmount = unitPrice * actualUnitsSold;
    } else {
      // Package sales
      if (quantitySold > medicine.quantity) {
        return res.status(400).json({
          success: false,
          message: `Not enough packages! Only ${medicine.quantity} available.`,
        });
      }

      packagesToReduce = quantitySold;
      const unitsPerPackage = extractUnitsFromPackSize(medicine.packSize);
      unitsSold = quantitySold * unitsPerPackage;
      totalAmount = medicine.salePrice * quantitySold;
    }

    // Decrement stock (always reduce WHOLE packages)
    medicine.quantity -= packagesToReduce;

    // Auto mark as expired/inactive if needed
    if (medicine.quantity <= 0) medicine.isActive = false;
    if (new Date(medicine.expiry) < new Date()) medicine.isExpired = true;

    // Save updated medicine
    await medicine.save();

    // Create a sale record with detailed information
    const sale = await Sale.create({
      medicine: medicine._id,
      medicineName: medicine.name,
      quantitySold: unitsSold,
      packagesSold: packagesToReduce,
      sellType: sellType,
      unitPrice: unitPrice,
      totalAmount: totalAmount,
      soldBy: "operator",
      note:
        sellType === "units"
          ? `Sold as individual units (${unitsSold} units from ${packagesToReduce} packages)`
          : "",
      packSize: medicine.packSize,
      soldAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message:
        sellType === "packages"
          ? `${quantitySold} package(s) sold successfully`
          : `${unitsSold} unit(s) sold successfully (used ${packagesToReduce} packages)`,
      data: { medicine, sale },
    });
  } catch (error) {
    console.error("Error selling medicine:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to extract units from packSize
const extractUnitsFromPackSize = (packSize) => {
  if (!packSize) return 1;

  // Match patterns like: "10 tablets", "100ml", "5 vials", etc.
  const match = packSize.match(
    /(\d+)\s*(tablets?|capsules?|ml|vials?|bottles?|sachets?|tubes?|pieces?|units?)/i
  );

  if (match && match[1]) {
    return parseInt(match[1]);
  }

  // Default to 1 if no pattern matched
  return 1;
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
