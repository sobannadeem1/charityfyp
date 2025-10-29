import Medicine from "../models/Medicine.js";

// ✅ Add new medicine
export const addMedicine = async (req, res) => {
  try {
    const {
      name,
      genericName,
      category,
      packSize,
      dosageForm,
      strength,
      batchNumber,
      expiry,
      quantity,
      purchasePrice,
      salePrice,
      discount,
      manufacturer,
      supplier,
      storageCondition,
      reorderLevel,
    } = req.body;

    // Required validations
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
        message: "Please fill all required fields",
      });
    }

    const medicine = await Medicine.create({
      name,
      genericName,
      category,
      packSize,
      dosageForm,
      strength,
      batchNumber,
      expiry,
      quantity,
      purchasePrice,
      salePrice,
      discount,
      manufacturer,
      supplier,
      storageCondition,
      reorderLevel,
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
    });
  }
};

// ✅ Sell medicine (reduce stock)
export const sellMedicine = async (req, res) => {
  try {
    const { quantitySold } = req.body;
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

    medicine.quantity -= quantitySold;

    // Auto mark as expired/inactive if needed
    if (medicine.quantity <= 0) medicine.isActive = false;
    if (new Date(medicine.expiry) < new Date()) medicine.isExpired = true;

    await medicine.save();

    res.status(200).json({
      success: true,
      message: `${quantitySold} unit(s) sold successfully`,
      data: medicine,
    });
  } catch (error) {
    console.error("Error selling medicine:", error);
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
    res
      .status(500)
      .json({
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
    res
      .status(500)
      .json({
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
    res
      .status(500)
      .json({
        success: false,
        message: "Server error while deleting medicine",
      });
  }
};
