import Medicine from "../models/Medicine.js";

// ✅ Add new medicine (admin only)
export const addMedicine = async (req, res) => {
  try {
    const { name, category, price, quantity, description, expiryDate } =
      req.body;

    if (!name || !category || !price || !quantity) {
      return res
        .status(400)
        .json({ message: "All required fields must be filled" });
    }

    const medicine = await Medicine.create({
      name,
      category,
      price,
      quantity,
      description,
      expiryDate,
    });

    res.status(201).json({
      success: true,
      message: "Medicine added successfully",
      data: medicine,
    });
  } catch (error) {
    console.error("Error adding medicine:", error);
    res.status(500).json({ message: "Server error while adding medicine" });
  }
};

// ✅ Get all medicines (visible only after login)
export const getAllMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: medicines });
  } catch (error) {
    console.error("Error fetching medicines:", error);
    res.status(500).json({ message: "Server error while fetching medicines" });
  }
};

// ✅ Get single medicine
export const getMedicineById = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ message: "Medicine not found" });
    }
    res.status(200).json({ success: true, data: medicine });
  } catch (error) {
    console.error("Error fetching medicine:", error);
    res.status(500).json({ message: "Server error while fetching medicine" });
  }
};

// ✅ Update medicine
export const updateMedicine = async (req, res) => {
  try {
    const { name, category, price, quantity, description, expiryDate } =
      req.body;

    const updatedMedicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      { name, category, price, quantity, description, expiryDate },
      { new: true, runValidators: true }
    );

    if (!updatedMedicine) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    res.status(200).json({
      success: true,
      message: "Medicine updated successfully",
      data: updatedMedicine,
    });
  } catch (error) {
    console.error("Error updating medicine:", error);
    res.status(500).json({ message: "Server error while updating medicine" });
  }
};

// ✅ Delete medicine
export const deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);
    if (!medicine) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    res.status(200).json({
      success: true,
      message: "Medicine deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting medicine:", error);
    res.status(500).json({ message: "Server error while deleting medicine" });
  }
};
