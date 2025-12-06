import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medicine",
      required: true,
    },
    medicineName: { type: String, required: true }, // denormalized for quick view
    quantitySold: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 }, // salePrice at time of sale
    totalAmount: { type: Number, required: true, min: 0 },
    soldBy: { type: String, default: "system" }, // optional: user who sold
    note: { type: String, default: "" },
    soldAt: { type: Date, default: Date.now },
    originalQuantity: { type: Number, required: true }, // What user entered
    originalSellType: { type: String, required: true }, // "packages" or "units"
    unitsPerPackage: { type: Number, required: true }, // For frontend calculations
    // In your Sale model - add this field
transactionId: {
  type: String,
  sparse: true, // allows null/undefined for old single sales
  index: true   // for fast grouping in /sold page
},
  },
  { timestamps: true }
);

const Sale = mongoose.model("Sale", saleSchema);
export default Sale;
