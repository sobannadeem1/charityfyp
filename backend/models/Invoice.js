// models/Invoice.js
import mongoose from "mongoose";

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

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
      default: "Walk-in Patient",
    },
    patientGender: {
      type: String,
      enum: ["Male", "Female", "Other", ""],
      default: "",
      trim: true,
    },
    patientAddress: {
      type: String,
      default: "",
      trim: true,
    },
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


invoiceSchema.pre("validate", async function (next) {
  if (this.isNew && !this.invoiceNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      invoiceNumber: { $regex: `^INV-${year}-` },
    });
    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});


export default mongoose.model("Invoice", invoiceSchema);