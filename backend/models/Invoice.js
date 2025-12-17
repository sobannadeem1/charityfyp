// models/Invoice.js
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid"; // Import UUID

// Invoice Item Schema
const invoiceItemSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Medicine",
    required: true,
  },
  name: { type: String, required: true },
  category: { type: String },
  manufacturer: { type: String },
  strength: { type: String },
  packSize: { type: String, required: true },
  sellType: { type: String, enum: ["packages", "units"], default: "packages" },
  originalSellType: { type: String, enum: ["packages", "units"], default: "packages" },
  quantitySold: { type: Number, required: true, min: 1 },
  salePrice: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
});

// Main Invoice Schema
const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
    },

    // Patient Details
    patientName: { type: String, required: true, trim: true, default: "Walk-in Patient" },
    patientGender: {
      type: String,
      enum: ["Male", "Female", "Other", "Not Specified", ""],
      default: "",
      trim: true,
    },
    patientAddress: { type: String, default: "", trim: true },
    cnic: { type: String, default: "" },
    phoneNumber: { type: String, default: "" },
    age: { type: Number, min: 0, default: null },

    // Invoice Details
    items: [invoiceItemSchema],
    totalRevenue: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: "" },
    transactionId: { type: String },
    soldAt: { type: Date, default: Date.now },
    soldBy: { type: String, default: "Staff" },
  },
  { timestamps: true }
);

// Auto-generate UUID invoice number
invoiceSchema.pre("validate", function (next) {
  if (this.isNew && !this.invoiceNumber) {
    this.invoiceNumber = `INV-${uuidv4()}`; // e.g., INV-3fa85f64-5717-4562-b3fc-2c963f66afa6
  }
  next();
});

export default mongoose.model("Invoice", invoiceSchema);
