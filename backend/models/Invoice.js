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
  
  // ↓↓↓ ADD THIS ↓↓↓
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
      required: true, // e.g., "INV-2025-0001" - we'll generate this
    },
    patientName: { type: String, required: true, trim: true, default: "Walk-in Patient" },
    items: [invoiceItemSchema],
    totalRevenue: { type: Number, required: true, min: 0 }, // sum of items.totalAmount
    discount: { type: Number, default: 0, min: 0 }, // optional
    notes: { type: String, default: "" },
    type: mongoose.Schema.Types.Mixed,
    transactionId: { type: String }, // optional link to sale group key
    soldAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Invoice", invoiceSchema);