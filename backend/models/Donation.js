import mongoose from "mongoose";

const donationSchema = new mongoose.Schema(
  {
    donorName: {
      type: String,
      required: true,
      trim: true,
    },
    donorEmail: {
      type: String,
      trim: true,
    },
    donorPhone: {
      type: String,
      trim: true,
    },
    donationType: {
      type: String,
      enum: ["medicine", "cash", "other"], // dropdown on frontend
      default: "medicine",
    },
    donatedItem: {
      type: String,
      required: true,
      trim: true, // e.g. "Paracetamol"
    },
    quantity: {
      type: Number,
      default: 1,
    },
    expiryDate: {
      type: Date, // only if donationType === 'medicine'
    },
    priceEstimate: {
      type: Number, // optional field for value of donation
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const Donation = mongoose.model("Donation", donationSchema);
export default Donation;
