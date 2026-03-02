// models/Report.js
import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "all_medicines",
        "specific_medicine",
        "expiry",
        "low_stock",
        "stock_summary",
        "movement"
      ],
      required: true,
    },
    filters: {
      type: mongoose.Schema.Types.Mixed,  // flexible – date range, medicine name, etc.
      default: {},
    },
    summary: {
      type: mongoose.Schema.Types.Mixed,  // calculated numbers jaise totalValue, counts etc.
      default: {},
    },
    generatedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Admin",
  required: false,          
},
    // Optional extra fields
    filePath: String,         // agar PDF/Excel server pe save kar rahe ho
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const Report = mongoose.model("Report", reportSchema);
export default Report;