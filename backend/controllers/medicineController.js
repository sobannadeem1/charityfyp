import Medicine from "../models/Medicine.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";

// ✅ Add new medicine (admin only)
export const addMedicine = async (req, res) => {
  try {
    const { name, category, price, quantity, expiry } = req.body;

    if (!name || !category || !price || !quantity) {
      return res
        .status(400)
        .json({ message: "All required fields must be filled" });
    }

    let photoUrl = "";
    let cloudinaryId = "";

    // if file uploaded → upload to Cloudinary
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "medicines",
      });
      photoUrl = uploadResult.secure_url;
      cloudinaryId = uploadResult.public_id;

      // delete temp file
      fs.unlinkSync(req.file.path);
    }

    const medicine = await Medicine.create({
      name,
      category,
      price,
      quantity,
      expiry,
      photo: photoUrl,
      cloudinary_id: cloudinaryId,
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
// PATCH /api/medicines/:id/sell
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
    await medicine.save();

    res.status(200).json({ success: true, data: medicine });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    const { name, category, price, quantity, expiry } = req.body;

    // find the medicine
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    // if a new image file is uploaded
    if (req.file) {
      // delete old image from Cloudinary if exists
      if (medicine.cloudinary_id) {
        await cloudinary.uploader.destroy(medicine.cloudinary_id);
      }

      // upload new image
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "medicines",
      });

      medicine.photo = uploadResult.secure_url;
      medicine.cloudinary_id = uploadResult.public_id;

      // delete temp file from local uploads folder
      fs.unlinkSync(req.file.path);
    }

    // update other fields if provided
    if (name) medicine.name = name;
    if (category) medicine.category = category;
    if (price) medicine.price = price;
    if (quantity) medicine.quantity = quantity;
    if (expiry) medicine.expiry = expiry;

    const updatedMedicine = await medicine.save();

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
