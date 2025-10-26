// controllers/invoiceController.js
import Invoice from "../models/Invoice.js";
import Medicine from "../models/Medicine.js";

/**
 * Helper: adjust stock by an array of { medicineId, delta }
 * delta can be negative (reduce) or positive (increase)
 */
async function adjustStock(adjustments) {
  // adjustments: [{ medicineId, delta }]
  const ops = adjustments.map(async (a) => {
    const med = await Medicine.findById(a.medicineId);
    if (!med) throw new Error(`Medicine not found: ${a.medicineId}`);
    med.quantity = Math.max(0, med.quantity + a.delta);
    await med.save();
  });
  await Promise.all(ops);
}

// Create invoice
export const createInvoice = async (req, res) => {
  try {
    const { customerName, items, discount = 0, tax = 0, notes = "" } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Invoice items required" });
    }

    // Build detailed items and compute totals
    const detailedItems = [];
    let subTotal = 0;
    const stockAdjustments = []; // for reduce: delta = -quantity

    for (const it of items) {
      // expected item format from frontend:
      // { id: "<medicineId>", quantity: 2, priceOverride: 150 } priceOverride is optional
      const med = await Medicine.findById(it.id);
      if (!med)
        return res
          .status(404)
          .json({ message: `Medicine not found: ${it.id}` });

      const qty = Number(it.quantity) || 0;
      if (qty <= 0)
        return res.status(400).json({ message: "Quantity must be > 0" });

      // choose price: override or stored
      const priceUsed =
        typeof it.priceOverride !== "undefined" && it.priceOverride !== null
          ? Number(it.priceOverride)
          : Number(med.price || 0);

      const total = priceUsed * qty;
      subTotal += total;

      detailedItems.push({
        medicine: med._id,
        name: med.name,
        quantity: qty,
        price: priceUsed,
        total,
      });

      stockAdjustments.push({ medicineId: med._id, delta: -qty }); // reduce stock
    }

    const totalAmount = subTotal - Number(discount || 0) + Number(tax || 0);

    const invoice = await Invoice.create({
      customerName,
      items: detailedItems,
      subTotal,
      discount,
      tax,
      totalAmount,
      notes,
      createdBy: req.admin?._id || null,
    });

    // adjust stock now (we tried to create invoice first so it fails early before changing stock)
    await adjustStock(stockAdjustments);

    res.status(201).json({ success: true, invoice });
  } catch (err) {
    console.error("createInvoice error:", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

// Get all invoices
export const getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json({ success: true, invoices });
  } catch (err) {
    console.error("getAllInvoices error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get single invoice by id
export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate(
      "createdBy",
      "name email"
    );
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json({ success: true, invoice });
  } catch (err) {
    console.error("getInvoiceById error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update invoice: handle stock difference (revert old -> apply new)
export const updateInvoice = async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const { customerName, items, discount = 0, tax = 0, notes = "" } = req.body;

    const existing = await Invoice.findById(invoiceId);
    if (!existing)
      return res.status(404).json({ message: "Invoice not found" });

    // Build map for old items: medId -> qty
    const oldMap = new Map();
    existing.items.forEach((it) =>
      oldMap.set(it.medicine.toString(), it.quantity)
    );

    // Build new detailed items
    const detailedItems = [];
    let subTotal = 0;
    const adjustments = []; // we will compute deltas to apply to stock

    for (const it of items) {
      const med = await Medicine.findById(it.id);
      if (!med)
        return res
          .status(404)
          .json({ message: `Medicine not found: ${it.id}` });

      const qty = Number(it.quantity) || 0;
      if (qty <= 0)
        return res.status(400).json({ message: "Quantity must be > 0" });

      const priceUsed =
        typeof it.priceOverride !== "undefined" && it.priceOverride !== null
          ? Number(it.priceOverride)
          : Number(med.price || 0);

      const total = priceUsed * qty;
      subTotal += total;

      detailedItems.push({
        medicine: med._id,
        name: med.name,
        quantity: qty,
        price: priceUsed,
        total,
      });

      const oldQty = oldMap.get(med._id.toString()) || 0;
      // delta = newQty - oldQty; positive => increase stock, negative => reduce more stock
      const deltaToStock = oldQty - qty; // because stock was reduced by oldQty before; to move to newQty, add (old - new)
      // example: oldQty 5, newQty 3 => delta = 2 -> add 2 back to stock
      // old 2, new 4 => delta = -2 -> reduce 2 more from stock
      adjustments.push({ medicineId: med._id, delta: deltaToStock });
      oldMap.delete(med._id.toString());
    }

    // For any leftover old items not in new items -> restore their stock (oldQty -> add back)
    for (const [medId, oldQty] of oldMap.entries()) {
      adjustments.push({ medicineId: medId, delta: Number(oldQty) }); // restore oldQty
    }

    const totalAmount = subTotal - Number(discount || 0) + Number(tax || 0);

    // Update invoice fields
    existing.customerName = customerName;
    existing.items = detailedItems;
    existing.subTotal = subTotal;
    existing.discount = discount;
    existing.tax = tax;
    existing.totalAmount = totalAmount;
    existing.notes = notes;

    await existing.save();

    // Apply stock adjustments
    // adjustments contains numbers to ADD to stock (positive) or SUBTRACT (negative)
    await adjustStock(adjustments);

    res.json({ success: true, invoice: existing });
  } catch (err) {
    console.error("updateInvoice error:", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

// Delete invoice: restore stock and remove invoice
export const deleteInvoice = async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    // restore stock for each item
    const restoreOps = invoice.items.map((it) => ({
      medicineId: it.medicine,
      delta: it.quantity, // add back
    }));
    await adjustStock(restoreOps);

    await invoice.remove();
    res.json({ success: true, message: "Invoice deleted and stock restored" });
  } catch (err) {
    console.error("deleteInvoice error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
