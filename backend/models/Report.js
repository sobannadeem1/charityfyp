
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
      type: mongoose.Schema.Types.Mixed, 
      default: {},
    },
    summary: {
      type: mongoose.Schema.Types.Mixed, 
      default: {},
    },
    generatedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Admin",
  required: false,          
},
    filePath: String,       
    
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const Report = mongoose.model("Report", reportSchema);
export default Report;