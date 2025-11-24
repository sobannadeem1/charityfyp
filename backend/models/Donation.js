import mongoose from "mongoose";

const donationSchema = new mongoose.Schema(
  {
    // === Donor Information ===
    donorName: {
      type: String,
      required: [true, "Donor name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
    },
    donorEmail: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true, // allows multiple nulls but unique when present
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    donorPhone: {
      type: String,
      trim: true,
      match: [/^\+?\d{10,15}$/, "Please enter a valid phone number"], // e.g. +923001234567
    },

    // === Donation Details ===
    donationType: {
      type: String,
      enum: ["medicine", "cash", "other"],
      default: "medicine",
      required: true,
    },

    donatedItem: {
      type: String,
      trim: true,
      required: function () {
        return this.donationType !== "cash";
      },
      maxlength: [100, "Item name too long"],
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
      default: 1,
    },

    unit: {
      type: String,
      enum: ["packages", "units", "tablets", "bottles", "dollars", "other"],
      default: function () {
        return this.donationType === "cash" ? "dollars" : "packages";
      },
    },

    expiryDate: {
      type: Date,
      required: function () {
        return this.donationType === "medicine";
      },
      validate: {
        validator: function (value) {
          return this.donationType !== "medicine" || value > new Date();
        },
        message: "Expiry date cannot be in the past",
      },
    },

    estimatedValue: {
      type: Number,
      min: [0, "Value cannot be negative"],
      default: 0,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes too long (max 500 chars)"],
    },

    // === Workflow & Audit ===
    status: {
      type: String,
      enum: ["pending", "received", "rejected"],
      default: "pending",
    },

    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    receivedAt: {
      type: Date,
      default: null,
    },

    rejectedReason: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    // === Integration with Inventory ===
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medicine",
      default: null,
      // This will be set when donation is received and added to stock
    },

    // Optional: Track if donation was converted to stock
    addedToStock: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // gives createdAt & updatedAt automatically
  }
);

// === Indexes for Performance ===
donationSchema.index({ donationType: 1, createdAt: -1 });
donationSchema.index({ status: 1 });
donationSchema.index({ expiryDate: 1 });
donationSchema.index({ donorEmail: 1 }, { sparse: true });
donationSchema.index({ medicine: 1 });

// === Pre-save Hook: Auto-set receivedAt ===
donationSchema.pre("save", function (next) {
  if (
    this.status === "received" &&
    this.isModified("status") &&
    !this.receivedAt
  ) {
    this.receivedAt = new Date();
  }
  next();
});

const Donation = mongoose.model("Donation", donationSchema);

export default Donation;
