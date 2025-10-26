// models/Invoice.js
import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Medicine",
    required: true,
  },
  name: { type: String, required: true }, // snapshot of medicine name
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 }, // price used for this invoice (possibly overridden)
  total: { type: Number, required: true, min: 0 }, // price * quantity
});

const invoiceSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    items: [invoiceItemSchema],
    subTotal: { type: Number, required: true }, // sum of items.total
    discount: { type: Number, default: 0 }, // optional
    tax: { type: Number, default: 0 }, // optional
    totalAmount: { type: Number, required: true }, // subTotal - discount + tax
    notes: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }, // admin who created invoice
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Invoice", invoiceSchema);
