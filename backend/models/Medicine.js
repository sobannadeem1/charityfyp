import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
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
    packSize: { type: String, trim: true, default: "" },
    dosageForm: { type: String, trim: true },
    strength: { type: String, trim: true },
    expiry: { type: Date, required: true },
    quantity: { type: Number, required: true, min: 0 }, // Physical packages count
    unitsAvailable: { type: Number, required: true, min: 0 }, // Actual sellable units
    unitsPerPackage: { type: Number, required: true, min: 1, default: 1 }, // Store units per package
    purchasePrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, required: true, min: 0 },
    manufacturer: { type: String, trim: true },
    supplier: { type: String, trim: true },
    storageCondition: {
      type: String,
      enum: ["Room Temperature", "Refrigerated", "Cool & Dry Place", "Other"],
      default: "Room Temperature",
    },
    history: [
      {
        updatedAt: { type: Date, default: Date.now },
        changes: { type: mongoose.Schema.Types.Mixed },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for display purposes
medicineSchema.virtual("totalPackagesDisplay").get(function () {
  return Math.ceil(this.unitsAvailable / this.unitsPerPackage);
});

const Medicine = mongoose.model("Medicine", medicineSchema);
export default Medicine;
