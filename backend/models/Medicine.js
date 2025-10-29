import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
  {
    // 🔹 Basic Info
    name: {
      type: String,
      required: true,
      trim: true,
    },
    genericName: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "Tablet",
        "Capsule",
        "Syrup",
        "Injection",
        "Cream",
        "Ointment",
        "Drops",
        "Inhaler",
        "Powder",
        "Suppository",
        "Spray",
        "Gel",
        "Solution",
        "Other",
      ],
      required: true,
    },

    // 🔹 Packaging & Strength
    packSize: {
      type: String,
      trim: true,
      default: "", // e.g. "10 tablets per strip" or "100 ml bottle"
    },
    dosageForm: {
      type: String,
      trim: true, // e.g. "Oral", "Topical", "Injection"
    },
    strength: {
      type: String,
      trim: true, // e.g. "500mg", "5mg/5ml"
    },

    // 🔹 Stock & Pricing
    batchNumber: {
      type: String,
      trim: true,
    },
    expiry: {
      type: Date,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    salePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0, // percentage discount
    },

    // 🔹 Supplier & Manufacturer
    manufacturer: {
      type: String,
      trim: true,
    },
    supplier: {
      type: String,
      trim: true,
    },

    // 🔹 Storage & Conditions
    storageCondition: {
      type: String,
      enum: ["Room Temperature", "Refrigerated", "Cool & Dry Place", "Other"],
      default: "Room Temperature",
    },

    // 🔹 Reorder Alerts
    reorderLevel: {
      type: Number,
      default: 10, // alert when quantity <= reorderLevel
    },

    // 🔹 Status
    isExpired: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Medicine = mongoose.model("Medicine", medicineSchema);
export default Medicine;
