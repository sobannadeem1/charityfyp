// controllers/donationController.js
import Donation from "../models/Donation.js";
import Medicine from "../models/Medicine.js"; // We'll use this to add to stock
import asyncHandler from "express-async-handler";

// @desc    Create new donation (manual entry)
// @route   POST /api/donations
// @access  Private (Admin only)
const createDonation = asyncHandler(async (req, res) => {
  const {
    donorName,
    donorEmail,
    donorPhone,
    donationType,
    donatedItem,
    quantity,
    unit,
    expiryDate,
    estimatedValue,
    notes,
  } = req.body;

  // Basic validation (Mongoose already does most, but we add safety)
  if (!donorName || !donationType || quantity == null) {
    res.status(400);
    throw new Error("Please fill all required fields");
  }

  const donation = await Donation.create({
    donorName,
    donorEmail: donorEmail || undefined,
    donorPhone: donorPhone || undefined,
    donationType,
    donatedItem: donationType !== "cash" ? donatedItem : undefined,
    quantity,
    unit: unit || (donationType === "cash" ? "dollars" : "packages"),
    expiryDate: donationType === "medicine" ? expiryDate : undefined,
    estimatedValue: estimatedValue || 0,
    notes: notes || undefined,
    status: "pending",
    receivedBy: undefined,
    medicine: null,
  });

  res.status(201).json({
    success: true,
    message: "Donation recorded successfully",
    data: donation,
  });
});

// @desc    Get all donations (with filters)
// @route   GET /api/donations
// @access  Private (Admin)
const getAllDonations = asyncHandler(async (req, res) => {
  const { status, type, page = 1, limit = 10, search } = req.query;

  // Build filter
  let filter = {};
  if (status) filter.status = status;
  if (type) filter.donationType = type;
  if (search) {
    filter.$or = [
      { donorName: { $regex: search, $options: "i" } },
      { donatedItem: { $regex: search, $options: "i" } },
      { donorEmail: { $regex: search, $options: "i" } },
    ];
  }

  const total = await Donation.countDocuments(filter);
  const donations = await Donation.find(filter)
    .populate("receivedBy", "name email")
    .populate("medicine", "name unitsAvailable")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  res.json({
    success: true,
    count: donations.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    data: donations,
  });
});

// @desc    Get single donation by ID
// @route   GET /api/donations/:id
// @access  Private (Admin)
const getDonationById = asyncHandler(async (req, res) => {
  const donation = await Donation.findById(req.params.id)
    .populate("receivedBy", "name")
    .populate("medicine", "name unitsAvailable packSize");

  if (!donation) {
    res.status(404);
    throw new Error("Donation not found");
  }

  res.json({
    success: true,
    data: donation,
  });
});

// @desc    Update donation status (pending → received/rejected)
// @route   PUT /api/donations/:id/status
// @access  Private (Admin only)
const updateDonationStatus = asyncHandler(async (req, res) => {
  const { status, rejectedReason } = req.body;

  if (!["received", "rejected"].includes(status)) {
    res.status(400);
    throw new Error("Invalid status. Use 'received' or 'rejected'");
  }

  const donation = await Donation.findById(req.params.id);
  if (!donation) {
    res.status(404);
    throw new Error("Donation not found");
  }

  if (donation.status !== "pending") {
    res.status(400);
    throw new Error("Donation already processed");
  }

  // Update basic fields
  donation.status = status;
  donation.rejectedReason =
    status === "rejected"
      ? rejectedReason || "Not needed / Expired"
      : undefined;

  if (status === "received" && req.user) {
    donation.receivedBy = req.user._id;
    donation.receivedAt = new Date();
  }

  // COMPLETELY DISABLE AUTO-STOCK (SAFE & RECOMMENDED)
  // donation.medicine = ...
  // donation.addedToStock = true;
  // NO Medicine.create() or Medicine update → ZERO RISK

  await donation.save();

  res.json({
    success: true,
    message: `Donation marked as ${status}`,
    data: donation,
  });
});

// @desc    Delete donation (only if pending)
// @route   DELETE /api/donations/:id
// @access  Private (Admin)
const deleteDonation = asyncHandler(async (req, res) => {
  const donation = await Donation.findById(req.params.id);

  if (!donation) {
    res.status(404);
    throw new Error("Donation not found");
  }

  if (donation.status !== "pending") {
    res.status(400);
    throw new Error("Cannot delete processed donation");
  }

  await donation.remove();

  res.json({
    success: true,
    message: "Donation deleted successfully",
  });
});

export {
  createDonation,
  getAllDonations,
  getDonationById,
  updateDonationStatus,
  deleteDonation,
};
