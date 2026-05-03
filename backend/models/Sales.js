import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medicine",
      required: true,
    },
    medicineName: { type: String, required: true },
    quantitySold: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 }, 
    totalAmount: { type: Number, required: true, min: 0 },
    soldBy: { type: String, default: "system" }, 
    note: { type: String, default: "" },
    soldAt: { type: Date, default: Date.now },
    originalQuantity: { type: Number, required: true }, 
    originalSellType: { type: String, required: true }, 
    unitsPerPackage: { type: Number, required: true }, 
    
transactionId: {
  type: String,
  sparse: true,
  index: true  
},
  },
  { timestamps: true }
);

const Sale = mongoose.model("Sale", saleSchema);
export default Sale;
