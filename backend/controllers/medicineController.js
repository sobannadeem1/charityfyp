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

// ✅ Sell medicine (reduce stock)

export const sellMedicine = async (req, res) => {
  try {
    const { quantitySold, soldBy, note } = req.body;
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

    if (quantitySold > medicine.quantity) {
      return res
        .status(400)
        .json({ success: false, message: "Not enough stock available" });
    }

    // Decrement stock
    medicine.quantity -= quantitySold;

    // Auto mark as expired/inactive if needed
    if (medicine.quantity <= 0) medicine.isActive = false;
    if (new Date(medicine.expiry) < new Date()) medicine.isExpired = true;

    // Save updated medicine first (atomic-ish for our simple flow)
    await medicine.save();

    // Create a sale record
    const unitPrice = medicine.salePrice || 0;
    const totalAmount = unitPrice * quantitySold;

    const sale = await Sale.create({
      medicine: medicine._id,
      medicineName: medicine.name,
      quantitySold,
      unitPrice,
      totalAmount,
      soldBy: soldBy || "operator",
      note: note || "",
      soldAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: `${quantitySold} unit(s) sold successfully`,
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
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine)
      return res
        .status(404)
        .json({ success: false, message: "Medicine not found" });

    // Update provided fields only
    Object.keys(updates).forEach((key) => {
      medicine[key] = updates[key];
    });

    // Expiry auto check
    if (new Date(medicine.expiry) < new Date()) medicine.isExpired = true;

    const updatedMedicine = await medicine.save();

    res.status(200).json({
      success: true,
      message: "Medicine updated successfully",
      data: updatedMedicine,
    });
  } catch (error) {
    console.error("Error updating medicine:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating medicine",
    });
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
