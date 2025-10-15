import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reportTitle: {
      type: String,
      required: true,
      trim: true,
    },
    totalMedicines: {
      type: Number,
      default: 0,
    },
    soldMedicines: {
      type: Number,
      default: 0,
    },
    totalDonations: {
      type: Number,
      default: 0,
    },
    expiredMedicines: {
      type: Number,
      default: 0,
    },
    generatedBy: {
      type: String,
      default: "Admin",
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const Report = mongoose.model("Report", reportSchema);
export default Report;
